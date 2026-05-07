import { requireAdminUser } from "@/lib/auth/admin"
import { createAdminClient } from "@/lib/supabase/admin"
import VerificationReviewClient from "./VerificationReviewClient"

type VerificationRow = {
  id: string
  user_id: string
  verification_status: string | null
  document_photo_url: string | null
  selfie_url: string | null
  rejection_reason: string | null
  reviewed_at: string | null
  created_at: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  phone: string | null
  document_number: string | null
}

export default async function AdminVerificationsPage() {
  let loadError: string | null = null
  let hasAccess = false
  let verifications: Array<{
    id: string
    userId: string
    fullName: string
    phone: string | null
    documentNumber: string | null
    verificationStatus: string | null
    documentPhotoUrl: string | null
    selfieUrl: string | null
    rejectionReason: string | null
    reviewedAt: string | null
    createdAt: string | null
  }> = []

  try {
    await requireAdminUser()
    hasAccess = true

    const admin = createAdminClient()
    const { data: verificationRows, error: verificationError } = await admin
      .from("user_verifications")
      .select(
        "id, user_id, verification_status, document_photo_url, selfie_url, rejection_reason, reviewed_at, created_at"
      )
      .order("created_at", { ascending: false })

    if (verificationError) {
      loadError = verificationError.message
    } else {
      const rows = (verificationRows ?? []) as VerificationRow[]
      const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)))

      const { data: profileRows, error: profileError } = userIds.length
        ? await admin
            .from("profiles")
            .select("id, full_name, phone, document_number")
            .in("id", userIds)
        : { data: [] as ProfileRow[], error: null }

      if (profileError) {
        loadError = profileError.message
      } else {
        const profiles = new Map(
          ((profileRows ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
        )

        const statusPriority: Record<string, number> = {
          pending: 0,
          rejected: 1,
          unverified: 2,
          verified: 3,
        }

        verifications = await Promise.all(
          rows.map(async (row) => {
            const profile = profiles.get(row.user_id)

            const [documentSignedUrl, selfieSignedUrl] = await Promise.all([
              row.document_photo_url
                ? admin.storage
                    .from("identity-verification")
                    .createSignedUrl(row.document_photo_url, 60 * 60)
                : Promise.resolve({ data: null, error: null }),
              row.selfie_url
                ? admin.storage
                    .from("identity-verification")
                    .createSignedUrl(row.selfie_url, 60 * 60)
                : Promise.resolve({ data: null, error: null }),
            ])

            return {
              id: row.id,
              userId: row.user_id,
              fullName: profile?.full_name || "Usuario sin nombre",
              phone: profile?.phone ?? null,
              documentNumber: profile?.document_number ?? null,
              verificationStatus: row.verification_status,
              documentPhotoUrl: documentSignedUrl.data?.signedUrl ?? null,
              selfieUrl: selfieSignedUrl.data?.signedUrl ?? null,
              rejectionReason: row.rejection_reason,
              reviewedAt: row.reviewed_at,
              createdAt: row.created_at,
            }
          })
        )

        verifications = verifications.sort((a, b) => {
          const statusDiff =
            (statusPriority[a.verificationStatus ?? ""] ?? 99) -
            (statusPriority[b.verificationStatus ?? ""] ?? 99)

          if (statusDiff !== 0) {
            return statusDiff
          }

          return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        })
      }
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No pudimos cargar las verificaciones."
  }

  if (loadError || !hasAccess) {
    return (
      <section className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-[#0B2C4A]">Verificaciones</h2>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          No pudimos cargar este módulo administrativo en este entorno.
        </p>
        {loadError ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        ) : null}
      </section>
    )
  }

  return <VerificationReviewClient verifications={verifications} />
}
