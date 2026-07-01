"use client"

import { useEffect, useState } from "react"
import {
  Home,
  Store,
  PenLine,
  MessageCircle,
  User as UserIcon,
  Package,
  LogOut,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNav, type View } from "@/hooks/use-nav"
import { useAuth } from "@/store/auth-store"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { cn } from "@/lib/utils"

export function Header({ onSignIn }: { onSignIn: () => void }) {
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
  }, [user, view])

  const tabs: { key: View; label: string; icon: typeof Store }[] = [
    { key: "home", label: "Home", icon: Home },
    { key: "marketplace", label: "Marketplace", icon: Store },
    { key: "writing", label: "Writing Hub", icon: PenLine },
    { key: "chat", label: "My Chats", icon: MessageCircle },
  ]

  const initials = user?.name
    ? user.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()
    : "U"

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4">
        <button
          onClick={() => navigate("home")}
          className="flex items-center gap-2 shrink-0"
          aria-label="CampusKart home"
        >
          <img src="/logo.png" alt="CampusKart" className="h-9 w-9 rounded-xl object-cover" />
          <span className="text-lg font-bold tracking-tight">
            Campus<span className="text-primary">Kart</span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {tabs.map((tab) => {
            const isActive =
              view === tab.key ||
              (tab.key === "marketplace" && view === "product") ||
              (tab.key === "marketplace" && view === "new-listing")
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => navigate(tab.key)}
                className={cn(
                  "relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{tab.label}</span>
                {tab.key === "chat" && user && unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-full p-0.5 pr-2 transition hover:bg-accent" aria-label="User menu">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={user.photo || undefined} alt={user.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                  {user.collegeName && (
                    <span className="truncate text-xs font-normal text-muted-foreground">{user.collegeName}</span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("profile")}>
                  <UserIcon className="mr-2 h-4 w-4" /> My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("profile", { extra: { tab: "listings" } })}>
                  <Package className="mr-2 h-4 w-4" /> My Listings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await logout()
                    navigate("marketplace")
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={onSignIn} className="ml-1">
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}


