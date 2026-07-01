"use client"

import { useState } from "react"
import { Menu as MenuIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNav, type View } from "@/hooks/use-nav"
import { MenuSheet } from "@/components/site/menu-sheet"
import { SettingsDialog } from "@/components/site/settings-dialog"
import { cn } from "@/lib/utils"

export function Header({ onSignIn }: { onSignIn: () => void }) {
  const { view, navigate } = useNav()
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const tabs: { key: View; label: string }[] = [
    { key: "home", label: "Home" },
    { key: "marketplace", label: "Marketplace" },
    { key: "writing", label: "Writing Hub" },
    { key: "chat", label: "My Chats" },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4">
          <button
            onClick={() => navigate("home")}
            className="flex items-center gap-2 shrink-0"
            aria-label="CampusKart home"
          >
            <img
              src="/logo.png"
              alt="CampusKart"
              className="h-9 w-9 rounded-xl object-cover"
            />
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
              return (
                <button
                  key={tab.key}
                  onClick={() => navigate(tab.key)}
                  className={cn(
                    "relative rounded-lg px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="h-9 w-9"
            >
              <MenuIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <MenuSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        onOpenSettings={() => setSettingsOpen(true)}
        onSignIn={onSignIn}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
