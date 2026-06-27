"use client"

import { GraduationCap, Heart } from "lucide-react"
import { useNav } from "@/hooks/use-nav"

export function Footer() {
  const { navigate } = useNav()
  return (
    <footer className="mt-auto border-t border-border bg-card/50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span>
            <span className="font-semibold text-foreground">CampusKart</span> — buy, sell &amp; collaborate on campus.
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <button onClick={() => navigate("marketplace")} className="hover:text-primary">Marketplace</button>
          <button onClick={() => navigate("writing")} className="hover:text-primary">Writing Hub</button>
          <button onClick={() => navigate("chat")} className="hover:text-primary">Chats</button>
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          Made with <Heart className="h-3 w-3 fill-primary text-primary" /> for students
        </p>
      </div>
    </footer>
  )
}
