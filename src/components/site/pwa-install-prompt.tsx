"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Download, X, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "campuskart:pwa-prompt-date"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isMobile(): boolean {
  if (typeof window === "undefined" || !navigator) return false
  return /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent)
}

function isIos(): boolean {
  if (typeof window === "undefined" || !navigator) return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (typeof navigator !== "undefined" && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function shouldShowToday(): boolean {
  if (typeof window === "undefined") return false
  try {
    const last = window.localStorage.getItem(STORAGE_KEY)
    return last !== todayKey()
  } catch {
    return false
  }
}

function markShownToday(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, todayKey())
  } catch {
    /* ignore quota errors */
  }
}

export function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!isMobile() || isStandalone()) return
    if (!shouldShowToday()) return

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)

    // iOS never fires beforeinstallprompt — surface the card directly so the
    // user gets the "Add to Home Screen" instructions.
    let iosTimer: ReturnType<typeof setTimeout> | null = null
    if (isIos()) {
      iosTimer = setTimeout(() => setVisible(true), 1500)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      if (iosTimer) clearTimeout(iosTimer)
    }
  }, [])

  const handleInstall = async () => {
    if (deferred) {
      try {
        await deferred.prompt()
        await deferred.userChoice
      } catch {
        /* ignore */
      }
      setDeferred(null)
    }
    handleClose()
  }

  const handleClose = () => {
    setVisible(false)
    markShownToday()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-sm md:hidden"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="rounded-2xl border border-border bg-card p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Smartphone className="size-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold">Install CampusKart</h3>
                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Dismiss install prompt"
                    className="-mr-1 -mt-1 rounded-full p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Add CampusKart to your home screen for a faster, app-like experience.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" onClick={handleInstall} className="gap-1.5">
                    <Download className="size-3.5" />
                    Install
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleClose}>
                    Not now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
