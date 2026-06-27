import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { listWriting, createWriting, getCollege } from "@/lib/firestore"

const VALID_TYPES = ["NEED_WRITER", "CAN_WRITE"]

// GET /api/writing — list writing posts with filters
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")?.trim() || ""
  const collegeId = searchParams.get("collegeId")?.trim() || ""
  const subject = searchParams.get("subject")?.trim() || ""
  const deadline = searchParams.get("deadline")?.trim() || ""

  const posts = await listWriting({
    type: VALID_TYPES.includes(type) ? type : undefined,
    collegeId: collegeId || undefined,
    subject: subject || undefined,
    deadline: deadline || undefined,
  })

  return NextResponse.json({ posts })
}

// POST /api/writing — create a writing post (protected)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const type = typeof body.type === "string" ? body.type : ""
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  }

  const title = typeof body.title === "string" ? body.title.trim() : ""
  const subject = typeof body.subject === "string" ? body.subject.trim() : ""
  const description = typeof body.description === "string" ? body.description.trim() : ""

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 })
  if (!subject) return NextResponse.json({ error: "Subject is required" }, { status: 400 })
  if (!description) return NextResponse.json({ error: "Description is required" }, { status: 400 })

  // College resolution
  let collegeId: string | null = user.collegeId
  let collegeName: string | null = user.collegeName

  if (typeof body.collegeId === "string" && body.collegeId.trim()) {
    const college = await getCollege(body.collegeId.trim())
    if (college) {
      collegeId = college.id
      collegeName = college.name
    } else {
      collegeId = body.collegeId.trim()
      collegeName =
        typeof body.collegeName === "string" && body.collegeName.trim()
          ? body.collegeName.trim()
          : null
    }
  } else if (typeof body.collegeName === "string" && body.collegeName.trim()) {
    collegeName = body.collegeName.trim()
  }

  if (type === "NEED_WRITER") {
    const pageCount =
      typeof body.pageCount === "number"
        ? body.pageCount
        : parseInt(body.pageCount, 10)
    if (isNaN(pageCount) || pageCount <= 0) {
      return NextResponse.json({ error: "Page count must be a positive number" }, { status: 400 })
    }

    const pricePerPage =
      typeof body.pricePerPage === "number"
        ? body.pricePerPage
        : parseFloat(body.pricePerPage)
    if (isNaN(pricePerPage) || pricePerPage < 0) {
      return NextResponse.json(
        { error: "Price per page must be a non-negative number" },
        { status: 400 }
      )
    }

    let deadline: string | null = null
    if (typeof body.deadline === "string" && body.deadline.trim()) {
      const d = new Date(body.deadline)
      if (!isNaN(d.getTime())) deadline = body.deadline.trim()
    }
    if (!deadline) {
      return NextResponse.json({ error: "Deadline is required" }, { status: 400 })
    }

    const totalPrice = pageCount * pricePerPage

    const post = await createWriting({
      type: "NEED_WRITER",
      title,
      subject,
      description,
      pageCount,
      deadline,
      pricePerPage,
      totalPrice,
      subjects: [],
      turnaround: null,
      userId: user.id,
      userName: user.name,
      collegeId,
      collegeName,
    })

    return NextResponse.json({ post }, { status: 201 })
  }

  // CAN_WRITE
  const subjectsRaw: string[] = Array.isArray(body.subjects)
    ? body.subjects
        .filter((s: unknown): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter((s: string): s is string => s.length > 0)
    : []
  const subjects = Array.from(new Set(subjectsRaw))

  const pricePerPage =
    typeof body.pricePerPage === "number"
      ? body.pricePerPage
      : parseFloat(body.pricePerPage)
  if (isNaN(pricePerPage) || pricePerPage < 0) {
    return NextResponse.json(
      { error: "Price per page must be a non-negative number" },
      { status: 400 }
    )
  }

  const turnaround =
    typeof body.turnaround === "string" && body.turnaround.trim()
      ? body.turnaround.trim()
      : null

  const post = await createWriting({
    type: "CAN_WRITE",
    title,
    subject,
    description,
    pageCount: null,
    deadline: null,
    pricePerPage,
    totalPrice: null,
    subjects,
    turnaround,
    userId: user.id,
    userName: user.name,
    collegeId,
    collegeName,
  })

  return NextResponse.json({ post }, { status: 201 })
}
