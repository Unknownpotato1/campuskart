// Force Node.js runtime (firebase-admin needs Node built-ins, not Edge).
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { listColleges } from "@/lib/firestore"

// GET /api/colleges — list all colleges
export async function GET() {
  try {
    const colleges = await listColleges()
    return NextResponse.json({ colleges })
  } catch (e) {
    console.error("[/api/colleges] error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    )
  }
}
