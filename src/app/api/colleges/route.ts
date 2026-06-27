import { NextResponse } from "next/server"
import { listColleges } from "@/lib/firestore"

// GET /api/colleges — list all colleges
export async function GET() {
  try {
    const colleges = await listColleges()
    return NextResponse.json({ colleges })
  } catch (e) {
    // Return the error inline so we can diagnose Vercel runtime issues.
    console.error("[/api/colleges] error:", e)
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Unknown error",
        stack: e instanceof Error ? e.stack?.split("\n").slice(0, 5) : undefined,
      },
      { status: 500 }
    )
  }
}
