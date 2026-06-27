import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { parseWritingPost, type WritingPostRaw } from "@/lib/types"

const VALID_TYPES = ["NEED_WRITER", "CAN_WRITE"]

// GET /api/writing — list writing posts with filters
// Query params: type ("NEED_WRITER"|"CAN_WRITE"), collegeId, subject (contains,
// case-insensitive — matches `subject` field; for CAN_WRITE also matches within
// the raw `subjects` JSON string), deadline (ISO date; returns posts with
// deadline >= this date — only meaningful for NEED_WRITER).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")?.trim() || ""
  const collegeId = searchParams.get("collegeId")?.trim() || ""
  const subject = searchParams.get("subject")?.trim() || ""
  const deadline = searchParams.get("deadline")?.trim() || ""

  const andClauses: Record<string, unknown>[] = []

  if (type && VALID_TYPES.includes(type)) {
    andClauses.push({ type })
  }

  if (collegeId) {
    andClauses.push({ collegeId })
  }

  if (subject) {
    // Broad contains on `subject` plus a raw-JSON-string contains for the
    // `subjects` array (CAN_WRITE). SQLite `contains` is case-insensitive via
    // the Prisma `mode: "insensitive"` hint — on SQLite this is a no-op but
    // kept for clarity. We additionally OR a substring match on the raw
    // `subjects` JSON string for the multi-select case.
    andClauses.push({
      OR: [
        { subject: { contains: subject } },
        { subjects: { contains: subject } },
        { title: { contains: subject } },
      ],
    })
  }

  if (deadline) {
    const d = new Date(deadline)
    if (!isNaN(d.getTime())) {
      // Only NEED_WRITER posts have a deadline; restrict filter to that type.
      andClauses.push({
        AND: [{ type: "NEED_WRITER" }, { deadline: { gte: d } }],
      })
    }
  }

  const where = andClauses.length ? { AND: andClauses } : {}

  const rows = await db.writingPost.findMany({
    where,
    orderBy: { createdAt: "desc" },
  })

  const posts = rows.map((r) => parseWritingPost(r as unknown as WritingPostRaw))
  return NextResponse.json({ posts })
}

// POST /api/writing — create a writing post (protected)
// Body depends on type:
//  NEED_WRITER: { type, title, subject, description, pageCount, deadline,
//                  pricePerPage, collegeId, collegeName } -> totalPrice = pages*pricePerPage
//  CAN_WRITE:   { type, title, subject, description, subjects:[], pricePerPage,
//                  turnaround, collegeId, collegeName } -> pageCount/deadline/totalPrice null
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

  // College resolution: prefer supplied collegeId (look up canonical name),
  // otherwise fall back to the user's college.
  let collegeId: string | null = user.collegeId
  let collegeName: string | null = user.collegeName

  if (typeof body.collegeId === "string" && body.collegeId.trim()) {
    const college = await db.college.findUnique({ where: { id: body.collegeId.trim() } })
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

    let deadlineDate: Date | null = null
    if (typeof body.deadline === "string" && body.deadline.trim()) {
      const d = new Date(body.deadline)
      if (!isNaN(d.getTime())) deadlineDate = d
    }
    if (!deadlineDate) {
      return NextResponse.json({ error: "Deadline is required" }, { status: 400 })
    }

    const totalPrice = pageCount * pricePerPage

    const created = await db.writingPost.create({
      data: {
        type: "NEED_WRITER",
        title,
        subject,
        description,
        pageCount,
        deadline: deadlineDate,
        pricePerPage,
        totalPrice,
        subjects: "[]",
        turnaround: null,
        userId: user.id,
        userName: user.name,
        collegeId,
        collegeName,
        status: "OPEN",
      },
    })

    return NextResponse.json(
      { post: parseWritingPost(created as unknown as WritingPostRaw) },
      { status: 201 }
    )
  }

  // CAN_WRITE
  const subjectsRaw = Array.isArray(body.subjects)
    ? body.subjects.filter((s: unknown): s is string => typeof s === "string").map((s) => s.trim()).filter(Boolean)
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

  const created = await db.writingPost.create({
    data: {
      type: "CAN_WRITE",
      title,
      subject,
      description,
      pageCount: null,
      deadline: null,
      pricePerPage,
      totalPrice: null,
      subjects: JSON.stringify(subjects),
      turnaround,
      userId: user.id,
      userName: user.name,
      collegeId,
      collegeName,
      status: "OPEN",
    },
  })

  return NextResponse.json(
    { post: parseWritingPost(created as unknown as WritingPostRaw) },
    { status: 201 }
  )
}
