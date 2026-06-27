import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import {
  parseProduct,
  parseWritingPost,
  type Product,
  type ProductRaw,
  type WritingPost,
  type WritingPostRaw,
} from "@/lib/types"

// GET /api/profile/my-content — current user's own listings + writing posts.
// Protected: 401 if no session. Returns { products, writingPosts } ordered by
// createdAt desc, each parsed via the shared type helpers.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [products, writingPosts] = await Promise.all([
    db.product.findMany({
      where: { sellerId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    db.writingPost.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ])

  return NextResponse.json({
    products: products.map((p) =>
      parseProduct(p as unknown as ProductRaw)
    ) as Product[],
    writingPosts: writingPosts.map((w) =>
      parseWritingPost(w as unknown as WritingPostRaw)
    ) as WritingPost[],
  })
}
