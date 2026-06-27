import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// POST /api/products/[id]/report — protected; prevent duplicates by same user
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params

  const product = await db.product.findUnique({ where: { id } })
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""
  if (!reason) return NextResponse.json({ error: "Reason is required" }, { status: 400 })

  // Prevent duplicate reports by same user on same product
  const existing = await db.report.findFirst({
    where: { productId: id, reporterId: user.id },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json(
      { error: "You have already reported this listing." },
      { status: 409 }
    )
  }

  await db.report.create({
    data: {
      productId: id,
      reporterId: user.id,
      reason,
    },
  })

  return NextResponse.json({ ok: true })
}
