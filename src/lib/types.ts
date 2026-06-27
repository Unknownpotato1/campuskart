// Shared TypeScript types for CampusKart (mirror Prisma models).
// Subagents should import these instead of redefining.

export interface User {
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

export interface College {
  id: string
  name: string
  city: string
  state: string
  createdAt: string
}

export type ProductCategory =
  | "Books"
  | "Electronics"
  | "Lab Equipment"
  | "Furniture"
  | "Clothing"
  | "Other"

export type ProductCondition = "New" | "Like New" | "Good" | "Fair"
export type ProductStatus = "ACTIVE" | "SOLD"

export interface Product {
  id: string
  title: string
  description: string
  price: number
  images: string[] // parsed from JSON
  category: ProductCategory
  condition: ProductCondition
  sellerId: string
  sellerName: string
  collegeId: string | null
  collegeName: string | null
  status: ProductStatus
  bumpedAt: string
  createdAt: string
  updatedAt: string
}

// Raw product as stored (images as JSON string) — for API route internal use
export interface ProductRaw {
  id: string
  title: string
  description: string
  price: number
  images: string
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

export type WritingType = "NEED_WRITER" | "CAN_WRITE"
export type WritingStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED"

export interface WritingPost {
  id: string
  type: WritingType
  title: string
  subject: string
  description: string
  pageCount: number | null
  deadline: string | null
  pricePerPage: number
  totalPrice: number | null
  subjects: string[] // parsed from JSON (for CAN_WRITE)
  turnaround: string | null
  userId: string
  userName: string
  collegeId: string | null
  collegeName: string | null
  status: WritingStatus
  createdAt: string
  updatedAt: string
}

export interface WritingPostRaw {
  id: string
  type: string
  title: string
  subject: string
  description: string
  pageCount: number | null
  deadline: string | null
  pricePerPage: number
  totalPrice: number | null
  subjects: string
  turnaround: string | null
  userId: string
  userName: string
  collegeId: string | null
  collegeName: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export type ConversationContextType = "PRODUCT" | "WRITING"

export interface Conversation {
  id: string
  participants: string[] // parsed from JSON
  contextType: ConversationContextType
  contextId: string
  contextTitle: string
  lastMessage: string
  lastMessageAt: string
  lastSenderId: string | null
  createdAt: string
  updatedAt: string
}

export interface ConversationRaw {
  id: string
  participants: string
  contextType: string
  contextId: string
  contextTitle: string
  lastMessage: string
  lastMessageAt: string
  lastSenderId: string | null
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  content: string
  read: boolean
  createdAt: string
}

// Helper to parse a raw product (images JSON string -> array)
export function parseProduct(raw: ProductRaw): Product {
  let images: string[] = []
  try {
    images = JSON.parse(raw.images || "[]")
  } catch {
    images = []
  }
  return {
    ...raw,
    images,
    category: raw.category as ProductCategory,
    condition: raw.condition as ProductCondition,
    status: raw.status as ProductStatus,
  }
}

export function parseWritingPost(raw: WritingPostRaw): WritingPost {
  let subjects: string[] = []
  try {
    subjects = JSON.parse(raw.subjects || "[]")
  } catch {
    subjects = []
  }
  return {
    ...raw,
    subjects,
    type: raw.type as WritingType,
    status: raw.status as WritingStatus,
  }
}

export function parseConversation(raw: ConversationRaw): Conversation {
  let participants: string[] = []
  try {
    participants = JSON.parse(raw.participants || "[]")
  } catch {
    participants = []
  }
  return {
    ...raw,
    participants,
    contextType: raw.contextType as ConversationContextType,
  }
}
