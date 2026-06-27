import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { setSession } from "@/lib/session"
import { verifyFirebaseIdToken } from "@/lib/firebase-admin"

const isFirebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
)

// POST /api/auth/login
// - Real Firebase login:  body { idToken }  → verifies the Google ID token
//   server-side via Google's public JWKS, then creates/finds the user.
// - Fallback (only when Firebase env vars are NOT set): body { name, email, photo? }
//   simulates a Google sign-in for local/demo use.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ── Real Firebase path ────────────────────────────────────────────────
    if (body?.idToken && typeof body.idToken === "string") {
      const verified = await verifyFirebaseIdToken(body.idToken)
      if (!verified || !verified.email) {
        return NextResponse.json({ error: "Invalid Google credentials" }, { status: 401 })
      }
      const email = verified.email.trim().toLowerCase()
      const name = (verified.name || email.split("@")[0]).trim()
      const photo = verified.photo || null

      let user = await db.user.findUnique({ where: { email } })
      if (!user) {
        user = await db.user.create({ data: { email, name, photo } })
      } else if (user.name !== name || user.photo !== photo) {
        user = await db.user.update({
          where: { id: user.id },
          data: { name, photo: photo ?? user.photo },
        })
      }

      await setSession(user.id, user.email)
      return NextResponse.json({ user })
    }

    // ── Simulated fallback (demo accounts) — only when Firebase not set up ─
    if (!isFirebaseConfigured) {
      const { name, email, photo } = body
      if (!email || !name) {
        return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
      }
      const cleanEmail = String(email).trim().toLowerCase()
      const cleanName = String(name).trim()

      let user = await db.user.findUnique({ where: { email: cleanEmail } })
      if (!user) {
        user = await db.user.create({
          data: { email: cleanEmail, name: cleanName, photo: photo || null },
        })
      } else if (user.name !== cleanName || (photo && user.photo !== photo)) {
        user = await db.user.update({
          where: { id: user.id },
          data: { name: cleanName, photo: photo || user.photo },
        })
      }

      await setSession(user.id, user.email)
      return NextResponse.json({ user })
    }

    // Firebase IS configured but no idToken was sent → reject.
    return NextResponse.json(
      { error: "Google sign-in token required" },
      { status: 400 }
    )
  } catch (e) {
    console.error("login error", e)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
