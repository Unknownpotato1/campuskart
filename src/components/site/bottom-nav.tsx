"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Home, MessageCircle, Search, User as UserIcon } from "lucide-react"
import { useNav } from "@/hooks/use-nav"
import { useAuth } from "@/store/auth-store"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface NavItem {
  key: string
  label: string
  icon: typeof Home
  match: string[]
  onClick: () => void
}

export function BottomNav() {
  const { view, navigate } = useNav()
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  // Poll unread count every 15s while logged in. We avoid calling
  // `setUnread(0)` synchronously inside the effect (ESLint rule). The
  // badge is gated on `user` in render so logged-out users never see it.
  useEffect(() => {
    if (!user) return
    let active = true
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/conversations/unread")
        const data = await res.json()
        if (active) setUnread(data.count || 0)
      } catch {
        /* ignore transient errors */
      }
    }
    fetchUnread()
    const t = setInterval(fetchUnread, 15000)
    return () => {
      active = false
      clearInterval(t)
    }
  }, [user])

  const handleSearch = () => {
    if (view !== "marketplace") {
      navigate("marketplace")
      // Wait for the marketplace view to mount, then focus the search input.
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("campuskart:focus-search"))
      }, 500)
    } else {
      window.dispatchEvent(new CustomEvent("campuskart:focus-search"))
    }
  }

  const items: NavItem[] = [
    {
      key: "home",
      label: "Home",
      icon: Home,
      match: ["home"],
      onClick: () => navigate("home"),
    },
    {
      key: "inbox",
      label: "Inbox",
      icon: MessageCircle,
      match: ["chat"],
      onClick: () => navigate(user ? "chat" : "marketplace"),
    },
    {
      key: "search",
      label: "Search",
      icon: Search,
      match: [],
      onClick: handleSearch,
    },
    {
      key: "profile",
      label: "Profile",
      icon: UserIcon,
      match: ["profile", "new-listing", "new-writing", "edit-listing"],
      onClick: () => navigate(user ? "profile" : "marketplace"),
    },
  ]

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U"

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-md px-3 pb-2">
        <nav
          aria-label="Primary"
          className="flex items-center justify-around rounded-2xl border border-border bg-background/80 px-2 py-1.5 shadow-lg backdrop-blur-xl"
        >
          {items.map((item) => {
            const isActive = item.match.includes(view)
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className="relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5"
              >
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                      : "text-muted-foreground"
                  )}
                >
                  {item.key === "profile" && user ? (
                    <Avatar className="size-6 border-0">
                      <AvatarImage src={user.photo || undefined} alt={user.name} />
                      <AvatarFallback className="bg-transparent text-[10px] font-semibold text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Icon className="size-5" />
                  )}
                </motion.span>
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
                {item.label === "Inbox" && user && unread > 0 && (
                  <span className="absolute right-3 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
