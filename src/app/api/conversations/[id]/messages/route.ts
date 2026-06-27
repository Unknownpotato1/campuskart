import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { parseConversation, type ConversationRaw, type Message } from "@/lib/types"

// Verify that the current user is a participant in the conversation.
// Returns either the parsed conversation id or a NextResponse (error).
async function authorize(
  id: string,
  user: { id: string }
): Promise<{ ok: false; res: NextResponse } | { ok: true; convId: string }> {
  const row = await db.conversation.findUnique({ where: { id } })
  if (!row) return { ok: false, res: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  const conv = parseConversation(row as unknown as ConversationRaw)
  if (!conv.participants.includes(user.id)) {
    return { ok: false, res: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  }
  return { ok: true, convId: conv.id }
}

// GET /api/conversations/[id]/messages — last 200 messages, oldest first.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const auth = await authorize(id, user)
  if (!auth.ok) return auth.res

  const rows = await db.message.findMany({
    where: { conversationId: auth.convId },
    orderBy: { createdAt: "asc" },
    take: 200,
  })

  const messages: Message[] = rows.map((r) => ({
    id: r.id,
    conversationId: r.conversationId,
    senderId: r.senderId,
    senderName: r.senderName,
    content: r.content,
    read: r.read,
    createdAt: r.createdAt.toISOString(),
  }))

  return NextResponse.json({ messages })
}

// POST /api/conversations/[id]/messages — send a message.
// Body: { content }. Creates the message, updates the conversation's
// lastMessage snapshot, marks the conversation as read for the sender
// (upserting ConversationRead with lastReadAt=now), and flips read=true
// on the other party's older messages in this conversation.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const auth = await authorize(id, user)
  if (!auth.ok) return auth.res

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const content = typeof body.content === "string" ? body.content.trim() : ""
  if (!content) {
    return NextResponse.json({ error: "Message content is required" }, { status: 400 })
  }
  if (content.length > 4000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 })
  }

  const now = new Date()

  // 1. Create the message.
  const created = await db.message.create({
    data: {
      conversationId: auth.convId,
      senderId: user.id,
      senderName: user.name,
      content,
      read: false,
    },
  })

  // 2. Update the conversation's last-message snapshot.
  await db.conversation.update({
    where: { id: auth.convId },
    data: {
      lastMessage: content,
      lastMessageAt: now,
      lastSenderId: user.id,
    },
  })

  // 3. Mark the conversation as read for the sender.
  await db.conversationRead.upsert({
    where: {
      conversationId_userId: { conversationId: auth.convId, userId: user.id },
    },
    create: { conversationId: auth.convId, userId: user.id, lastReadAt: now },
    update: { lastReadAt: now },
  })

  // 4. Mark all messages sent by the OTHER party in this conversation as read.
  //    (The sender has obviously seen the prior messages by replying.)
  await db.message.updateMany({
    where: {
      conversationId: auth.convId,
      senderId: { not: user.id },
      read: false,
    },
    data: { read: true },
  })

  const message: Message = {
    id: created.id,
    conversationId: created.conversationId,
    senderId: created.senderId,
    senderName: created.senderName,
    content: created.content,
    read: created.read,
    createdAt: created.createdAt.toISOString(),
  }

  return NextResponse.json({ message }, { status: 201 })
}
