// Force Node.js runtime (firebase-admin needs Node built-ins, not Edge).
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { getUser, updateUser } from "@/lib/firestore"

// GET /api/profile — current user profile
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ user })
}

// PATCH /api/profile — update profile (phone, college, name, photo)
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const patch: Record<string, unknown> = {}
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim()
  if (typeof body.phone === "string") patch.phone = body.phone.trim() || null
  if (typeof body.photo === "string") patch.photo = body.photo
  if (body.collegeId !== undefined) patch.collegeId = body.collegeId
  const updated = await updateUser(user.id, patch)
  return NextResponse.json({ user: updated })
}

// Keep getUser referenced for type inference
void getUser
