import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { parseWritingPost, type WritingPostRaw } from "@/lib/types"

const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED"]

// GET /api/writing/[id]
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const post = await db.writingPost.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ post: parseWritingPost(post as unknown as WritingPostRaw) })
}

// PATCH /api/writing/[id] — author only; body { status? }
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params

  const existing = await db.writingPost.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (existing.userId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (typeof body.status === "string" && VALID_STATUSES.includes(body.status)) {
    data.status = body.status
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const updated = await db.writingPost.update({ where: { id }, data })
  return NextResponse.json({ post: parseWritingPost(updated as unknown as WritingPostRaw) })
}

// DELETE /api/writing/[id] — author only
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params

  const existing = await db.writingPost.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (existing.userId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await db.writingPost.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
