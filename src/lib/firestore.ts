import {
  adminDb,
  adminBucket,
  isFirebaseAdminConfigured,
} from "@/lib/firebase-server"

// Re-export for convenience.
export { isFirebaseAdminConfigured } from "@/lib/firebase-server"
import type {
  Product,
  WritingPost,
  Conversation,
  Message,
  College,
  ProductCategory,
  ProductCondition,
  ProductStatus,
  WritingType,
  WritingStatus,
  ConversationContextType,
} from "@/lib/types"
import { COLLEGES_SEED } from "@/lib/colleges"

// ── Collection helpers ───────────────────────────────────────────────────────
const nowIso = () => new Date().toISOString()

// Firestore stores arrays natively, so we keep images/subjects/participants as
// real arrays (no JSON.stringify). The frontend types already expect arrays.

// ── Users ────────────────────────────────────────────────────────────────────
export interface UserDoc {
  id: string
  email: string
  name: string
  photo: string | null
  phone: string | null
  collegeId: string | null
  collegeName: string | null
  city: string | null
  state: string | null
  onboarded: boolean
  createdAt: string
  updatedAt: string
}

export async function getUser(uid: string): Promise<UserDoc | null> {
  if (!isFirebaseAdminConfigured) return null
  const snap = await adminDb.collection("users").doc(uid).get()
  if (!snap.exists) return null
  return { id: snap.id, ...(snap.data() as Omit<UserDoc, "id">) }
}

export async function upsertUserFromFirebase(params: {
  uid: string
  email: string
  name: string
  photo: string | null
}): Promise<UserDoc> {
  const { uid, email, name, photo } = params
  const ref = adminDb.collection("users").doc(uid)
  const snap = await ref.get()
  const ts = nowIso()
  if (!snap.exists) {
    const data: Omit<UserDoc, "id"> = {
      email,
      name,
      photo,
      phone: null,
      collegeId: null,
      collegeName: null,
      city: null,
      state: null,
      onboarded: false,
      createdAt: ts,
      updatedAt: ts,
    }
    await ref.set(data)
    return { id: uid, ...data }
  }
  // Update name/photo if changed
  const existing = snap.data() as Omit<UserDoc, "id">
  const patch: Record<string, unknown> = { updatedAt: ts }
  if (existing.name !== name) patch.name = name
  if (photo && existing.photo !== photo) patch.photo = photo
  await ref.update(patch)
  return { id: uid, ...{ ...existing, ...patch } as Omit<UserDoc, "id"> }
}

export async function updateUser(uid: string, patch: Record<string, unknown>): Promise<UserDoc> {
  const ref = adminDb.collection("users").doc(uid)
  const snap = await ref.get()
  if (!snap.exists) throw new Error("User not found")
  const data = patch
  // If collegeId is being set, also resolve college name/city/state.
  if ("collegeId" in patch) {
    if (patch.collegeId === null || patch.collegeId === "") {
      data.collegeId = null
      data.collegeName = null
      data.city = null
      data.state = null
    } else {
      const college = await getCollege(String(patch.collegeId))
      if (college) {
        data.collegeId = college.id
        data.collegeName = college.name
        data.city = college.city
        data.state = college.state
        data.onboarded = true
      }
    }
  }
  data.updatedAt = nowIso()
  await ref.update(data)
  const updated = await ref.get()
  return { id: uid, ...(updated.data() as Omit<UserDoc, "id">) }
}

// ── Colleges ────────────────────────────────────────────────────────────────
export async function getCollege(id: string): Promise<College | null> {
  const snap = await adminDb.collection("colleges").doc(id).get()
  if (!snap.exists) return null
  return { id: snap.id, ...(snap.data() as Omit<College, "id">) }
}

export async function listColleges(): Promise<College[]> {
  // Avoid a composite (state, name) index: fetch all and sort in memory.
  const snap = await adminDb.collection("colleges").get()
  const colleges = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<College, "id">) }))
  colleges.sort((a, b) => {
    if (a.state !== b.state) return a.state.localeCompare(b.state)
    return a.name.localeCompare(b.name)
  })
  return colleges
}

