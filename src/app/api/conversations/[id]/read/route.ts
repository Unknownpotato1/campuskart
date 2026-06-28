// Force Node.js runtime (firebase-admin needs Node built-ins, not Edge).
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { getConversation, markRead } from "@/lib/firestore"

// POST /api/conversations/[id]/read — mark a conversation as read for the
// current user. Flips read=true on all messages not sent by the user.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const conv = await getConversation(id, user.id)
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await markRead(id, user.id)
  return NextResponse.json({ ok: true })
}
