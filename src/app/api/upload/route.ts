// Force Node.js runtime (cloudinary needs Node built-ins, not Edge).
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import {
  uploadImageToCloudinary,
  uploadFileToCloudinary,
  isCloudinaryConfigured,
} from "@/lib/cloudinary"

// POST /api/upload — multipart form with field "file" (single).
// Query param: ?kind=listing|chat  (default: listing)
//   - kind=listing  → images only, returns { url }
//   - kind=chat     → images AND files, returns { url, name, size, contentType }
// All uploads require authentication. Files are stored under
// campuskart/{userId}/ in Cloudinary for organization.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!isCloudinaryConfigured) {
    return NextResponse.json(
      { error: "Cloudinary is not configured. Set CLOUDINARY_* env vars." },
      { status: 500 }
    )
  }

  const { searchParams } = new URL(req.url)
  const kind = (searchParams.get("kind") || "listing").toLowerCase()
  const isChatKind = kind === "chat"

  const formData = await req.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // Size limits: 5MB for images, 25MB for chat attachments (allows PDFs/docs).
  const isImage = file.type.startsWith("image/")
  const maxBytes = isChatKind && !isImage ? 25 * 1024 * 1024 : 5 * 1024 * 1024
  if (file.size > maxBytes) {
    const mb = Math.floor(maxBytes / (1024 * 1024))
    return NextResponse.json(
      { error: `File too large (max ${mb}MB${isImage ? " for images" : ""})` },
      { status: 400 }
    )
  }

  // For listing/avatar uploads we only accept images.
  const imageAllowed = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  if (!isChatKind) {
    if (!imageAllowed.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload JPG, PNG, WEBP, or GIF." },
        { status: 400 }
      )
    }
  } else if (!isImage && file.type.length === 0) {
    // Some browsers don't set a content type for obscure files; reject.
    return NextResponse.json(
      { error: "Unsupported file type" },
      { status: 400 }
    )
  }

  const bytes = Buffer.from(await file.arrayBuffer())

  try {
    if (isImage) {
      const url = await uploadImageToCloudinary({
        buffer: bytes,
        userId: user.id,
        filename: file.name,
        contentType: file.type,
      })
      if (isChatKind) {
        return NextResponse.json({
          url,
          name: file.name,
          size: file.size,
          contentType: file.type,
        })
      }
      return NextResponse.json({ url })
    }

    // Non-image chat attachment (PDF, doc, etc.)
    if (!isChatKind) {
      // Defensive: listing kind should never reach here because of the type
      // check above, but guard anyway.
      return NextResponse.json(
        { error: "Unsupported file type. Please upload an image." },
        { status: 400 }
      )
    }
    const url = await uploadFileToCloudinary({
      buffer: bytes,
      userId: user.id,
      filename: file.name,
      contentType: file.type,
    })
    return NextResponse.json({
      url,
      name: file.name,
      size: file.size,
      contentType: file.type,
    })
  } catch (e) {
    console.error("Upload failed:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    )
  }
}