export async function findCollegeByName(name: string, state: string): Promise<College | null> {
  const snap = await adminDb
    .collection("colleges")
    .where("name", "==", name)
    .where("state", "==", state)
    .limit(1)
    .get()
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...(d.data() as Omit<College, "id">) }
}

// Seed colleges into Firestore if the collection is empty.
export async function seedCollegesIfEmpty(): Promise<number> {
  const existing = await adminDb.collection("colleges").limit(1).get()
  if (!existing.empty) return 0
  const batch = adminDb.batch()
  let count = 0
  for (const c of COLLEGES_SEED) {
    const ref = adminDb.collection("colleges").doc()
    batch.set(ref, { name: c.name, city: c.city, state: c.state, createdAt: nowIso() })
    count++
  }
  await batch.commit()
  return count
}

// ── Products ────────────────────────────────────────────────────────────────
interface ProductDoc {
  title: string
  description: string
  price: number
  images: string[]
  category: string
  condition: string
  sellerId: string
  sellerName: string
  collegeId: string | null
  collegeName: string | null
  status: string
  bumpedAt: string
  createdAt: string
  updatedAt: string
}

function toProduct(id: string, d: ProductDoc): Product {
  return {
    id,
    title: d.title,
    description: d.description,
    price: d.price,
    images: d.images || [],
    category: d.category as ProductCategory,
    condition: d.condition as ProductCondition,
    sellerId: d.sellerId,
    sellerName: d.sellerName,
    collegeId: d.collegeId ?? null,
    collegeName: d.collegeName ?? null,
    status: d.status as ProductStatus,
    bumpedAt: d.bumpedAt,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

export async function listProducts(opts: {
  q?: string
  category?: string
  condition?: string
  collegeId?: string
  limit?: number
  cursor?: string
}): Promise<{ products: Product[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(opts.limit || 12, 1), 24)

  // To stay fully composite-index-free, we never combine equality filters with
  // orderBy. We fetch (optionally filtered by equality) without orderBy, then
  // sort + paginate in memory.
  let q: FirebaseFirestore.Query = adminDb.collection("products")
  if (opts.category) q = q.where("category", "==", opts.category)
  if (opts.condition) q = q.where("condition", "==", opts.condition)
  if (opts.collegeId) q = q.where("collegeId", "==", opts.collegeId)
  const snap = await q.limit(100).get()
  let products = snap.docs.map((d) => toProduct(d.id, d.data() as ProductDoc))
  if (opts.q) {
    const needle = opts.q.toLowerCase()
    products = products.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle)
    )
  }
  // Sort by bumpedAt desc in memory.
  products.sort((a, b) => (a.bumpedAt < b.bumpedAt ? 1 : a.bumpedAt > b.bumpedAt ? -1 : 0))

  // Cursor pagination (in-memory) on bumpedAt.
  if (opts.cursor) {
    const idx = products.findIndex((p) => p.bumpedAt === opts.cursor)
    if (idx >= 0) products = products.slice(idx + 1)
  }

  const hasMore = products.length > limit
  const slice = products.slice(0, limit)
  const nextCursor = hasMore && slice.length > 0 ? slice[slice.length - 1].bumpedAt : null
  return { products: slice, nextCursor }
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await adminDb.collection("products").doc(id).get()
  if (!snap.exists) return null
  return toProduct(snap.id, snap.data() as ProductDoc)
}

export async function listProductsBySeller(sellerId: string): Promise<Product[]> {
  const snap = await adminDb.collection("products").where("sellerId", "==", sellerId).get()
  const products = snap.docs.map((d) => toProduct(d.id, d.data() as ProductDoc))
  products.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return products
}

export async function createProduct(data: {
  title: string
  description: string
  price: number
  images: string[]
  category: string
  condition: string
  sellerId: string
  sellerName: string
  collegeId: string | null
  collegeName: string | null
}): Promise<Product> {
  const ts = nowIso()
  const ref = await adminDb.collection("products").add({
    title: data.title,
    description: data.description,
    price: data.price,
    images: data.images,
    category: data.category,
    condition: data.condition,
    sellerId: data.sellerId,
    sellerName: data.sellerName,
    collegeId: data.collegeId,
    collegeName: data.collegeName,
    status: "ACTIVE",
    bumpedAt: ts,
    createdAt: ts,
    updatedAt: ts,
  } as ProductDoc)
  const snap = await ref.get()
  return toProduct(ref.id, snap.data() as ProductDoc)
}

