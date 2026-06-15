import { requireAdminUser } from "@/lib/auth/admin"
import { createAdminClient } from "@/lib/supabase/admin"
import AdminDisputesRealtime from "./AdminDisputesRealtime"
import DisputesReviewClient from "./DisputesReviewClient"
import type {
  AdminCaseEvidenceType,
  AdminCaseFile,
} from "./AdminCaseEvidencePanel"

type JsonObject = Record<string, unknown>

const EVIDENCE_BUCKET = "shipment-evidence"
const EVIDENCE_SIGNED_URL_TTL_SECONDS = 10 * 60
const CASE_EVIDENCE_TYPES: AdminCaseEvidenceType[] = [
  "customer_initial_photo",
  "pickup_photo",
  "delivery_photo",
  "suspicious_photo",
]

type PaymentRow = {
  id: string
  match_id: string | null
  shipment_id: string | null
  status: string | null
  dispute_status: string | null
  dispute_reason: string | null
  dispute_opened_at: string | null
  dispute_resolved_at: string | null
  amount: number | null
  traveler_amount: number | null
  metadata: JsonObject | null
}

type MatchRow = {
  id: string
  shipment_id: string | null
  trip_id: string | null
  status: string | null
  disputed_at: string | null
  resolved_at: string | null
  resolution_notes: string | null
}

type CityRow = { name: string | null; iata_code?: string | null }
type CityRelation = CityRow | CityRow[] | null

type ShipmentRow = {
  id: string
  owner_id: string
  tracking_code: string | null
  status: string | null
  origin_city: CityRelation
  destination_city: CityRelation
}

type TripRow = {
  id: string
  traveler_id: string
}

type ReportRow = {
  id: string
  shipment_id: string
  match_id: string | null
  reported_by: string
  report_type: string
  reason: string
  status: string
  created_at: string | null
  resolved_at: string | null
  metadata: JsonObject | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  phone: string | null
}

type EvidenceRow = {
  id: string
  shipment_id: string
  evidence_type: string
  file_path: string | null
  note: string | null
  uploaded_by: string | null
  created_at: string | null
}

function asJsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {}
}

function getDisputeAdminState(payment: PaymentRow) {
  const metadata = asJsonObject(payment.metadata)

  if (payment.dispute_status === "resolved") {
    return "resolved"
  }

  if (metadata.admin_dispute_status === "reviewing") {
    return "reviewing"
  }

  return "open"
}

