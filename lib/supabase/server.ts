import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

type ServerSupabaseClient = ReturnType<typeof createServerClient>

type MissingEnvResult = {
  data: null
  error: {
    message: string
  }
}

const missingEnvMessage =
  "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY. Configúralas en .env.local para usar Supabase."

let hasWarnedMissingEnv = false

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

const customFetch: typeof fetch = async (input, init) => {
  const retries = 1
  const timeoutMs = 12000

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(input, { ...init, signal: controller.signal })
      clearTimeout(t)
      return res
    } catch (error: unknown) {
      clearTimeout(t)

      if (error instanceof Error && error.name === "AbortError") {
        throw error
      }

      const msg = error instanceof Error ? error.message : String(error)
      const isNet =
        msg.includes("fetch failed") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("EAI_AGAIN") ||
        msg.includes("ENOTFOUND")

      if (!isNet || attempt >= retries) throw error
      await sleep(600 * (attempt + 1))
    }
  }

  return fetch(input, init)
}

function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function createMissingEnvQueryBuilder() {
  const result: Promise<MissingEnvResult> = Promise.resolve({
    data: null,
    error: { message: missingEnvMessage },
  })

  const proxy: Record<string, unknown> = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") return result.then.bind(result)
        if (prop === "catch") return result.catch.bind(result)
        if (prop === "finally") return result.finally.bind(result)
        return () => proxy
      },
    }
  )

  return proxy
}

function createMissingEnvClient(): ServerSupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: () => createMissingEnvQueryBuilder(),
    rpc: async () => ({ data: null, error: { message: missingEnvMessage } }),
  } as unknown as ServerSupabaseClient
}

export async function createClient() {
  const cookieStore = await cookies()

  if (!hasSupabaseEnv()) {
    if (!hasWarnedMissingEnv) {
      console.warn(missingEnvMessage)
      hasWarnedMissingEnv = true
    }

    return createMissingEnvClient()
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
      global: { fetch: customFetch },
    }
  )
}

export { hasSupabaseEnv, missingEnvMessage }
