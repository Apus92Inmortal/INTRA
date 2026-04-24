export function isSafeInternalPath(value?: string | null): value is string {
  return Boolean(
    value &&
      value.startsWith("/") &&
      !value.startsWith("//") &&
      !value.includes("\\")
  )
}

export function getSafeInternalPath(
  value?: string | null,
  fallback = "/app"
) {
  return isSafeInternalPath(value) ? value : fallback
}
