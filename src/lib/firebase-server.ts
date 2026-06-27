import { initializeApp, cert, getApps, getApp, type App } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { getStorage } from "firebase-admin/storage"
import { getAuth, type Auth } from "firebase-admin/auth"

// `Bucket` type isn't exported directly; derive it from the runtime value.
type Bucket = ReturnType<ReturnType<typeof getStorage>["bucket"]>

// Server-side Firebase Admin access (Firestore + Storage + Auth).
// Requires a service account JSON in the FIREBASE_SERVICE_ACCOUNT env var.
// Generate one at:
//   Firebase Console → Project Settings → Service accounts → Generate new private key

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

initAdmin()

export const adminApp = globalForFirebase.__adminApp!
export const adminDb = globalForFirebase.__adminDb!
export const adminBucket = globalForFirebase.__adminBucket!
export const adminAuth = globalForFirebase.__adminAuth!

export type { Bucket }
