import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { parseProduct, type ProductRaw } from "@/lib/types"

// POST /api/products/[id]/bump — only seller; at most once per 24h
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params

  const product = await db.product.findUnique({ where: { id } })
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (product.sellerId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const now = new Date()
  const lastBump = product.bumpedAt
  const elapsedMs = now.getTime() - lastBump.getTime()
  const cooldownMs = 24 * 60 * 60 * 1000 // 24 hours
  if (elapsedMs < cooldownMs) {
    const remainingMs = cooldownMs - elapsedMs
    const hoursRemaining = Math.ceil(remainingMs / (60 * 60 * 1000))
    return NextResponse.json(
      {
        error: `You can bump a listing at most once every 24 hours. Try again in ~${hoursRemaining}h.`,
      },
      { status: 400 }
    )
  }

  const updated = await db.product.update({
    where: { id },
    data: { bumpedAt: now },
  })

  return NextResponse.json({ product: parseProduct(updated as unknown as ProductRaw) })
}
