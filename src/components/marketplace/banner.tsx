"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
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
/* BannerSlideshow                                                     */
/* ------------------------------------------------------------------ */

interface Slide {
  image: string
  title: string
  subtitle: string
  cta: { label: string; view: View }
  accent: string
}

const SLIDES: Slide[] = [
  {
    image:
      "https://raw.githubusercontent.com/Unknownpotato1/Storage-/main/file_00000000828471fab7919dfdb9a732b1.png",
    title: "Buy & sell with students on your campus",
    subtitle:
      "Books, electronics, lab gear and more — at student-friendly prices.",
    cta: { label: "Browse marketplace", view: "marketplace" },
    accent: "from-primary/90 to-primary/60",
  },
  {
    image: "/banners/banner2.png",
    title: "Need a writer? Find one in your college",
    subtitle: "Post your assignment, set your budget, hire a peer writer.",
    cta: { label: "Open Writing Hub", view: "writing" },
    accent: "from-emerald-600/90 to-teal-500/60",
  },
  {
    image: "/banners/banner3.png",
    title: "Chat in real time with sellers & writers",
    subtitle: "Every conversation is tied to a listing for context.",
    cta: { label: "View my chats", view: "chat" },
    accent: "from-green-600/90 to-emerald-500/60",
  },
]

export function BannerSlideshow() {
  const { navigate } = useNav()
  const { user } = useAuth()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length)
    }, 5000)
    return () => clearInterval(t)
  }, [paused])

  const slide = SLIDES[index]

  const handleCta = (view: View) => {
    if (!user && (view === "chat" || view === "new-listing")) {
      navigate("marketplace")
      return
    }
    navigate(view)
  }

  return (
    <section
      aria-label="Featured banners"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative overflow-hidden rounded-3xl border border-border bg-card"
    >
      <div className="relative aspect-[16/7] sm:aspect-[16/6] lg:aspect-[16/5]">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <img
              src={slide.image}
              alt=""
              className="h-full w-full object-cover"
            />
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-tr mix-blend-multiply",
                slide.accent
              )}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

            <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 lg:p-10">
              <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <img src="/logo.png" alt="" className="size-3.5 rounded-sm object-cover" />
                CampusKart
              </div>
              <h2 className="max-w-2xl text-xl font-bold text-white sm:text-2xl lg:text-3xl">
                {slide.title}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">
                {slide.subtitle}
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => handleCta(slide.cta.view)}
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-foreground shadow-lg transition hover:bg-white/90"
                >
                  {slide.cta.label}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
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
