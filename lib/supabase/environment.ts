// Public project ref, never a credential. Non-production deployments must use
// their own database before any browser, SSR, proxy or service-role connection.
const productionProjectRef = "okajyhkdyapbsornjeeb"

export function isProductionDatabaseBlocked(url: string | undefined, environment: string | undefined) {
  if (environment !== "preview" && environment !== "development") return false
  if (!url) return false
  try {
    return new URL(url).hostname === `${productionProjectRef}.supabase.co`
  } catch {
    return true
  }
}

export function hasSafeSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    !isProductionDatabaseBlocked(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_INTRA_DEPLOYMENT_ENV)
}
