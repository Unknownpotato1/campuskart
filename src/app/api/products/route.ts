import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { parseProduct, type ProductRaw } from "@/lib/types"

const CATEGORIES = ["Books", "Electronics", "Lab Equipment", "Furniture", "Clothing", "Other"]
const CONDITIONS = ["New", "Like New", "Good", "Fair"]

// GET /api/products — list with filters and keyset pagination on bumpedAt
// Query params: q, category, condition, collegeId, limit (default 12, max 24), cursor (ISO)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() || ""
  const category = searchParams.get("category")?.trim() || ""
  const condition = searchParams.get("condition")?.trim() || ""
  const collegeId = searchParams.get("collegeId")?.trim() || ""
  const cursor = searchParams.get("cursor")?.trim() || ""

  let limit = parseInt(searchParams.get("limit") || "12", 10)
  if (isNaN(limit) || limit <= 0) limit = 12
  if (limit > 24) limit = 24

  // Build where clause
  const andClauses: Record<string, unknown>[] = []

  if (q) {
    andClauses.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    })
  }

  if (category && CATEGORIES.includes(category)) {
    andClauses.push({ category })
  }

  if (condition && CONDITIONS.includes(condition)) {
    andClauses.push({ condition })
  }

  if (collegeId) {
    andClauses.push({ collegeId })
  }

  if (cursor) {
    const cursorDate = new Date(cursor)
    if (!isNaN(cursorDate.getTime())) {
      andClauses.push({ bumpedAt: { lt: cursorDate } })
    }
  }

  // By default exclude SOLD items from the marketplace feed? Spec doesn't say to;
  // keep showing SOLD with badge. So no status filter here unless requested.
  const where = andClauses.length ? { AND: andClauses } : {}

  const rows = await db.product.findMany({
    where,
    orderBy: { bumpedAt: "desc" },
    take: limit + 1,
  })

  const hasMore = rows.length > limit
  const slice = hasMore ? rows.slice(0, limit) : rows
  const products = slice.map((r) => parseProduct(r as unknown as ProductRaw))
  const nextCursor =
    hasMore && slice.length > 0 ? slice[slice.length - 1].bumpedAt.toISOString() : null

  return NextResponse.json({ products, nextCursor })
}

// POST /api/products — create a new listing (protected)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const description = typeof body.description === "string" ? body.description.trim() : ""
  const price = typeof body.price === "number" ? body.price : parseFloat(body.price)
  const category = typeof body.category === "string" ? body.category : ""
  const condition = typeof body.condition === "string" ? body.condition : ""
  const images: string[] = Array.isArray(body.images)
    ? body.images.filter((u: unknown): u is string => typeof u === "string")
    : []

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 })
  if (!description) return NextResponse.json({ error: "Description is required" }, { status: 400 })
  if (isNaN(price) || price < 0)
    return NextResponse.json({ error: "Price must be a non-negative number" }, { status: 400 })
  if (!CATEGORIES.includes(category))
    return NextResponse.json({ error: "Invalid category" }, { status: 400 })
  if (!CONDITIONS.includes(condition))
    return NextResponse.json({ error: "Invalid condition" }, { status: 400 })

  // College info (editable on form): if changed, look it up so we store the
  // canonical name; otherwise fall back to the seller's college.
  let collegeId: string | null = user.collegeId
  let collegeName: string | null = user.collegeName

  if (typeof body.collegeId === "string" && body.collegeId.trim()) {
    const college = await db.college.findUnique({ where: { id: body.collegeId.trim() } })
    if (college) {
      collegeId = college.id
      collegeName = college.name
    } else {
      collegeId = body.collegeId.trim()
      collegeName = typeof body.collegeName === "string" ? body.collegeName.trim() : null
    }
  } else if (typeof body.collegeName === "string" && body.collegeName.trim()) {
    collegeName = body.collegeName.trim()
  }

  const created = await db.product.create({
    data: {
      title,
      description,
      price,
      images: JSON.stringify(images),
      category,
      condition,
      sellerId: user.id,
      sellerName: user.name,
      collegeId,
      collegeName,
      status: "ACTIVE",
      bumpedAt: new Date(),
    },
  })

  return NextResponse.json({ product: parseProduct(created as unknown as ProductRaw) }, { status: 201 })
}
