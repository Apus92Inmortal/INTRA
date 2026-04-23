import VerifyEmailClient from "./VerifyEmailClient"

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
  const next = resolvedSearchParams?.next?.startsWith("/")
    ? resolvedSearchParams.next
    : undefined

  return <VerifyEmailClient email={email} next={next} />
}
