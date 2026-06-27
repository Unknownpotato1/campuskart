import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { listProductsBySeller, listWritingByUser } from "@/lib/firestore"

// GET /api/profile/my-content — current user's own listings + writing posts.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const [products, writingPosts] = await Promise.all([
    listProductsBySeller(user.id),
    listWritingByUser(user.id),
  ])
  return NextResponse.json({ products, writingPosts })
}
