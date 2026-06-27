import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { setSession } from "@/lib/session"

// POST /api/auth/login
// Simulated Google Sign-In. Body: { name, email, photo? }
export async function POST(req: NextRequest) {
  try {
    const { name, email, photo } = await req.json()
    if (!email || !name) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }
    const cleanEmail = String(email).trim().toLowerCase()
    const cleanName = String(name).trim()

    let user = await db.user.findUnique({ where: { email: cleanEmail } })
    if (!user) {
      user = await db.user.create({
        data: {
          email: cleanEmail,
          name: cleanName,
          photo: photo || null,
        },
      })
    } else if (user.name !== cleanName || (photo && user.photo !== photo)) {
      user = await db.user.update({
        where: { id: user.id },
        data: { name: cleanName, photo: photo || user.photo },
      })
    }

    await setSession(user.id, user.email)
    return NextResponse.json({ user })
  } catch (e) {
    console.error("login error", e)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
