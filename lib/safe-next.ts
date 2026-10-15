// Parsing only: this reserved origin is never requested or used for navigation.
const internalOrigin = "https://intra.invalid"

export function isSafeInternalPath(value?: string | null): value is string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return false
  }

  // WHATWG URL parsing strips TAB/LF/CR: /<LF>/host would become //host.
  // Reject every ASCII control before parsing, rather than sanitizing it.
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code < 32 || code === 127) return false
  }

  try {
    return new URL(value, internalOrigin).origin === internalOrigin
  } catch {
    return false
  }
}

export function getSafeInternalPath(
  value?: string | null,
  fallback = "/app"
) {
  if (isSafeInternalPath(value)) return value
  return isSafeInternalPath(fallback) ? fallback : "/app"
}
