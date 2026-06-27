import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

// POST /api/upload — multipart form with field "file" (single) — returns { url }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const filename = `${user.id}-${randomUUID()}.${ext}`
  const uploadDir = path.join(process.cwd(), "public", "uploads")
  try {
    await mkdir(uploadDir, { recursive: true })
  } catch {
    // ignore
  }
  const bytes = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(uploadDir, filename), bytes)

  return NextResponse.json({ url: `/uploads/${filename}` })
}
