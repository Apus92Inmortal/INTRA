import UpdatePasswordClient from "./UpdatePasswordClient"

type UpdatePasswordPageProps = {
  searchParams?: Promise<{
    error?: string
  }>
}

export default async function UpdatePasswordPage({
  searchParams,
}: UpdatePasswordPageProps) {
  const resolvedSearchParams = await searchParams

  return (
    <UpdatePasswordClient initialError={resolvedSearchParams?.error ?? null} />
  )
}
