import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

function getAuthorizationError(request: NextRequest) {
  const expected = process.env.INTERNAL_CRON_SECRET

  if (!expected) {
    return "missing_internal_cron_secret"
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const header = request.headers.get("x-internal-cron-secret")

  return bearer === expected || header === expected ? null : "unauthorized"
}

export async function POST(request: NextRequest) {
  const authorizationError = getAuthorizationError(request)

  if (authorizationError) {
    return NextResponse.json(
      { success: false, error: authorizationError },
      { status: authorizationError === "missing_internal_cron_secret" ? 500 : 401 }
    )
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc("auto_release_due_payments", {
      p_limit: 100,
    })

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      releasedCount: typeof data === "number" ? data : 0,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "unexpected_release_error",
      },
      { status: 500 }
    )
  }
}
