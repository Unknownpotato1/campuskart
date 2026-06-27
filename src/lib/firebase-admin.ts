import { getAdminAuth } from "@/lib/firebase-server"

// Verify a Firebase ID token using firebase-admin's official verifyIdToken.
// This requires the service account (FIREBASE_SERVICE_ACCOUNT env var), but
// it's the canonical, supported approach and avoids the jose/jwks-rsa CJS-ESM
// conflict that breaks on Vercel's Node runtime.
//
// Docs: https://firebase.google.com/docs/auth/admin/verify-id-tokens

export interface VerifiedFirebaseUser {
  uid: string
  email: string | null
  name: string | null
  photo: string | null
  emailVerified: boolean
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser | null> {
  try {
    const auth = getAdminAuth()
    const decoded = await auth.verifyIdToken(idToken)
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: (decoded.name as string) ?? null,
      photo: (decoded.picture as string) ?? null,
      emailVerified: Boolean(decoded.email_verified),
    }
  } catch (err) {
    console.error("Firebase token verification failed:", err)
    return null
  }
}
