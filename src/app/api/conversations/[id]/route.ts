import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { parseConversation, type ConversationRaw } from "@/lib/types"

// GET /api/conversations/[id] — single conversation (must be a participant).
// Returns { conversation } with otherName resolved.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const row = await db.conversation.findUnique({ where: { id } })
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const conv = parseConversation(row as unknown as ConversationRaw)
  if (!conv.participants.includes(user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const otherId = conv.participants.find((p) => p !== user.id)
  let otherName: string | undefined
  if (otherId) {
    const other = await db.user.findUnique({
      where: { id: otherId },
      select: { name: true },
    })
    otherName = other?.name
  }

  return NextResponse.json({ conversation: { ...conv, otherName } })
}
