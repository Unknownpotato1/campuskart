"use client"

import { motion } from "framer-motion"
import {
  ArrowRight,
  MessageCircle,
  PenLine,
  Store,
} from "lucide-react"
import { useNav, type View } from "@/hooks/use-nav"
import { useAuth } from "@/store/auth-store"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/* BannerSlideshow (now a single static banner image)                  */
/* ------------------------------------------------------------------ */

const BANNER_IMAGE =
  "https://raw.githubusercontent.com/Unknownpotato1/Storage-/main/file_00000000828471fab7919dfdb9a732b1.png"

export function BannerSlideshow() {
  return (
    <section
      aria-label="CampusKart banner"
      className="relative overflow-hidden rounded-3xl border border-border bg-card"
    >
      <div className="relative aspect-[16/7] sm:aspect-[16/6] lg:aspect-[16/5]">
        <img
          src={BANNER_IMAGE}
          alt="CampusKart"
          className="h-full w-full object-cover"
        />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* CategoryBoxes                                                       */
/* ------------------------------------------------------------------ */

interface CategoryBoxProps {
  title: string
  description: string
  icon: typeof Store
  accent: string
  iconBg: string
  onClick: () => void
}

function CategoryBox({
  title,
  description,
  icon: Icon,
  accent,
  iconBg,
  onClick,
}: CategoryBoxProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl border border-border p-5 text-left shadow-sm sm:p-6",
        accent
      )}
    >
      <div
        className={cn(
          "flex size-11 items-center justify-center rounded-xl text-white shadow-sm",
          iconBg
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="flex items-center gap-1.5">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <ArrowRight className="size-4 -translate-x-1 text-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.button>
  )
}

export function CategoryBoxes() {
  const { navigate } = useNav()

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CategoryBox
        title="Marketplace"
        description="Buy and sell books, electronics, lab gear, furniture and more with students near you."
        icon={Store}
        accent="bg-card"
        iconBg="bg-primary"
        onClick={() => navigate("marketplace")}
      />
      <CategoryBox
        title="Writing Hub"
        description="Need a writer or offering writing services? Post assignments and hire peers."
        icon={PenLine}
        accent="bg-card"
        iconBg="bg-emerald-600"
        onClick={() => navigate("writing")}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* QuickActions                                                        */
/* ------------------------------------------------------------------ */

interface QuickActionProps {
  label: string
  icon: typeof Store
  onClick: () => void
}

function QuickAction({ label, icon: Icon, onClick }: QuickActionProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-accent"
    >
      <Icon className="size-4 text-primary" />
      {label}
    </motion.button>
  )
}

export function QuickActions() {
  const { navigate } = useNav()
  const { user } = useAuth()

  const guard = (view: View, opts?: { extra?: Record<string, string> }) => {
    if (!user && (view === "chat" || view === "new-listing" || view === "new-writing")) {
      navigate("marketplace")
      return
    }
    navigate(view, opts)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <QuickAction
        label="Sell something"
        icon={Store}
        onClick={() => guard("new-listing")}
      />
      <QuickAction
        label="Request a writer"
        icon={PenLine}
        onClick={() => guard("new-writing", { extra: { type: "need" } })}
      />
      <QuickAction
        label="My chats"
        icon={MessageCircle}
        onClick={() => guard("chat")}
      />
    </div>
  )
}
