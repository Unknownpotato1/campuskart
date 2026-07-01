"use client"

import { Suspense, useEffect, useState } from "react"
import { useAuth } from "@/store/auth-store"
import { useNav } from "@/hooks/use-nav"
import { Header } from "@/components/site/header"
import { Footer } from "@/components/site/footer"
import { BottomNav } from "@/components/site/bottom-nav"
import { AuthModal } from "@/components/site/auth-modal"
import { OnboardingModal } from "@/components/site/onboarding-modal"
import { PwaInstallPrompt } from "@/components/site/pwa-install-prompt"
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
  const { view, conv, navigate } = useNav()
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

  // Chat visibility logic: when the user is inside a conversation, hide the
  // header/footer/bottom-nav so the chat can use the full viewport.
  const isChatView = view === "chat"
  const isInConversation = isChatView && !!conv

  if (loading) return <LoadingMarketplace />

  return (
    <div className="flex min-h-screen flex-col">
      {!isInConversation && <Header onSignIn={() => setAuthOpen(true)} />}
      <main className="flex-1">
        {isChatView ? (
          <ViewRouter />
        ) : (
          <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-28 md:pb-6">
            <ViewRouter />
          </div>
        )}
      </main>
      {!isChatView && <Footer />}
      {!isInConversation && <BottomNav />}
      {!isInConversation && <PwaInstallPrompt />}
      <AuthModal
        open={authModalOpen}
        onOpenChange={(open) => {
          // If the modal was force-opened by a protected route and the user
          // dismisses it, send them back to the home view instead of leaving
          // them on an auth-gated view.
          if (!open && requiresAuth) {
            navigate("home")
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
