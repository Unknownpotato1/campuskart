"use client"

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth"
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
)

let _app: FirebaseApp | null = null
let _auth: Auth | null = null
let _provider: GoogleAuthProvider | null = null
let _db: Firestore | null = null

if (isFirebaseConfigured) {
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  _auth = getAuth(_app)
  _provider = new GoogleAuthProvider()
  _provider.setCustomParameters({ prompt: "select_account" })
  _db = getFirestore(_app)
}

export const firebaseApp = _app
export const firebaseAuth = _auth
export const googleProvider = _provider
export const clientDb = _db

export interface ClientMessage {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderPhoto?: string | null
  content: string
  type?: "text" | "image" | "file"
  attachment?: { url: string; type: "image" | "file"; name: string; size: number; contentType: string } | null
  read: boolean
  createdAt: string
}

/** Sign in with Google popup; returns a Firebase ID token. */
export async function signInWithGoogle(): Promise<string> {
  if (!_auth || !_provider) {
    throw new Error("Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* env vars.")
  }
  const { signInWithPopup } = await import("firebase/auth")
  const result = await signInWithPopup(_auth, _provider)
  return await result.user.getIdToken()
}

/** Sign out of the Firebase client session. */
export async function signOutFirebase(): Promise<void> {
  if (!_auth) return
  const { signOut } = await import("firebase/auth")
  await signOut(_auth)
}

/**
 * Subscribe to messages in a conversation in real time using Firestore
 * onSnapshot. Returns an unsubscribe function.
 */
export function subscribeToMessages(
  convId: string,
  onMessages: (messages: ClientMessage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!clientDb) {
    onError?.(new Error("Firestore not configured"))
    return () => {}
  }
  const q = query(
    collection(clientDb, "conversations", convId, "messages"),
    orderBy("createdAt", "asc")
  )
  return onSnapshot(
    q,
    (snap) => {
      const all = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>
        const createdAtRaw = data.createdAt
        let createdAt: string
        if (typeof createdAtRaw === "string") {
          createdAt = createdAtRaw
        } else if (createdAtRaw && typeof createdAtRaw === "object" && "toDate" in createdAtRaw) {
          // Firestore Timestamp
          createdAt = (createdAtRaw as { toDate: () => Date }).toDate().toISOString()
        } else {
          createdAt = new Date().toISOString()
        }
        const attachment = data.attachment as
          | { url?: string; type?: string; name?: string; size?: number; contentType?: string }
          | null
          | undefined
        const mappedAttachment = attachment
          ? {
              url: String(attachment.url),
              type: (attachment.type as "image" | "file") || "file",
              name: String(attachment.name),
              size: Number(attachment.size) || 0,
              contentType: String(attachment.contentType),
            }
          : null
        return {
          id: d.id,
          conversationId: convId,
          senderId: String(data.senderId ?? ""),
          senderName: String(data.senderName ?? ""),
          senderPhoto: (data.senderPhoto as string) ?? null,
          content: String(data.content ?? ""),
          type: (data.type as "text" | "image" | "file") || "text",
          attachment: mappedAttachment,
          read: Boolean(data.read),
          createdAt,
        }
      })
      // Keep only the last 200 to match the REST API behaviour.
      onMessages(all.slice(-200))
    },
    (err) => onError?.(err as Error)
  )
}

/**
 * Subscribe to the current user's conversations in real time as a "something
 * changed" trigger (the enriched list — with unread/otherName — is fetched
 * via the REST API on each change).
 */
export function subscribeToConversations(
  userId: string,
  onChange: () => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!clientDb) {
    onError?.(new Error("Firestore not configured"))
    return () => {}
  }
  const q = query(collection(clientDb, "conversations"), where("participants", "array-contains", userId))
  return onSnapshot(
    q,
    () => onChange(),
    (err) => onError?.(err as Error)
  )
}
