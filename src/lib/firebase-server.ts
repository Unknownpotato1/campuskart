import type { App } from "firebase-admin/app"
import type { Firestore } from "firebase-admin/firestore"
import type { Auth } from "firebase-admin/auth"

// `Bucket` type isn't exported directly; derive it lazily.
type Bucket = ReturnType<
  ReturnType<typeof import("firebase-admin/storage")["getStorage"]>["bucket"]
>

// Server-side Firebase Admin access (Firestore + Storage + Auth).
// Requires a service account JSON in the FIREBASE_SERVICE_ACCOUNT env var.
// Generate one at:
//   Firebase Console → Project Settings → Service accounts → Generate new private key
//
// IMPORTANT: firebase-admin is loaded LAZILY (only when a route actually
// calls getAdminDb/getAdminBucket/getAdminAuth). This avoids bundling the
// Admin SDK (and its Node-only deps) into routes that don't need it, and it
// keeps the serverless cold-start from crashing on Vercel.

interface ServiceAccountJson {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  auth_uri: string
  token_uri: string
  auth_provider_x509_cert_url: string
  client_x509_cert_url: string
}

function getServiceAccount(): ServiceAccountJson | undefined {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as ServiceAccountJson
  } catch (e) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", e)
    return undefined
  }
}

export const isFirebaseAdminConfigured = Boolean(getServiceAccount())

const globalForFirebase = globalThis as unknown as {
  __adminApp?: App
  __adminDb?: Firestore
  __adminBucket?: Bucket
  __adminAuth?: Auth
}

function initAdmin() {
  if (globalForFirebase.__adminApp) return
  const sa = getServiceAccount()
  if (!sa) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT (JSON) in .env. " +
        "Generate one at Firebase Console → Project Settings → Service accounts → Generate new private key."
    )
  }
  // Lazy-load firebase-admin only when actually initializing. Using require()
  // (not static import) keeps the Admin SDK out of the client bundle and out
  // of API routes that don't use Firestore — critical for Vercel cold starts.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { initializeApp, cert, getApps, getApp } = require("firebase-admin/app")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFirestore } = require("firebase-admin/firestore")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getStorage } = require("firebase-admin/storage")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getAuth } = require("firebase-admin/auth")

  const app = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId: sa.project_id,
          clientEmail: sa.client_email,
          privateKey: sa.private_key,
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      })
  globalForFirebase.__adminApp = app
  globalForFirebase.__adminDb = getFirestore(app)
  globalForFirebase.__adminBucket = getStorage(app).bucket()
  globalForFirebase.__adminAuth = getAuth(app)
}

// Lazy getters — firebase-admin is only loaded when a route uses these.
export function getAdminDb(): Firestore {
  initAdmin()
  return globalForFirebase.__adminDb!
}
export function getAdminBucket(): Bucket {
  initAdmin()
  return globalForFirebase.__adminBucket!
}
export function getAdminAuth(): Auth {
  initAdmin()
  return globalForFirebase.__adminAuth!
}

// Backwards-compatible exports (lazy): these are getters so accessing them
// triggers init. Most code should use getAdminDb() etc. instead.
export const adminDb = new Proxy({} as Firestore, {
  get(_t, prop) {
    return Reflect.get(getAdminDb() as object, prop)
  },
})
export const adminBucket = new Proxy({} as Bucket, {
  get(_t, prop) {
    return Reflect.get(getAdminBucket() as object, prop)
  },
})
export const adminAuth = new Proxy({} as Auth, {
  get(_t, prop) {
    return Reflect.get(getAdminAuth() as object, prop)
  },
})

export type { Bucket }
