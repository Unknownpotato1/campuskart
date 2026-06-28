// Force Node.js runtime (firebase-admin needs Node built-ins, not Edge).
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { getConversation, getMessages, sendMessage } from "@/lib/firestore"

// GET /api/conversations/[id]/messages — last 200 messages, oldest first.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const conv = await getConversation(id, user.id)
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const messages = await getMessages(id, user.id)
  return NextResponse.json({ messages })
}

// POST /api/conversations/[id]/messages — send a message (text or attachment).
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const conv = await getConversation(id, user.id)
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const content = typeof body.content === "string" ? body.content.trim() : ""
  const attachmentRaw = body.attachment as
    | {
        url?: string
        type?: string
        name?: string
        size?: number
        contentType?: string
      }
    | null
    | undefined

  const hasAttachment = !!attachmentRaw && !!attachmentRaw.url
  if (!content && !hasAttachment) {
    return NextResponse.json(
      { error: "Message content or attachment is required" },
      { status: 400 }
    )
  }
  if (content.length > 4000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 })
  }

  let attachment: {
    url: string
    type: "image" | "file"
    name: string
    size: number
    contentType: string
  } | null = null
  if (hasAttachment && attachmentRaw) {
    const attType: "image" | "file" =
      attachmentRaw.type === "image" ? "image" : "file"
    attachment = {
      url: String(attachmentRaw.url),
      type: attType,
      name: String(attachmentRaw.name || "file"),
      size: Number(attachmentRaw.size) || 0,
      contentType: String(attachmentRaw.contentType || ""),
    }
  }

  const type =
    typeof body.type === "string"
      ? (body.type as "text" | "image" | "file")
      : attachment?.type === "image"
        ? "image"
        : attachment?.type === "file"
          ? "file"
          : "text"

  const message = await sendMessage({
    convId: id,
    senderId: user.id,
    senderName: user.name,
    senderPhoto: user.photo ?? null,
    content,
    type,
    attachment,
  })

  return NextResponse.json({ message }, { status: 201 })
}
