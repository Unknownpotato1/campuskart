// Force Node.js runtime (firebase-admin needs Node built-ins, not Edge).
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { getUnreadCount } from "@/lib/firestore"

// GET /api/conversations/unread — total unread messages for current user
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ count: 0 })
  const count = await getUnreadCount(user.id)
  return NextResponse.json({ count })
}
