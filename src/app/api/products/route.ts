// Force Node.js runtime (firebase-admin needs Node built-ins, not Edge).
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { listProducts, createProduct, getCollege } from "@/lib/firestore"

const CATEGORIES = ["Books", "Electronics", "Lab Equipment", "Furniture", "Clothing", "Other"]
const CONDITIONS = ["New", "Like New", "Good", "Fair"]

// GET /api/products — list with filters and in-memory pagination on bumpedAt
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

  const { products, nextCursor } = await listProducts({
    q: q || undefined,
    category: CATEGORIES.includes(category) ? category : undefined,
    condition: CONDITIONS.includes(condition) ? condition : undefined,
    collegeId: collegeId || undefined,
    limit,
    cursor: cursor || undefined,
  })

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
    const college = await getCollege(body.collegeId.trim())
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

  const product = await createProduct({
    title,
    description,
    price,
    images,
    category,
    condition,
    sellerId: user.id,
    sellerName: user.name,
    collegeId,
    collegeName,
  })

  return NextResponse.json({ product }, { status: 201 })
}
