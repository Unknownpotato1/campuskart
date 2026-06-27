// Force Node.js runtime (cloudinary needs Node built-ins, not Edge).
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { uploadImageToCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary"

// POST /api/upload — multipart form with field "file" (single) — returns { url }
// Uploads to Cloudinary and returns a secure CDN URL.
// Images are compressed client-side (browser-image-compression) before upload.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!isCloudinaryConfigured) {
    return NextResponse.json(
      { error: "Cloudinary is not configured. Set CLOUDINARY_* env vars." },
      { status: 500 }
    )
  }

  const formData = await req.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 })
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())

  const url = await uploadImageToCloudinary({
    buffer: bytes,
    userId: user.id,
    filename: file.name,
    contentType: file.type,
  })

  return NextResponse.json({ url })
}
