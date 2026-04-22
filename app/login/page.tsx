import LoginForm from "./LoginForm"

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams
  const initialError = resolvedSearchParams?.error ?? null

  return <LoginForm initialError={initialError} />
}
