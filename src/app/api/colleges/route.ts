// Force Node.js runtime (firebase-admin needs Node built-ins, not Edge).
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { COLLEGES_SEED } from "@/lib/colleges"

// GET /api/colleges — list all colleges directly from the seed array.
// No Firestore read: college IDs are stable `seed-<index>` strings so the
// profile PATCH can resolve them in `updateUser` without a Firestore read.
export async function GET() {
  const colleges = COLLEGES_SEED.map((c, i) => ({
    id: `seed-${i}`,
    name: c.name,
    city: c.city,
    state: c.state,
    createdAt: new Date(0).toISOString(),
  }))
  colleges.sort((a, b) => {
    if (a.state !== b.state) return a.state.localeCompare(b.state)
    return a.name.localeCompare(b.name)
  })
  return NextResponse.json({ colleges })
}
