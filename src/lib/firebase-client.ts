"use client"

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth"

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

if (isFirebaseConfigured) {
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  _auth = getAuth(_app)
  _provider = new GoogleAuthProvider()
  // Always show the account chooser.
  _provider.setCustomParameters({ prompt: "select_account" })
}

export const firebaseApp = _app
export const firebaseAuth = _auth
export const googleProvider = _provider

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
