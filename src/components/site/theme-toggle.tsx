"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  const toggle = () => {
    const isDark = document.documentElement.classList.contains("dark")
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggle} className="h-9 w-9">
      <Sun className="hidden h-4 w-4 dark:block" />
      <Moon className="block h-4 w-4 dark:hidden" />
    </Button>
  )
}
