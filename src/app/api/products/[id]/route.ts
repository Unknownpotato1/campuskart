// Force Node.js runtime (firebase-admin needs Node built-ins, not Edge).
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { getProduct, updateProduct, deleteProduct, getCollege } from "@/lib/firestore"

const CATEGORIES = ["Books", "Electronics", "Lab Equipment", "Furniture", "Clothing", "Other"]
const CONDITIONS = ["New", "Like New", "Good", "Fair"]
const VALID_STATUSES = ["ACTIVE", "SOLD"]

// GET /api/products/[id]
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const product = await getProduct(id)
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ product })
}

// PATCH /api/products/[id] — only seller
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params

  const existing = await getProduct(id)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (existing.sellerId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const patch: Record<string, unknown> = {}

  if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim()
  if (typeof body.description === "string" && body.description.trim())
    patch.description = body.description.trim()
  if (typeof body.price === "number" && body.price >= 0) patch.price = body.price
  else if (typeof body.price === "string" && body.price !== "") {
    const p = parseFloat(body.price)
    if (!isNaN(p) && p >= 0) patch.price = p
  }
  if (typeof body.category === "string" && CATEGORIES.includes(body.category))
    patch.category = body.category
  if (typeof body.condition === "string" && CONDITIONS.includes(body.condition))
    patch.condition = body.condition
  if (typeof body.status === "string" && VALID_STATUSES.includes(body.status))
    patch.status = body.status
  if (Array.isArray(body.images)) {
    patch.images = body.images.filter((u: unknown): u is string => typeof u === "string")
  }
  if (body.collegeId !== undefined) {
    if (body.collegeId === null || body.collegeId === "") {
      patch.collegeId = null
      patch.collegeName = null
    } else if (typeof body.collegeId === "string") {
      const college = await getCollege(body.collegeId)
      if (college) {
        patch.collegeId = college.id
        patch.collegeName = college.name
      } else {
        patch.collegeId = body.collegeId
        if (typeof body.collegeName === "string") patch.collegeName = body.collegeName
      }
    }
  }

  const product = await updateProduct(id, patch)
  return NextResponse.json({ product })
}

// DELETE /api/products/[id] — only seller
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params

  const existing = await getProduct(id)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (existing.sellerId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await deleteProduct(id)
  return NextResponse.json({ ok: true })
}
