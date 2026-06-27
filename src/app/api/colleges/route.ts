import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// GET /api/colleges — list all colleges
export async function GET() {
  const colleges = await db.college.findMany({ orderBy: [{ state: "asc" }, { name: "asc" }] })
  return NextResponse.json({ colleges })
}
