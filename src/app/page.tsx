"use client"

import { Suspense, useEffect, useState } from "react"
import { useAuth } from "@/store/auth-store"
import { useNav } from "@/hooks/use-nav"
import { Header } from "@/components/site/header"
import { Footer } from "@/components/site/footer"
import { AuthModal } from "@/components/site/auth-modal"
import { OnboardingModal } from "@/components/site/onboarding-modal"
import { LoadingMarketplace, ViewRouter } from "@/components/view-router"

export default function Home() {
  return (
    <Suspense fallback={<LoadingMarketplace />}>
      <Shell />
    </Suspense>
  )
}

function Shell() {
  const { user, loading, fetchUser } = useAuth()
  const { view, navigate } = useNav()
  const [authOpen, setAuthOpen] = useState(false)

  // Fetch the current user once on mount.
  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // A view that requires a logged-in user when there is none.
  const requiresAuth =
    (view === "new-listing" || view === "new-writing" || view === "chat" || view === "profile") && !user

  // Derive modal open states during render (no setState-in-effect).
  const authModalOpen = authOpen || requiresAuth
  const onboardingOpen = Boolean(user && !user.onboarded)

  if (loading) return <LoadingMarketplace />

  return (
    <div className="flex min-h-screen flex-col">
      <Header onSignIn={() => setAuthOpen(true)} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-6">
          <ViewRouter />
        </div>
      </main>
      <Footer />
      <AuthModal
        open={authModalOpen}
        onOpenChange={(open) => {
          // If the modal was force-opened by a protected route and the user
          // dismisses it, send them back to the marketplace instead of
          // leaving them on an auth-gated view.
          if (!open && requiresAuth) {
            navigate("marketplace")
          }
          setAuthOpen(open)
        }}
      />
      {user && (
        <OnboardingModal open={onboardingOpen} onOpenChange={() => {}} dismissable={false} />
      )}
    </div>
  )
}
