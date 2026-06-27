// Force Node.js runtime (firebase-admin needs Node built-ins, not Edge).
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { clearSession } from "@/lib/session"

export async function POST() {
  await clearSession()
  return NextResponse.json({ ok: true })
}
