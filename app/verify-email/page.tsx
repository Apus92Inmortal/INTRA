import VerifyEmailClient from "./VerifyEmailClient"
import { isSafeInternalPath } from "@/lib/safe-next"

type VerifyEmailPageProps = {
  searchParams?: Promise<{
    email?: string
    next?: string
  }>
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const resolvedSearchParams = await searchParams
  const email = resolvedSearchParams?.email ?? ""
  const next = isSafeInternalPath(resolvedSearchParams?.next)
    ? resolvedSearchParams.next
    : undefined

  return <VerifyEmailClient email={email} next={next} />
}
