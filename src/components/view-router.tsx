"use client"

import { useNav } from "@/hooks/use-nav"
import { HomeView } from "@/components/marketplace/home-view"
import { MarketplaceView } from "@/components/marketplace/marketplace-view"
import { ProductDetailView } from "@/components/marketplace/product-detail-view"
import { NewListingForm } from "@/components/marketplace/new-listing-form"
import { WritingView } from "@/components/writing/writing-view"
import { NewWritingForm } from "@/components/writing/new-writing-form"
import { ChatView } from "@/components/chat/chat-view"
import { ProfileView } from "@/components/profile/profile-view"
import { ProductGridSkeleton } from "@/components/shared/loading-skeletons"
import { motion, AnimatePresence } from "framer-motion"

export function LoadingMarketplace() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="h-16 border-b border-border bg-background" />
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <ProductGridSkeleton />
      </div>
    </div>
  )
}

export function ViewRouter() {
  const { view } = useNav()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        {renderView(view)}
      </motion.div>
    </AnimatePresence>
  )
}

function renderView(view: string) {
  switch (view) {
    case "home":
      return <HomeView />
    case "marketplace":
      return <MarketplaceView />
    case "product":
      return <ProductDetailView />
    case "new-listing":
      return <NewListingForm />
    case "writing":
      return <WritingView />
    case "new-writing":
      return <NewWritingForm />
    case "chat":
      return <ChatView />
    case "profile":
      return <ProfileView />
    default:
      return <HomeView />
  }
}
