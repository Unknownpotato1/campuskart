// Force Node.js runtime (firebase-admin needs Node built-ins, not Edge).
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { bumpProduct, getProduct } from "@/lib/firestore"

// POST /api/products/[id]/bump — only seller; at most once per 24h
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params

  const existing = await getProduct(id)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (existing.sellerId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const product = await bumpProduct(id, user.id)
    return NextResponse.json({ product })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not bump listing"
    // Cooldown message → 400
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
