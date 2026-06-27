import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { reportProduct, getProduct } from "@/lib/firestore"

// POST /api/products/[id]/report — protected; prevent duplicates by same user
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params

  const product = await getProduct(id)
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""
  if (!reason) return NextResponse.json({ error: "Reason is required" }, { status: 400 })

  try {
    await reportProduct(id, user.id, reason)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not report listing"
    // Duplicate report → 409
    return NextResponse.json({ error: msg }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
