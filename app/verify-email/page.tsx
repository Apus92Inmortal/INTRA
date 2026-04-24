import { redirect } from "next/navigation"
import VerifyEmailClient from "./VerifyEmailClient"
import { createClient } from "@/lib/supabase/server"
import { getSafeInternalPath, isSafeInternalPath } from "@/lib/safe-next"

type VerifyEmailPageProps = {
  searchParams?: Promise<{
    email?: string
    next?: string
    status?: string
    error?: string
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
  const status = resolvedSearchParams?.status === "verified" ? "verified" : null
  const initialError = resolvedSearchParams?.error ?? null

  if (status !== "verified") {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user?.email_confirmed_at) {
      redirect(getSafeInternalPath(next))
    }
  }

  return (
    <VerifyEmailClient
      email={email}
      next={next}
      status={status}
      initialError={initialError}
    />
  )
}
