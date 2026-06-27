import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import {
  parseConversation,
  type Conversation,
  type ConversationRaw,
  type ConversationContextType,
} from "@/lib/types"

const VALID_CONTEXT_TYPES: ConversationContextType[] = ["PRODUCT", "WRITING"]

// GET /api/conversations — list conversations the current user is part of.
// Returns { conversations: Array<Conversation & { unread: number; otherName?: string }> }
// ordered by lastMessageAt desc.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db.conversation.findMany({
    where: { participants: { contains: user.id } },
    orderBy: { lastMessageAt: "desc" },
  })

  if (rows.length === 0) {
    return NextResponse.json({ conversations: [] })
  }

  // Resolve "other participant" names in a single DB hit.
  // Each conversation has exactly 2 participants in our model.
  const otherIds = new Set<string>()
  const parsed = rows.map((r) => {
    const conv = parseConversation(r as unknown as ConversationRaw)
    const otherId = conv.participants.find((p) => p !== user.id)
    if (otherId) otherIds.add(otherId)
    return conv
  })

  const otherUsers = await db.user.findMany({
    where: { id: { in: Array.from(otherIds) } },
    select: { id: true, name: true },
  })
  const nameById = new Map(otherUsers.map((u) => [u.id, u.name]))

  // Fetch the user's read-state for every conversation in a single query.
  const readRows = await db.conversationRead.findMany({
    where: {
      userId: user.id,
      conversationId: { in: parsed.map((c) => c.id) },
    },
    select: { conversationId: true, lastReadAt: true },
  })
  const readByConv = new Map(readRows.map((r) => [r.conversationId, r.lastReadAt]))

  // Count unread messages per conversation (senderId != me, read=false, and
  // createdAt > my lastReadAt OR all such unread if no read row).
  const convsWithMeta = await Promise.all(
    parsed.map(async (conv) => {
      const since = readByConv.get(conv.id) ?? new Date(0)
      const unread = await db.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: user.id },
          read: false,
          createdAt: { gt: since },
        },
      })
      const otherId = conv.participants.find((p) => p !== user.id)
      const otherName = otherId ? nameById.get(otherId) : undefined
      return { ...conv, unread, otherName } as Conversation & {
        unread: number
        otherName?: string
      }
    })
  )

  return NextResponse.json({ conversations: convsWithMeta })
}

// POST /api/conversations — find-or-create a 1:1 conversation.
// Body: { contextType, contextId, contextTitle, participantId }
// Returns { conversation } (parsed). Idempotent: if a conversation already
// exists for the same contextId with both the current user and participantId
// as participants, it is returned instead of creating a new one.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const contextType = typeof body.contextType === "string" ? body.contextType : ""
  const contextId = typeof body.contextId === "string" ? body.contextId.trim() : ""
  const contextTitle = typeof body.contextTitle === "string" ? body.contextTitle.trim() : ""
  const participantId = typeof body.participantId === "string" ? body.participantId.trim() : ""

  if (!VALID_CONTEXT_TYPES.includes(contextType as ConversationContextType)) {
    return NextResponse.json({ error: "Invalid contextType" }, { status: 400 })
  }
  if (!contextId) return NextResponse.json({ error: "contextId is required" }, { status: 400 })
  if (!participantId)
    return NextResponse.json({ error: "participantId is required" }, { status: 400 })
  if (participantId === user.id) {
    return NextResponse.json(
      { error: "Cannot start a conversation with yourself." },
      { status: 400 }
    )
  }

  // Ensure the participant exists (defensive; not strictly required).
  const participant = await db.user.findUnique({
    where: { id: participantId },
    select: { id: true },
  })
  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 })
  }

  // SQLite can't do JSON array membership; query by contextId and filter in JS.
  const candidates = await db.conversation.findMany({ where: { contextId } })
  for (const c of candidates) {
    const conv = parseConversation(c as unknown as ConversationRaw)
    if (
      conv.participants.includes(user.id) &&
      conv.participants.includes(participantId)
    ) {
      return NextResponse.json({ conversation: conv })
    }
  }

  // Create new conversation.
  const created = await db.conversation.create({
    data: {
      participants: JSON.stringify([user.id, participantId]),
      contextType,
      contextId,
      contextTitle,
      lastMessage: "",
      lastMessageAt: new Date(),
      lastSenderId: null,
    },
  })

  return NextResponse.json(
    { conversation: parseConversation(created as unknown as ConversationRaw) },
    { status: 201 }
  )
}