export async function updateProduct(id: string, patch: Partial<ProductDoc>): Promise<Product> {
  const ref = adminDb.collection("products").doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new Error("Product not found")
  await ref.update({ ...patch, updatedAt: nowIso() })
  const updated = await ref.get()
  return toProduct(ref.id, updated.data() as ProductDoc)
}

export async function deleteProduct(id: string): Promise<void> {
  await adminDb.collection("products").doc(id).delete()
}

export async function bumpProduct(id: string, sellerId: string): Promise<Product> {
  const ref = adminDb.collection("products").doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new Error("Product not found")
  const data = snap.data() as ProductDoc
  if (data.sellerId !== sellerId) throw new Error("Forbidden")
  const bumpedAt = new Date(data.bumpedAt)
  const elapsedHrs = (Date.now() - bumpedAt.getTime()) / (1000 * 60 * 60)
  if (elapsedHrs < 24) {
    const wait = Math.ceil(24 - elapsedHrs)
    throw new Error(`You can bump a listing at most once every 24 hours. Try again in ${wait}h.`)
  }
  await ref.update({ bumpedAt: nowIso(), updatedAt: nowIso() })
  const updated = await ref.get()
  return toProduct(ref.id, updated.data() as ProductDoc)
}

export async function reportProduct(productId: string, reporterId: string, reason: string): Promise<void> {
  // Prevent duplicates by same user.
  const dup = await adminDb
    .collection("reports")
    .where("productId", "==", productId)
    .where("reporterId", "==", reporterId)
    .limit(1)
    .get()
  if (!dup.empty) throw new Error("You already reported this listing.")
  await adminDb.collection("reports").add({
    productId,
    reporterId,
    reason,
    createdAt: nowIso(),
  })
}

// ── Writing posts ──────────────────────────────────────────────────────────
interface WritingDoc {
  type: string
  title: string
  subject: string
  description: string
  pageCount: number | null
  deadline: string | null
  pricePerPage: number
  totalPrice: number | null
  subjects: string[]
  turnaround: string | null
  userId: string
  userName: string
  collegeId: string | null
  collegeName: string | null
  status: string
  createdAt: string
  updatedAt: string
}

