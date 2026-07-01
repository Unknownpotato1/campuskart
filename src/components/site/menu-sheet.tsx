"use client"

import { useEffect, useState } from "react"
import {
  Home,
  Store,
  PenLine,
  MessageCircle,
  User as UserIcon,
  Package,
  PlusCircle,
  FilePlus,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
  BookOpen,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useNav, type View } from "@/hooks/use-nav"
import { useAuth } from "@/store/auth-store"
import { cn } from "@/lib/utils"

interface MenuSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenSettings: () => void
  onSignIn: () => void
}

interface MenuSection {
  label: string
  items: MenuItem[]
}

interface MenuItem {
  key: string
  label: string
  icon: typeof Home
  onClick: () => void
  badge?: number
  destructive?: boolean
}

export function MenuSheet({
  open,
  onOpenChange,
  onOpenSettings,
  onSignIn,
}: MenuSheetProps) {
  const { view, navigate } = useNav()
  const { user, logout } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    let active = true
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/conversations/unread")
        const data = await res.json()
        if (active) setUnread(data.count || 0)
      } catch {
        /* ignore */
      }
    }
    fetchUnread()
    const t = setInterval(fetchUnread, 15000)
    return () => {
      active = false
      clearInterval(t)
    }
  }, [user, open])

  const close = () => onOpenChange(false)

  const go = (v: View, opts?: { extra?: Record<string, string> }) => {
    navigate(v, opts)
    close()
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U"

  const handleSignOut = async () => {
    close()
    await logout()
    navigate("marketplace")
  }

  const sections: MenuSection[] = [
    {
      label: "Browse",
      items: [
        {
          key: "home",
          label: "Home",
          icon: Home,
          onClick: () => go("home"),
        },
        {
          key: "marketplace",
          label: "Marketplace",
          icon: Store,
          onClick: () => go("marketplace"),
        },
        {
          key: "writing",
          label: "Writing Hub",
          icon: PenLine,
          onClick: () => go("writing"),
        },
        {
          key: "chat",
          label: "My Chats",
          icon: MessageCircle,
          onClick: () => go(user ? "chat" : "marketplace"),
          badge: user && unread > 0 ? (unread > 9 ? 9 : unread) : undefined,
        },
      ],
    },
    ...(user
      ? [
          {
            label: "Account",
            items: [
              {
                key: "profile",
                label: "My Profile",
                icon: UserIcon,
                onClick: () => go("profile"),
              },
              {
                key: "my-listings",
                label: "My Listings",
                icon: Package,
                onClick: () => go("profile", { extra: { tab: "listings" } }),
              },
              {
                key: "my-writing",
                label: "My Writing Posts",
                icon: BookOpen,
                onClick: () => go("profile", { extra: { tab: "writing" } }),
              },
            ],
          },
          {
            label: "Create",
            items: [
              {
                key: "new-listing",
                label: "Sell an Item",
                icon: PlusCircle,
                onClick: () => go("new-listing"),
              },
              {
                key: "new-writing",
                label: "Post Writing Service",
                icon: FilePlus,
                onClick: () => go("new-writing"),
              },
            ],
          },
        ]
      : []),
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 gap-0 p-0 sm:max-w-sm">
        {/* User card */}
        <SheetHeader className="gap-0 border-b border-border bg-gradient-to-br from-primary/10 to-transparent p-4 pb-4">
          <div className="flex items-center gap-3">
            {user ? (
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={user.photo || undefined} alt={user.name} />
                <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <UserIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-base font-semibold">
                {user ? user.name : "Welcome to CampusKart"}
              </SheetTitle>
              <SheetDescription className="truncate text-xs">
                {user
                  ? user.collegeName || user.email
                  : "Sign in to buy, sell & chat"}
              </SheetDescription>
            </div>
          </div>

          {!user && (
            <Button
              size="sm"
              className="mt-3 w-full"
              onClick={() => {
                close()
                onSignIn()
              }}
            >
              Sign in
            </Button>
          )}
        </SheetHeader>

        {/* Sections */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {sections.map((section) => (
            <div key={section.label} className="mb-3">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isMatchedView =
                    (item.key === "home" && view === "home") ||
                    (item.key === "marketplace" &&
                      (view === "marketplace" || view === "product")) ||
                    (item.key === "writing" && view === "writing") ||
                    (item.key === "chat" && view === "chat") ||
                    (item.key === "profile" && view === "profile")
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={item.onClick}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                        isMatchedView
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-accent"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                          {item.badge}+
                        </span>
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={() => {
              close()
              onOpenSettings()
            }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition hover:bg-accent"
          >
            <SettingsIcon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Settings</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
          </button>

          {user && (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-destructive transition hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Sign Out</span>
            </button>
          )}

          <div className="mt-2 px-3 pb-1 pt-2 text-center text-[10px] text-muted-foreground">
            CampusKart · v1.0.0
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
