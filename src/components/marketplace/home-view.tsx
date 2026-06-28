"use client"

import { motion } from "framer-motion"
import { ArrowRight, MessageCircle, PenLine, Sparkles, Store } from "lucide-react"
import { useAuth } from "@/store/auth-store"
import { useNav, type View } from "@/hooks/use-nav"
import { BannerSlideshow, CategoryBoxes, QuickActions } from "./banner"
import { cn } from "@/lib/utils"

interface FeatureCardProps {
  title: string
  description: string
  icon: typeof Store
  iconBg: string
  onClick: () => void
}

function FeatureCard({ title, description, icon: Icon, iconBg, onClick }: FeatureCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:border-primary/40"
    >
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-xl text-white shadow-sm",
          iconBg
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="flex w-full items-center gap-1.5">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <ArrowRight className="ml-auto size-4 -translate-x-1 text-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.button>
  )
}

export function HomeView() {
  const { navigate } = useNav()
  const { user } = useAuth()

  const features: FeatureCardProps[] = [
    {
      title: "Marketplace",
      description:
        "Browse listings from your college first, then other colleges. Sell books, electronics, lab gear and more.",
      icon: Store,
      iconBg: "bg-primary",
      onClick: () => navigate("marketplace"),
    },
    {
      title: "Writing Hub",
      description:
        "Post assignments and find peer writers, or offer your writing services at a price per page.",
      icon: PenLine,
      iconBg: "bg-emerald-600",
      onClick: () => navigate("writing"),
    },
    {
      title: "Real-time Chat",
      description:
        "Every conversation is tied to a listing or writing post for instant context. Send texts, photos and files.",
      icon: MessageCircle,
      iconBg: "bg-green-600",
      onClick: () => navigate(user ? "chat" : "marketplace"),
    },
  ]

  return (
    <div className="space-y-8">
      <BannerSlideshow />

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Explore
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Jump into the CampusKart marketplace or the writing hub.
          </p>
        </div>
        <CategoryBoxes />
      </section>

      <QuickActions />

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Why CampusKart?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Built for students, by students — everything you need on campus in one place.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {!user && (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" />
                Get started
              </div>
              <h3 className="text-lg font-bold text-foreground sm:text-xl">
                Sign in to start buying, selling &amp; collaborating
              </h3>
              <p className="max-w-xl text-sm text-muted-foreground">
                A free student account lets you post listings, hire writers, chat in real
                time and manage everything from one profile.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
