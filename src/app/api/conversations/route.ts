import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import {
  listConversations,
  findOrCreateConversation,
  getUser,
} from "@/lib/firestore"

const VALID_CONTEXT_TYPES = ["PRODUCT", "WRITING"]

// GET /api/conversations — list conversations the current user is part of.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const conversations = await listConversations(user.id)
  return NextResponse.json({ conversations })
}

// POST /api/conversations — find-or-create a 1:1 conversation.
// Body: { contextType, contextId, contextTitle, participantId }
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

  if (!VALID_CONTEXT_TYPES.includes(contextType)) {
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

  // Ensure the participant exists.
  const participant = await getUser(participantId)
  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 })
  }

  const conversation = await findOrCreateConversation({
    contextType,
    contextId,
    contextTitle,
    participantId,
    currentUserId: user.id,
    currentUserName: user.name,
  })

  return NextResponse.json({ conversation }, { status: 201 })
}
