import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { parseConversation, type ConversationRaw } from "@/lib/types"

// POST /api/conversations/[id]/read — mark a conversation as read for the
// current user. Upserts ConversationRead (lastReadAt=now) and flips
// read=true on all messages in the conversation not sent by the user.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const row = await db.conversation.findUnique({ where: { id } })
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const conv = parseConversation(row as unknown as ConversationRaw)
  if (!conv.participants.includes(user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const now = new Date()

  await db.$transaction([
    db.conversationRead.upsert({
      where: {
        conversationId_userId: { conversationId: conv.id, userId: user.id },
      },
      create: { conversationId: conv.id, userId: user.id, lastReadAt: now },
      update: { lastReadAt: now },
    }),
    db.message.updateMany({
      where: {
        conversationId: conv.id,
        senderId: { not: user.id },
        read: false,
      },
      data: { read: true },
    }),
  ])

  return NextResponse.json({ ok: true })
}
