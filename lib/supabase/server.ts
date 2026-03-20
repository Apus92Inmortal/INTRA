// lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const customFetch: typeof fetch = async (input, init) => {
  const retries = 1;
  const timeoutMs = 12000;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(t);
      return res;
    } catch (e: any) {
      clearTimeout(t);

      if (e?.name === "AbortError") throw e;

      const msg = String(e?.message ?? e);
      const isNet =
        msg.includes("fetch failed") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("EAI_AGAIN") ||
        msg.includes("ENOTFOUND");

      if (!isNet || attempt >= retries) throw e;
      await sleep(600 * (attempt + 1));
    }
  }

  return fetch(input, init);
};

export async function createClient() {
  const cookieStore = await cookies(); // 👈 ESTE await ES OBLIGATORIO EN TU VERSION

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
      global: { fetch: customFetch },
    }
  );
}
