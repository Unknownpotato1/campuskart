import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// GET /api/conversations/unread — total unread messages for current user
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ count: 0 })

  const conversations = await db.conversation.findMany({
    where: { participants: { contains: user.id } },
    select: { id: true, lastMessageAt: true, lastSenderId: true },
  })

  let total = 0
  for (const conv of conversations) {
    // Unread = messages in this conversation after the user's last read, not sent by user
    const readRow = await db.conversationRead.findUnique({
      where: {
        conversationId_userId: { conversationId: conv.id, userId: user.id },
      },
    })
    const since = readRow?.lastReadAt || new Date(0)
    const count = await db.message.count({
      where: {
        conversationId: conv.id,
        senderId: { not: user.id },
        read: false,
        createdAt: { gt: since },
      },
    })
    total += count
  }
  return NextResponse.json({ count: total })
}
