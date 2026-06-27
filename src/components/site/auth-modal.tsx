"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, GraduationCap, User, AlertCircle } from "lucide-react"
import { useAuth } from "@/store/auth-store"
import { useToast } from "@/hooks/use-toast"
import { isFirebaseConfigured, signInWithGoogle } from "@/lib/firebase-client"

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Demo accounts — only used when Firebase is NOT configured (local testing).
const DEMO_ACCOUNTS = [
  { name: "Aarav Sharma", email: "aarav.sharma@student.integraluniversity.ac.in" },
  { name: "Priya Verma", email: "priya.verma@student.iitb.ac.in" },
  { name: "Rahul Khan", email: "rahul.khan@student.amu.ac.in" },
]

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { fetchUser } = useAuth()
  const { toast } = useToast()
  const [mode, setMode] = useState<"google" | "custom">("google")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const finishLogin = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || "Login failed")
    }
    await fetchUser()
  }

  const handleGoogleFirebase = async () => {
    setLoading(true)
    setError(null)
    try {
      const idToken = await signInWithGoogle()
      await finishLogin({ idToken })
      toast({ title: "Signed in", description: "Welcome to CampusKart!" })
      onOpenChange(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Google sign-in failed."
      // Firebase auth/popup-closed-by-user etc. — show inline, not a toast spam.
      if (msg.includes("popup") || msg.includes("cancelled")) {
        setError("Sign-in cancelled.")
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // Simulated login (demo accounts) — only available when Firebase is NOT set up.
  const handleSimulated = async (acc?: { name: string; email: string }) => {
    setLoading(true)
    setError(null)
    try {
      await finishLogin({
        name: acc?.name || name,
        email: acc?.email || email,
        photo: null,
      })
      toast({ title: "Signed in", description: "Welcome to CampusKart!" })
      onOpenChange(false)
      setName("")
      setEmail("")
      setMode("google")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <GraduationCap className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center text-2xl">Welcome to CampusKart</DialogTitle>
          <DialogDescription className="text-center">
            Buy, sell, and collaborate with students on your campus.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === "google" ? (
          <div className="space-y-4">
            {isFirebaseConfigured ? (
              /* ── Real Firebase Google Sign-In ── */
              <>
                <Button
                  type="button"
                  className="w-full"
                  size="lg"
                  onClick={handleGoogleFirebase}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <GoogleIcon className="mr-2 h-4 w-4" />
                  )}
                  Continue with Google
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Secure Google sign-in powered by Firebase.
                </p>
              </>
            ) : (
              /* ── Demo mode (Firebase not configured) ── */
              <>
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  <strong>Demo mode:</strong> Firebase isn&apos;t configured yet. Add the{" "}
                  <code className="rounded bg-amber-500/20 px-1">NEXT_PUBLIC_FIREBASE_*</code> keys to{" "}
                  <code className="rounded bg-amber-500/20 px-1">.env</code> to enable real Google login.
                </div>
                <Button
                  type="button"
                  className="w-full"
                  size="lg"
                  onClick={() => handleSimulated()}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                  Continue with Google (simulated)
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Quick demo accounts</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleSimulated(acc)}
                      disabled={loading}
                      className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary hover:bg-accent disabled:opacity-50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{acc.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{acc.email}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  <button
                    type="button"
                    className="underline hover:text-primary"
                    onClick={() => setMode("custom")}
                  >
                    Use a custom name &amp; email instead
                  </button>
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.ac.in"
              />
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => handleSimulated()}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GraduationCap className="mr-2 h-4 w-4" />}
              Continue
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              <button type="button" className="underline hover:text-primary" onClick={() => setMode("google")}>
                Back to Google sign-in
              </button>
            </p>
          </div>
        )}
        <p className="text-center text-[11px] text-muted-foreground">
          By continuing you agree to CampusKart&apos;s Terms &amp; campus guidelines.
        </p>
      </DialogContent>
    </Dialog>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}
