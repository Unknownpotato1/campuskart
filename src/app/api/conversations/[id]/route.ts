import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { getConversation } from "@/lib/firestore"

// GET /api/conversations/[id] — single conversation (must be a participant).
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const conversation = await getConversation(id, user.id)
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ conversation })
}
