import { cookies } from "next/headers"
import { getUser, type UserDoc } from "./firestore"

export const SESSION_COOKIE = "ck_session"

export interface SessionPayload {
  uid: string
  email: string
  sig: string
}

// Simple HMAC-free signed session for demo. We store base64 of uid|email|sig
// where sig is a lightweight hash of uid+email+secret. This is NOT production
// grade crypto; for production use a proper JWT library or NextAuth/Jose.
const SECRET = process.env.SESSION_SECRET || "campuskart-dev-secret-change-me"

async function sha256(text: string): Promise<string> {
  const { createHash } = await import("crypto")
  return createHash("sha256").update(text).digest("hex")
}

function b64encode(s: string): string {
  return Buffer.from(s, "utf-8").toString("base64url")
}

function b64decode(s: string): string {
  return Buffer.from(s, "base64url").toString("utf-8")
}

export async function createSessionToken(uid: string, email: string): Promise<string> {
  const sig = await sha256(`${uid}|${email}|${SECRET}`)
  return b64encode(`${uid}|${email}|${sig}`)
}

export async function verifySessionToken(token: string): Promise<{ uid: string; email: string } | null> {
  try {
    const decoded = b64decode(token)
    const parts = decoded.split("|")
    if (parts.length !== 3) return null
    const [uid, email, sig] = parts
    const expected = await sha256(`${uid}|${email}|${SECRET}`)
    if (sig !== expected) return null
    return { uid, email }
  } catch {
    return null
  }
}

export async function setSession(uid: string, email: string) {
  const token = await createSessionToken(uid, email)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

export async function clearSession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getCurrentUser(): Promise<UserDoc | null> {
  try {
    const store = await cookies()
    const token = store.get(SESSION_COOKIE)?.value
    if (!token) return null
    const payload = await verifySessionToken(token)
    if (!payload) return null
    const user = await getUser(payload.uid)
    return user
  } catch {
    return null
  }
}

// For client components to read current user via API
export type CurrentUser = UserDoc
