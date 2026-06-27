import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { parseProduct, type ProductRaw } from "@/lib/types"

const CATEGORIES = ["Books", "Electronics", "Lab Equipment", "Furniture", "Clothing", "Other"]
const CONDITIONS = ["New", "Like New", "Good", "Fair"]
const VALID_STATUSES = ["ACTIVE", "SOLD"]

// GET /api/products/[id]
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const product = await db.product.findUnique({ where: { id } })
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ product: parseProduct(product as unknown as ProductRaw) })
}

// PATCH /api/products/[id] — only seller
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params

  const existing = await db.product.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (existing.sellerId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim()
  if (typeof body.description === "string" && body.description.trim())
    data.description = body.description.trim()
  if (typeof body.price === "number" && body.price >= 0) data.price = body.price
  else if (typeof body.price === "string" && body.price !== "") {
    const p = parseFloat(body.price)
    if (!isNaN(p) && p >= 0) data.price = p
  }
  if (typeof body.category === "string" && CATEGORIES.includes(body.category))
    data.category = body.category
  if (typeof body.condition === "string" && CONDITIONS.includes(body.condition))
    data.condition = body.condition
  if (typeof body.status === "string" && VALID_STATUSES.includes(body.status))
    data.status = body.status
  if (Array.isArray(body.images)) {
    const imgs = body.images.filter((u: unknown): u is string => typeof u === "string")
    data.images = JSON.stringify(imgs)
  }
  if (body.collegeId !== undefined) {
    if (body.collegeId === null || body.collegeId === "") {
      data.collegeId = null
      data.collegeName = null
    } else if (typeof body.collegeId === "string") {
      const college = await db.college.findUnique({ where: { id: body.collegeId } })
      if (college) {
        data.collegeId = college.id
        data.collegeName = college.name
      } else {
        data.collegeId = body.collegeId
        if (typeof body.collegeName === "string") data.collegeName = body.collegeName
      }
    }
  }

  const updated = await db.product.update({ where: { id }, data })
  return NextResponse.json({ product: parseProduct(updated as unknown as ProductRaw) })
}

// DELETE /api/products/[id] — only seller
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params

  const existing = await db.product.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (existing.sellerId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await db.product.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
