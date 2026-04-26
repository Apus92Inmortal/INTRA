import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

function isAuthorized(request: NextRequest) {
  const expected = process.env.INTERNAL_CRON_SECRET

  if (!expected) {
    return true
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const header = request.headers.get("x-internal-cron-secret")

  return bearer === expected || header === expected
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "unauthorized" },
      { status: 401 }
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
