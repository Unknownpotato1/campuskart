"use client"

import { Heart } from "lucide-react"
import { useNav } from "@/hooks/use-nav"

export function Footer() {
  const { navigate } = useNav()
  return (
    <footer className="mt-auto border-t border-border bg-card/50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 pb-28 sm:flex-row md:pb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <img src="/logo.png" alt="CampusKart" className="h-7 w-7 rounded-lg object-cover" />
          <span>
            <span className="font-semibold text-foreground">CampusKart</span> — buy, sell &amp; collaborate on campus.
          </span>
        </div>
        <div className="hidden items-center gap-4 text-xs text-muted-foreground md:flex">
          <button onClick={() => navigate("home")} className="hover:text-primary">Home</button>
          <button onClick={() => navigate("marketplace")} className="hover:text-primary">Marketplace</button>
          <button onClick={() => navigate("writing")} className="hover:text-primary">Writing Hub</button>
          <button onClick={() => navigate("chat")} className="hover:text-primary">Chats</button>
        </div>
        <p className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          Made with <Heart className="h-3 w-3 fill-primary text-primary" /> for students
        </p>
      </div>
    </footer>
  )
}
