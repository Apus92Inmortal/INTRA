"use client"

import DisputesReviewClient from "../disputes/DisputesReviewClient"

type DisputesReviewProps = Parameters<typeof DisputesReviewClient>[0]

export default function AlertsReviewClient({
  disputes,
  alerts,
}: Pick<DisputesReviewProps, "disputes" | "alerts">) {
  return (
    <DisputesReviewClient disputes={disputes} alerts={alerts} scope="alerts" />
  )
}
