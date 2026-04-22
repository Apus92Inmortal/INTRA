import VerifyEmailClient from "./VerifyEmailClient"

type VerifyEmailPageProps = {
  searchParams?: Promise<{
    email?: string
  }>
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const resolvedSearchParams = await searchParams
  const email = resolvedSearchParams?.email ?? ""

  return <VerifyEmailClient email={email} />
}
