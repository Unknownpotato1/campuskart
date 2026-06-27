// Force Node.js runtime (firebase-admin needs Node built-ins, not Edge).
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { listColleges } from "@/lib/firestore"

// GET /api/colleges — list all colleges
export async function GET() {
  const colleges = await listColleges()
  return NextResponse.json({ colleges })
}
