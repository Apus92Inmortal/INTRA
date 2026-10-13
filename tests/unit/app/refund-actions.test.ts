import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), requireAdminUser: vi.fn(), rpc: vi.fn(), createAdminClient: vi.fn(), revalidatePath: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }))
vi.mock('@/lib/auth/admin', () => ({ requireAdminUser: mocks.requireAdminUser }))

import { cancelActiveWaitingTravelerShipmentAction, cancelPendingPaymentShipmentAction } from '@/app/app/_actions/shipment-actions'
import { reviewDisputeAction } from '@/app/app/admin/actions'

describe('refund server authorization and transaction outcomes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.createAdminClient.mockReturnValue({ rpc: mocks.rpc })
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'verified-owner' } }, error: null })
    mocks.requireAdminUser.mockResolvedValue({ user: { id: 'verified-admin' } })
  })

  it('never obtains privileged client without a verified customer session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error('expired') })
    expect((await cancelActiveWaitingTravelerShipmentAction('shipment')).success).toBe(false)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })

  it('does not report success or refresh after functional transaction rejection', async () => {
    mocks.rpc.mockResolvedValue({ data: { success: false, error: 'refund_reconciliation_required' }, error: null })
    expect((await cancelActiveWaitingTravelerShipmentAction('shipment')).success).toBe(false)
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('uses the verified customer actor and accepts an already committed retry', async () => {
    mocks.rpc.mockResolvedValue({ data: { success: true, idempotent: true }, error: null })
    expect((await cancelActiveWaitingTravelerShipmentAction('shipment')).success).toBe(true)
    expect(mocks.rpc).toHaveBeenCalledWith('cancel_waiting_traveler_shipment', { p_shipment_id: 'shipment', p_actor_id: 'verified-owner' })
  })

  it('uses one transaction for unpaid cancellation and does not claim success after approval wins', async () => {
    mocks.rpc.mockResolvedValue({ data: { success: false, error: 'shipment_not_cancellable' }, error: null })
    expect((await cancelPendingPaymentShipmentAction('shipment')).success).toBe(false)
    expect(mocks.rpc).toHaveBeenCalledWith('cancel_pending_payment_shipment', { p_shipment_id: 'shipment', p_actor_id: 'verified-owner' })
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  function disputeForm() {
    const form = new FormData()
    form.set('paymentId', 'payment'); form.set('matchId', 'match'); form.set('action', 'customer_refund')
    form.set('refundAmount', '10000'); form.set('resolutionNotes', 'Revisión operativa')
    form.set('adminId', 'untrusted-form-actor')
    return form
  }

  it('admin authorization rejects before financial RPC', async () => {
    mocks.requireAdminUser.mockRejectedValue(new Error('No autorizado'))
    expect((await reviewDisputeAction(disputeForm())).success).toBe(false)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('uses allowlist-verified admin actor and requires explicit RPC success', async () => {
    mocks.rpc.mockResolvedValue({ data: { success: false, error: 'invalid_refund_amount' }, error: null })
    expect((await reviewDisputeAction(disputeForm())).success).toBe(false)
    expect(mocks.rpc).toHaveBeenCalledWith('admin_resolve_dispute_for_customer', expect.objectContaining({ p_admin_id: 'verified-admin' }))
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it.each(['reviewing', 'rejected'])('uses a transaction and verified actor for %s without a stale metadata read', async (action) => {
    const form = disputeForm(); form.set('action', action)
    mocks.rpc.mockResolvedValue({ data: { success: true, match_id: 'match' }, error: null })
    expect((await reviewDisputeAction(form)).success).toBe(true)
    expect(mocks.rpc).toHaveBeenCalledWith('admin_review_dispute', {
      p_payment_id: 'payment', p_match_id: 'match', p_action: action,
      p_notes: 'Revisión operativa', p_admin_id: 'verified-admin',
    })
    // The privileged stub has no .from(): a successful call proves the action
    // cannot perform the old read/overwrite sequence after the RPC commits.
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
  })

  it('does not claim reviewing succeeded after a concurrent resolution', async () => {
    const form = disputeForm(); form.set('action', 'reviewing')
    mocks.rpc.mockResolvedValue({ data: { success: false, error: 'dispute_not_open' }, error: null })
    expect((await reviewDisputeAction(form)).success).toBe(false)
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })
})
