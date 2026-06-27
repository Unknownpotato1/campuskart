import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

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
  const data: Record<string, unknown> = {}
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim()
  if (typeof body.phone === "string") data.phone = body.phone.trim() || null
  if (typeof body.photo === "string") data.photo = body.photo
  if (body.collegeId !== undefined) {
    if (body.collegeId === null || body.collegeId === "") {
      data.collegeId = null
      data.collegeName = null
      data.city = null
      data.state = null
    } else {
      const college = await db.college.findUnique({ where: { id: body.collegeId } })
      if (college) {
        data.collegeId = college.id
        data.collegeName = college.name
        data.city = college.city
        data.state = college.state
        data.onboarded = true
      }
    }
  }
  const updated = await db.user.update({ where: { id: user.id }, data })
  return NextResponse.json({ user: updated })
}
