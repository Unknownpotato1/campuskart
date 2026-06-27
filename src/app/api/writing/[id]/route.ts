// Force Node.js runtime (firebase-admin needs Node built-ins, not Edge).
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { getWriting, updateWriting, deleteWriting } from "@/lib/firestore"

const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED"]

// GET /api/writing/[id]
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const post = await getWriting(id)
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ post })
}

// PATCH /api/writing/[id] — author only; body { status? }
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params

  const existing = await getWriting(id)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (existing.userId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const patch: Record<string, unknown> = {}

  if (typeof body.status === "string" && VALID_STATUSES.includes(body.status)) {
    patch.status = body.status
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const post = await updateWriting(id, patch)
  return NextResponse.json({ post })
}

// DELETE /api/writing/[id] — author only
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params

  const existing = await getWriting(id)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (existing.userId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await deleteWriting(id)
  return NextResponse.json({ ok: true })
}