function asCity(value: CityRelation) {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function getCityName(value: CityRelation) {
  const city = asCity(value)
  return city?.name?.trim() || city?.iata_code?.trim() || null
}

function getRouteLabel(shipment: ShipmentRow | null | undefined) {
  if (!shipment) {
    return "Ruta sin datos"
  }

  return `${getCityName(shipment.origin_city) ?? "Origen"} → ${getCityName(shipment.destination_city) ?? "Destino"}`
}

function isCaseEvidenceType(value: string): value is AdminCaseEvidenceType {
  return (CASE_EVIDENCE_TYPES as string[]).includes(value)
}

function normalizeAlertState(
  value: string | null | undefined,
): "open" | "reviewing" | "resolved" | null {
  if (value === "open" || value === "reviewing" || value === "resolved") {
    return value
  }

  return null
}

export default async function AdminDisputesPage() {
  let loadError: string | null = null
  let hasAccess = false
  let disputes: Array<{
    id: string
    paymentId: string
    matchId: string | null
    shipmentId: string | null
    trackingCode: string | null
    reporterName: string
    reporterUserId: string | null
    affectedName: string
    affectedUserId: string | null
    reason: string
    state: "open" | "reviewing" | "resolved"
    createdAt: string | null
    resolvedAt: string | null
    paymentStatus: string | null
    resolutionAction: string | null
    resolutionNotes: string | null
    suggestedAmount: number
    travelerAmount: number
    caseFile: AdminCaseFile
  }> = []
  let alerts: Array<{
    id: string
    reportType: string
    shipmentId: string
    matchId: string | null
    trackingCode: string | null
    reporterName: string
    reporterUserId: string
    affectedName: string
    affectedUserId: string | null
    reason: string
    state: "open" | "reviewing" | "resolved"
    createdAt: string | null
    resolvedAt: string | null
    resolutionAction: string | null
    resolutionNotes: string | null
    caseFile: AdminCaseFile
  }> = []

  try {
    await requireAdminUser()
    hasAccess = true

    const admin = createAdminClient()
    const [
      { data: disputeRows, error: disputeError },
      { data: reportRows, error: reportError },
    ] = await Promise.all([
      admin
        .from("payments")
        .select(
          "id, match_id, shipment_id, status, dispute_status, dispute_reason, dispute_opened_at, dispute_resolved_at, amount, traveler_amount, metadata",
        )
        .in("dispute_status", ["open", "resolved"])
        .order("dispute_opened_at", { ascending: false, nullsFirst: false }),
      admin
        .from("shipment_report_events")
        .select(
          "id, shipment_id, match_id, reported_by, report_type, reason, status, created_at, resolved_at, metadata",
        )
        .order("created_at", { ascending: false }),
    ])

    if (disputeError || reportError) {
      loadError =
        disputeError?.message ??
        reportError?.message ??
        "Error de carga."
    } else {
      const disputePayments = (disputeRows ?? []) as PaymentRow[]
      const reportEvents = (reportRows ?? []) as ReportRow[]
      const matchIds = Array.from(
        new Set([
          ...disputePayments.map((payment) => payment.match_id).filter(Boolean),
          ...reportEvents.map((report) => report.match_id).filter(Boolean),
        ]),
      ) as string[]

      const initialShipmentIds = Array.from(
        new Set([
          ...disputePayments
            .map((payment) => payment.shipment_id)
            .filter(Boolean),
          ...reportEvents.map((report) => report.shipment_id).filter(Boolean),
        ]),
      ) as string[]

      const { data: matchRows, error: matchError } = matchIds.length
        ? await admin
            .from("matches")
            .select(
              "id, shipment_id, trip_id, status, disputed_at, resolved_at, resolution_notes",
            )
            .in("id", matchIds)
        : { data: [] as MatchRow[], error: null }

      if (matchError) {
        loadError = matchError.message
      } else {
        const matches = new Map(
          ((matchRows ?? []) as MatchRow[]).map((match) => [match.id, match]),
        )
        const tripIds = Array.from(
          new Set(
            ((matchRows ?? []) as MatchRow[])
              .map((match) => match.trip_id)
              .filter(Boolean),
          ),
        ) as string[]
        const shipmentIds = Array.from(
          new Set([
            ...initialShipmentIds,
            ...((matchRows ?? []) as MatchRow[])
              .map((match) => match.shipment_id)
              .filter(Boolean),
          ]),
        ) as string[]

        const [
          { data: shipmentRows, error: shipmentError },
          { data: tripRows, error: tripError },
        ] = await Promise.all([
          shipmentIds.length
            ? admin
                .from("shipments")
                .select(
                  "id, owner_id, tracking_code, status, origin_city:cities!shipments_origin_city_id_fkey(name, iata_code), destination_city:cities!shipments_destination_city_id_fkey(name, iata_code)",
                )
                .in("id", shipmentIds)
            : Promise.resolve({ data: [] as ShipmentRow[], error: null }),
          tripIds.length
            ? admin.from("trips").select("id, traveler_id").in("id", tripIds)
            : Promise.resolve({ data: [] as TripRow[], error: null }),
        ])

        if (shipmentError || tripError) {
          loadError =
            shipmentError?.message ??
            tripError?.message ??
            "Error de carga."
        } else {
          const shipments = new Map(
            ((shipmentRows ?? []) as ShipmentRow[]).map((shipment) => [
              shipment.id,
              shipment,
            ]),
          )
          const trips = new Map(
            ((tripRows ?? []) as TripRow[]).map((trip) => [trip.id, trip]),
          )
          const [
            { data: relatedPaymentRows, error: relatedPaymentsError },
            { data: evidenceRows, error: evidenceError },
          ] = await Promise.all([
            shipmentIds.length
              ? admin
                  .from("payments")
                  .select(
                    "id, match_id, shipment_id, status, dispute_status, dispute_reason, dispute_opened_at, dispute_resolved_at, amount, traveler_amount, metadata",
                  )
                  .in("shipment_id", shipmentIds)
                  .order("created_at", { ascending: false })
              : Promise.resolve({ data: [] as PaymentRow[], error: null }),
            shipmentIds.length
              ? admin
                  .from("shipment_evidence")
                  .select(
                    "id, shipment_id, evidence_type, file_path, note, uploaded_by, created_at",
                  )
                  .in("shipment_id", shipmentIds)
                  .in("evidence_type", CASE_EVIDENCE_TYPES)
                  .order("created_at", { ascending: false })
              : Promise.resolve({ data: [] as EvidenceRow[], error: null }),
          ])

          if (relatedPaymentsError || evidenceError) {
            loadError =
              relatedPaymentsError?.message ??
              evidenceError?.message ??
              "Error de carga."
            throw new Error(loadError ?? "Error de carga.")
          }

          const relatedPayments = (relatedPaymentRows ?? []) as PaymentRow[]
          const allPayments = [...disputePayments, ...relatedPayments]
          const latestPaymentByShipmentId = new Map<string, PaymentRow>()
          const latestPaymentByMatchId = new Map<string, PaymentRow>()

          for (const payment of allPayments) {
            if (
              payment.shipment_id &&
              !latestPaymentByShipmentId.has(payment.shipment_id)
            ) {
              latestPaymentByShipmentId.set(payment.shipment_id, payment)
            }

            if (
              payment.match_id &&
              !latestPaymentByMatchId.has(payment.match_id)
            ) {
              latestPaymentByMatchId.set(payment.match_id, payment)
            }
          }

          const latestReportByShipmentId = new Map<string, ReportRow>()
          const latestReportByMatchId = new Map<string, ReportRow>()
          const activeReportByShipmentId = new Map<string, ReportRow>()
          const activeReportByMatchId = new Map<string, ReportRow>()

          for (const report of reportEvents) {
            if (!latestReportByShipmentId.has(report.shipment_id)) {
              latestReportByShipmentId.set(report.shipment_id, report)
            }

            if (
              report.match_id &&
              !latestReportByMatchId.has(report.match_id)
            ) {
              latestReportByMatchId.set(report.match_id, report)
            }

            if (report.status === "open" || report.status === "reviewing") {
              if (!activeReportByShipmentId.has(report.shipment_id)) {
                activeReportByShipmentId.set(report.shipment_id, report)
              }

              if (
                report.match_id &&
                !activeReportByMatchId.has(report.match_id)
              ) {
                activeReportByMatchId.set(report.match_id, report)
              }
            }
          }

          const profileIds = Array.from(
            new Set(
              [
                ...((shipmentRows ?? []) as ShipmentRow[]).map(
                  (shipment) => shipment.owner_id,
                ),
                ...((tripRows ?? []) as TripRow[]).map(
                  (trip) => trip.traveler_id,
                ),
                ...reportEvents.map((report) => report.reported_by),
                ...((evidenceRows ?? []) as EvidenceRow[]).map(
                  (evidence) => evidence.uploaded_by,
                ),
              ].filter(Boolean),
            ),
          ) as string[]

          const { data: profileRows, error: profileError } = profileIds.length
            ? await admin
                .from("profiles")
                .select("id, full_name, phone")
                .in("id", profileIds)
            : { data: [] as ProfileRow[], error: null }

          if (profileError) {
            loadError = profileError.message
          } else {
            const profiles = new Map(
              ((profileRows ?? []) as ProfileRow[]).map((profile) => [
                profile.id,
                profile,
              ]),
            )
            const fullName = (
              userId: string | null | undefined,
              fallback: string,
            ) =>
              userId
                ? profiles.get(userId)?.full_name?.trim() || fallback
                : fallback
            const evidenceByShipmentId = new Map<
              string,
              AdminCaseFile["evidences"]
            >()

            await Promise.all(
              ((evidenceRows ?? []) as EvidenceRow[]).map(async (row) => {
                if (!isCaseEvidenceType(row.evidence_type)) {
                  return
                }

                const current = evidenceByShipmentId.get(row.shipment_id) ?? []
                if (
                  current.some(
                    (evidence) => evidence.evidenceType === row.evidence_type,
                  )
                ) {
                  return
                }

                let signedUrl: string | null = null

                if (row.file_path) {
                  const { data: signedUrlData, error: signedUrlError } =
                    await admin.storage
                      .from(EVIDENCE_BUCKET)
                      .createSignedUrl(
                        row.file_path,
                        EVIDENCE_SIGNED_URL_TTL_SECONDS,
                      )

                  if (!signedUrlError && signedUrlData?.signedUrl) {
                    signedUrl = signedUrlData.signedUrl
                  }
                }

                current.push({
                  evidenceType: row.evidence_type,
                  signedUrl,
                  note: row.note,
                  uploadedByName: fullName(row.uploaded_by, "Usuario INTRA"),
                  createdAt: row.created_at,
                })
                evidenceByShipmentId.set(row.shipment_id, current)
              }),
            )

            const buildCaseFile = ({
              match,
              shipment,
              trip,
              payment,
              report,
              disputeState,
            }: {
              match: MatchRow | null
              shipment: ShipmentRow | null
              trip: TripRow | null
              payment: PaymentRow | null
              report: ReportRow | null
              disputeState: "open" | "reviewing" | "resolved" | null
            }): AdminCaseFile => ({
              matchId:
                match?.id ?? payment?.match_id ?? report?.match_id ?? null,
              shipmentId:
                shipment?.id ??
                payment?.shipment_id ??
                report?.shipment_id ??
                null,
              routeLabel: getRouteLabel(shipment),
              customerName: fullName(shipment?.owner_id, "Cliente sin nombre"),
              travelerName: fullName(trip?.traveler_id, "Sin nombre"),
              matchStatus: match?.status ?? null,
              shipmentStatus: shipment?.status ?? null,
              paymentStatus: payment?.status ?? null,
              alertState: normalizeAlertState(report?.status),
              disputeState,
              evidences: shipment?.id
                ? (evidenceByShipmentId.get(shipment.id) ?? [])
                : [],
            })

            disputes = disputePayments.map((payment) => {
              const match = payment.match_id
                ? (matches.get(payment.match_id) ?? null)
                : null
              const shipment = payment.shipment_id
                ? (shipments.get(payment.shipment_id) ?? null)
                : match?.shipment_id
                  ? (shipments.get(match.shipment_id) ?? null)
                  : null
              const trip = match?.trip_id
                ? (trips.get(match.trip_id) ?? null)
                : null
              const metadata = asJsonObject(payment.metadata)
              const relatedReport =
                (payment.match_id
                  ? activeReportByMatchId.get(payment.match_id)
                  : null) ??
                (shipment?.id
                  ? activeReportByShipmentId.get(shipment.id)
                  : null) ??
                (payment.match_id
                  ? latestReportByMatchId.get(payment.match_id)
                  : null) ??
                (shipment?.id
                  ? latestReportByShipmentId.get(shipment.id)
                  : null) ??
                null
              const state = getDisputeAdminState(payment)

              return {
                id: payment.id,
                paymentId: payment.id,
                matchId: payment.match_id,
                shipmentId: shipment?.id ?? payment.shipment_id,
                trackingCode: shipment?.tracking_code ?? null,
                reporterName: fullName(
                  shipment?.owner_id,
                  "Cliente sin nombre",
                ),
                reporterUserId: shipment?.owner_id ?? null,
                affectedName: fullName(trip?.traveler_id, "Sin nombre"),
                affectedUserId: trip?.traveler_id ?? null,
                reason:
                  payment.dispute_reason || "Disputa abierta desde la app",
                state: getDisputeAdminState(payment),
                createdAt: payment.dispute_opened_at,
                resolvedAt:
                  payment.dispute_resolved_at ?? match?.resolved_at ?? null,
                paymentStatus: payment.status,
                resolutionAction:
                  typeof metadata.admin_dispute_resolution === "string"
                    ? metadata.admin_dispute_resolution
                    : null,
                resolutionNotes:
                  typeof metadata.admin_dispute_notes === "string"
                    ? metadata.admin_dispute_notes
                    : (match?.resolution_notes ?? null),
                suggestedAmount: Number(payment.amount ?? 0),
                travelerAmount: Number(
                  payment.traveler_amount ?? payment.amount ?? 0,
                ),
                caseFile: buildCaseFile({
                  match,
                  shipment,
                  trip,
                  payment,
                  report: relatedReport,
                  disputeState: state,
                }),
              }
            })

            alerts = reportEvents.map((report) => {
              const match = report.match_id
                ? (matches.get(report.match_id) ?? null)
                : null
              const shipment = shipments.get(report.shipment_id) ?? null
              const trip = match?.trip_id
                ? (trips.get(match.trip_id) ?? null)
                : null
              const metadata = asJsonObject(report.metadata)
              const affectedUserId =
                report.reported_by === trip?.traveler_id
                  ? (shipment?.owner_id ?? null)
                  : (trip?.traveler_id ?? null)
              const payment =
                (report.match_id
                  ? latestPaymentByMatchId.get(report.match_id)
                  : null) ??
                latestPaymentByShipmentId.get(report.shipment_id) ??
                null
              const state =
                report.status === "reviewing"
                  ? "reviewing"
                  : report.status === "resolved"
                    ? "resolved"
                    : "open"

              return {
                id: report.id,
                reportType: report.report_type,
                shipmentId: report.shipment_id,
                matchId: report.match_id,
                trackingCode: shipment?.tracking_code ?? null,
                reporterName: fullName(
                  report.reported_by,
                  "Sin nombre",
                ),
                reporterUserId: report.reported_by,
                affectedName: fullName(affectedUserId, "Usuario relacionado"),
                affectedUserId,
                reason: report.reason,
                state,
                createdAt: report.created_at,
                resolvedAt: report.resolved_at,
                resolutionAction:
                  typeof metadata.admin_resolution_action === "string"
                    ? metadata.admin_resolution_action
                    : null,
                resolutionNotes:
                  typeof metadata.admin_resolution_notes === "string"
                    ? metadata.admin_resolution_notes
                    : null,
                caseFile: buildCaseFile({
                  match,
                  shipment,
                  trip,
                  payment,
                  report,
                  disputeState: payment ? getDisputeAdminState(payment) : null,
                }),
              }
            })
          }
        }
      }
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Error de carga."
  }

  if (loadError || !hasAccess) {
    return (
      <section className="rounded-3xl border border-intra-danger-border bg-intra-card p-6 shadow-sm sm:p-8">
        <h2 className="intra-h2 text-intra-blue">Disputas</h2>
        {loadError ? (
          <div className="mt-4 rounded-2xl border border-intra-danger-border bg-intra-danger-soft px-4 py-3 intra-body text-intra-danger">
            {loadError}
          </div>
        ) : null}
      </section>
    )
  }

  return (
    <>
      <AdminDisputesRealtime />
      <DisputesReviewClient
        disputes={disputes}
        alerts={alerts}
        scope="disputes"
      />
    </>
  )
}
