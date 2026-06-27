import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose"

// Verify a Firebase ID token using Google's public JWKS — no service account
// required. Only the Firebase *project ID* (already in NEXT_PUBLIC_*) is
// needed to validate the issuer + audience.
//
// Docs: https://firebase.google.com/docs/auth/admin/verify-id-tokens
// Firebase ID tokens are JWTs issued by  securetoken@system.gserviceaccount.com
// and signed with keys published at the Google JWKS endpoint below.

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/metadata/jwk/securetoken@system.gserviceaccount.com")
)

export interface VerifiedFirebaseUser {
  uid: string
  email: string | null
  name: string | null
  photo: string | null
  emailVerified: boolean
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser | null> {
  if (!FIREBASE_PROJECT_ID) return null
  try {
    const { payload }: { payload: JWTPayload } = await jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    })

    return {
      uid: String(payload.sub || ""),
      email: (payload.email as string) ?? null,
      name: (payload.name as string) ?? null,
      photo: (payload.picture as string) ?? null,
      emailVerified: Boolean(payload.email_verified),
    }
  } catch (err) {
    console.error("Firebase token verification failed:", err)
    return null
  }
}
