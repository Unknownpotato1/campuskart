import { NextResponse } from "next/server"
import { listColleges } from "@/lib/firestore"

// GET /api/colleges — list all colleges
export async function GET() {
  const colleges = await listColleges()
  return NextResponse.json({ colleges })
}