function toWriting(id: string, d: WritingDoc): WritingPost {
  return {
    id,
    type: d.type as WritingType,
    title: d.title,
    subject: d.subject,
    description: d.description,
    pageCount: d.pageCount ?? null,
    deadline: d.deadline ?? null,
    pricePerPage: d.pricePerPage,
    totalPrice: d.totalPrice ?? null,
    subjects: d.subjects || [],
    turnaround: d.turnaround ?? null,
    userId: d.userId,
    userName: d.userName,
    collegeId: d.collegeId ?? null,
    collegeName: d.collegeName ?? null,
    status: d.status as WritingStatus,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

export async function listWriting(opts: {
  type?: string
  collegeId?: string
  subject?: string
  deadline?: string
}): Promise<WritingPost[]> {
  let q: FirebaseFirestore.Query = adminDb.collection("writingPosts")
  if (opts.type) q = q.where("type", "==", opts.type)
  if (opts.collegeId) q = q.where("collegeId", "==", opts.collegeId)
  // No orderBy here (would need a composite index with the equality filters).
  const snap = await q.limit(100).get()
  let posts = snap.docs.map((d) => toWriting(d.id, d.data() as WritingDoc))
  if (opts.subject) {
    const needle = opts.subject.toLowerCase()
    posts = posts.filter(
      (p) =>
        p.subject.toLowerCase().includes(needle) ||
        p.title.toLowerCase().includes(needle) ||
        p.subjects.some((s) => s.toLowerCase().includes(needle))
    )
  }
  if (opts.deadline) {
    const d = opts.deadline
    posts = posts.filter((p) => p.deadline && p.deadline >= d)
  }
  // Sort by createdAt desc in memory.
  posts.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
  return posts
}

export async function getWriting(id: string): Promise<WritingPost | null> {
  const snap = await adminDb.collection("writingPosts").doc(id).get()
  if (!snap.exists) return null
  return toWriting(snap.id, snap.data() as WritingDoc)
}

export async function listWritingByUser(userId: string): Promise<WritingPost[]> {
  const snap = await adminDb.collection("writingPosts").where("userId", "==", userId).get()
  const posts = snap.docs.map((d) => toWriting(d.id, d.data() as WritingDoc))
  posts.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return posts
}

export async function createWriting(data: Omit<WritingDoc, "status" | "createdAt" | "updatedAt">): Promise<WritingPost> {
  const ts = nowIso()
  const ref = await adminDb.collection("writingPosts").add({
    ...data,
    status: "OPEN",
    createdAt: ts,
    updatedAt: ts,
  } as WritingDoc)
  const snap = await ref.get()
  return toWriting(ref.id, snap.data() as WritingDoc)
}

export async function updateWriting(id: string, patch: Partial<WritingDoc>): Promise<WritingPost> {
  const ref = adminDb.collection("writingPosts").doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new Error("Writing post not found")
  await ref.update({ ...patch, updatedAt: nowIso() })
  const updated = await ref.get()
  return toWriting(ref.id, updated.data() as WritingDoc)
}

export async function deleteWriting(id: string): Promise<void> {
  await adminDb.collection("writingPosts").doc(id).delete()
}

// ── Conversations + Messages ───────────────────────────────────────────────
interface ConversationDoc {
  participants: string[]
  contextType: string
  contextId: string
  contextTitle: string
  lastMessage: string
  lastMessageAt: string
  lastSenderId: string | null
  createdAt: string
  updatedAt: string
}

interface MessageDoc {
  conversationId: string
  senderId: string
  senderName: string
  content: string
  read: boolean
  createdAt: string
}

function toConversation(id: string, d: ConversationDoc): Conversation {
  return {
    id,
    participants: d.participants || [],
    contextType: d.contextType as ConversationContextType,
    contextId: d.contextId,
    contextTitle: d.contextTitle,
    lastMessage: d.lastMessage || "",
    lastMessageAt: d.lastMessageAt,
    lastSenderId: d.lastSenderId ?? null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

export async function listConversations(userId: string): Promise<Array<Conversation & { unread: number; otherName: string | null }>> {
  // array-contains + orderBy would need a composite index; fetch without
  // orderBy and sort in memory.
  const snap = await adminDb
    .collection("conversations")
    .where("participants", "array-contains", userId)
    .get()
  const result: Array<Conversation & { unread: number; otherName: string | null }> = []
  for (const d of snap.docs) {
    const conv = toConversation(d.id, d.data() as ConversationDoc)
    const unread = await getConversationUnread(d.id, userId)
    const otherId = conv.participants.find((p) => p !== userId)
    let otherName: string | null = null
    if (otherId) {
      const otherUser = await getUser(otherId)
      otherName = otherUser?.name ?? null
    }
    result.push({ ...conv, unread, otherName })
  }
  // Sort by lastMessageAt desc in memory.
  result.sort((a, b) =>
    a.lastMessageAt < b.lastMessageAt ? 1 : a.lastMessageAt > b.lastMessageAt ? -1 : 0
  )
  return result
}

async function getConversationUnread(convId: string, userId: string): Promise<number> {
  // (senderId !=, read ==) would need a composite index; fetch messages not
  // sent by user and count unread in memory.
  const snap = await adminDb
    .collection("conversations")
    .doc(convId)
    .collection("messages")
    .where("senderId", "!=", userId)
    .get()
  let count = 0
  for (const d of snap.docs) {
    const data = d.data() as MessageDoc
    if (data.read === false) count++
  }
  return count
}

export async function getConversation(
  id: string,
  userId: string
): Promise<(Conversation & { otherName: string | null }) | null> {
  const snap = await adminDb.collection("conversations").doc(id).get()
  if (!snap.exists) return null
  const conv = toConversation(snap.id, snap.data() as ConversationDoc)
  if (!conv.participants.includes(userId)) return null
  const otherId = conv.participants.find((p) => p !== userId)
  let otherName: string | null = null
  if (otherId) {
    const otherUser = await getUser(otherId)
    otherName = otherUser?.name ?? null
  }
  return { ...conv, otherName }
}

export async function findOrCreateConversation(params: {
  contextType: string
  contextId: string
  contextTitle: string
  participantId: string
  currentUserId: string
  currentUserName: string
}): Promise<Conversation> {
  const { contextType, contextId, contextTitle, participantId, currentUserId } = params
  if (participantId === currentUserId) throw new Error("Cannot start a conversation with yourself")

  // Find an existing conversation with the same contextId that has both users.
  const snap = await adminDb
    .collection("conversations")
    .where("contextId", "==", contextId)
    .get()
  for (const d of snap.docs) {
    const conv = toConversation(d.id, d.data() as ConversationDoc)
    if (conv.participants.includes(currentUserId) && conv.participants.includes(participantId)) {
      return conv
    }
  }
  // Create new
  const ts = nowIso()
  const ref = await adminDb.collection("conversations").add({
    participants: [currentUserId, participantId],
    contextType,
    contextId,
    contextTitle,
    lastMessage: "",
    lastMessageAt: ts,
    lastSenderId: null,
    createdAt: ts,
    updatedAt: ts,
  } as ConversationDoc)
  const created = await ref.get()
  return toConversation(ref.id, created.data() as ConversationDoc)
}

export async function getMessages(convId: string, userId: string): Promise<Message[]> {
  const conv = await getConversation(convId, userId)
  if (!conv) throw new Error("Conversation not found")
  const snap = await adminDb
    .collection("conversations")
    .doc(convId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .limit(200)
    .get()
  return snap.docs.map((d) => {
    const data = d.data() as MessageDoc
    return {
      id: d.id,
      conversationId: convId,
      senderId: data.senderId,
      senderName: data.senderName,
      content: data.content,
      read: data.read,
      createdAt: data.createdAt,
    }
  })
}

export async function sendMessage(params: {
  convId: string
  senderId: string
  senderName: string
  content: string
}): Promise<Message> {
  const { convId, senderId, senderName, content } = params
  const ts = nowIso()
  const msgRef = await adminDb
    .collection("conversations")
    .doc(convId)
    .collection("messages")
    .add({
      conversationId: convId,
      senderId,
      senderName,
      content,
      read: false,
      createdAt: ts,
    } as MessageDoc)
  // Update conversation snapshot
  await adminDb.collection("conversations").doc(convId).update({
    lastMessage: content,
    lastMessageAt: ts,
    lastSenderId: senderId,
    updatedAt: ts,
  })
  // Mark read for the sender + flip other-party's older messages to read.
  await markRead(convId, senderId)
  return {
    id: msgRef.id,
    conversationId: convId,
    senderId,
    senderName,
    content,
    read: false,
    createdAt: ts,
  }
}

export async function markRead(convId: string, userId: string): Promise<void> {
  // Mark all messages not sent by this user as read. (senderId !=, read ==)
  // would need a composite index; fetch by senderId != and filter read in memory.
  const snap = await adminDb
    .collection("conversations")
    .doc(convId)
    .collection("messages")
    .where("senderId", "!=", userId)
    .get()
  const batch = adminDb.batch()
  for (const d of snap.docs) {
    const data = d.data() as MessageDoc
    if (data.read === false) batch.update(d.ref, { read: true })
  }
  await batch.commit()
}

export async function getUnreadCount(userId: string): Promise<number> {
  const convs = await adminDb
    .collection("conversations")
    .where("participants", "array-contains", userId)
    .get()
  let total = 0
  for (const c of convs.docs) {
    total += await getConversationUnread(c.id, userId)
  }
  return total
}

// ── Storage (image uploads) ────────────────────────────────────────────────
// Uploads a buffer to Firebase Storage and returns a long-lived signed URL.
export async function uploadImageToStorage(params: {
  buffer: Buffer
  filename: string
  contentType: string
  userId: string
}): Promise<string> {
  const { buffer, filename, contentType, userId } = params
  const path = `uploads/${userId}/${filename}`
  const file = adminBucket.file(path)
  await file.save(buffer, {
    metadata: { contentType },
    public: false,
  })
  // Long-lived signed URL (10 years) for reliable reads without making the
  // bucket public.
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
  })
  return url
}
