"use client"

import { useState } from "react"
import { useEffect } from "react"
import { useTheme } from "next-themes"
import {
  Palette,
  Info,
  LifeBuoy,
  Sun,
  Moon,
  Monitor,
  Github,
  MessageCircle,
  Shield,
  ExternalLink,
  Mail,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun, description: "Bright background, dark text" },
  { value: "dark", label: "Dark", icon: Moon, description: "Dim background, light text" },
  { value: "system", label: "System", icon: Monitor, description: "Follow device theme" },
] as const

const APP_VERSION = "1.0.0"

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-6 pb-4 pt-6">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Palette className="h-5 w-5 text-primary" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Manage your appearance, learn about CampusKart, and get help.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="w-full">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="appearance" className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Appearance</span>
              </TabsTrigger>
              <TabsTrigger value="about" className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">About</span>
              </TabsTrigger>
              <TabsTrigger value="help" className="flex items-center gap-1.5">
                <LifeBuoy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Help</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="appearance" className="m-0 px-6 pb-6 pt-4">
            <AppearanceTab />
          </TabsContent>

          <TabsContent value="about" className="m-0 px-6 pb-6 pt-4">
            <AboutTab />
          </TabsContent>

          <TabsContent value="help" className="m-0 px-6 pb-6 pt-4">
            <HelpTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- Appearance ---------- */

function AppearanceTab() {
  const { setTheme } = useTheme()
  const [current, setCurrent] = useState<string>("system")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Defer to next tick to avoid cascading renders during hydration.
    const id = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem("theme")
        setCurrent(stored || "system")
      } catch {
        setCurrent("system")
      }
      setMounted(true)
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  const handleSelect = (value: string) => {
    setCurrent(value)
    setTheme(value)
  }

  if (!mounted) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted" />
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Theme</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Choose how CampusKart looks. System follows your device preference.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon
          const isActive = current === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition",
                isActive
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40 hover:bg-accent"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{option.label}</div>
                <div className="text-[11px] text-muted-foreground">{option.description}</div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Tip:</span> Dark mode is
        easier on the eyes in low-light environments and saves battery on OLED
        screens.
      </div>
    </div>
  )
}

/* ---------- About ---------- */

function AboutTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <img
          src="/logo.png"
          alt="CampusKart"
          className="h-12 w-12 rounded-xl object-cover"
        />
        <div>
          <div className="text-base font-semibold">CampusKart</div>
          <div className="text-xs text-muted-foreground">Version {APP_VERSION}</div>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        CampusKart is a college marketplace where students buy, sell, and
        collaborate on campus. Find second-hand items, hire writers, or offer
        your services — all within your college community.
      </p>

      <div className="space-y-1.5">
        <SettingLink
          icon={Github}
          label="Source on GitHub"
          href="https://github.com/Unknownpotato1/campuskart"
          external
        />
        <SettingLink
          icon={ExternalLink}
          label="Open CampusKart"
          href="https://campuskart-seven.vercel.app"
          external
        />
        <SettingLink
          icon={Shield}
          label="Privacy & Data"
          href="mailto:campuskart@example.com"
        />
      </div>

      <div className="rounded-lg border border-border p-3 text-center text-xs text-muted-foreground">
        Made with care for students · {new Date().getFullYear()}
      </div>
    </div>
  )
}

/* ---------- Help ---------- */

function HelpTab() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Frequently Asked Questions
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Quick answers to common questions.
        </p>
      </div>

      <div className="space-y-2">
        <FaqItem
          question="How do I list an item for sale?"
          answer="Open the menu → Sell an Item. You can add photos, set a price, and pick a category. Listings are visible to students at your college."
        />
        <FaqItem
          question="Can I buy from students at other colleges?"
          answer="Listings are grouped by college so you see items from your own campus first, but you can still message sellers from other colleges."
        />
        <FaqItem
          question="How does chat work?"
          answer="Tap Message on any listing to start a private conversation. You can send text, images, and files. Messages load in real time."
        />
        <FaqItem
          question="How do I bump my listing?"
          answer="Open your listing and tap Bump. Listings can be bumped once every 24 hours to move them to the top of the feed."
        />
        <FaqItem
          question="How do I report a listing?"
          answer="Open the listing, tap Report, and choose a reason. Our team reviews reports promptly."
        />
      </div>

      <div className="border-t border-border pt-3">
        <h3 className="text-sm font-semibold text-foreground">Still need help?</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Reach out and we&apos;ll get back to you.
        </p>
        <div className="mt-2 space-y-1.5">
          <SettingLink
            icon={Mail}
            label="Email support"
            href="mailto:support@campuskart.app"
          />
          <SettingLink
            icon={MessageCircle}
            label="Report a problem"
            href="mailto:abuse@campuskart.app"
          />
        </div>
      </div>
    </div>
  )
}

/* ---------- helpers ---------- */

function SettingLink({
  icon: Icon,
  label,
  href,
  external,
}: {
  icon: typeof Github
  label: string
  href: string
  external?: boolean
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition hover:bg-accent"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
    </a>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-lg border border-border bg-card/50 p-3">
      <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-medium text-foreground marker:hidden">
        <span>{question}</span>
        <span className="text-muted-foreground transition group-open:rotate-45">+</span>
      </summary>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{answer}</p>
    </details>
  )
}
