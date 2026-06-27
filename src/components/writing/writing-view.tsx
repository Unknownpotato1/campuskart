"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Calendar,
  ChevronDown,
  Info,
  Loader2,
  PenLine,
  Plus,
  Search,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CollegeSelect } from "@/components/site/college-select"
import { EmptyState } from "@/components/shared/empty-state"
import { WritingListSkeleton } from "@/components/shared/loading-skeletons"
import { WritingCard } from "./writing-card"
import { useNav } from "@/hooks/use-nav"
import { useAuth } from "@/store/auth-store"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { WritingPost } from "@/lib/types"

type TabType = "NEED_WRITER" | "CAN_WRITE"

export function WritingView() {
  const { navigate } = useNav()
  const { user } = useAuth()
  const { toast } = useToast()

  const [tab, setTab] = useState<TabType>("NEED_WRITER")
  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [subject, setSubject] = useState("")
  const [debouncedSubject, setDebouncedSubject] = useState("")
  const [deadline, setDeadline] = useState<string>("") // ISO date input

  const [posts, setPosts] = useState<WritingPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reqIdRef = useRef(0)

  // Debounce subject search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSubject(subject.trim()), 350)
    return () => clearTimeout(t)
  }, [subject])

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams()
    params.set("type", tab)
    if (collegeId) params.set("collegeId", collegeId)
    if (debouncedSubject) params.set("subject", debouncedSubject)
    if (deadline && tab === "NEED_WRITER") params.set("deadline", deadline)
    return params.toString()
  }, [tab, collegeId, debouncedSubject, deadline])

  useEffect(() => {
    const id = ++reqIdRef.current
    setLoading(true)
    setError(null)
    setPosts([])

    fetch(`/api/writing?${buildQuery()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load posts")
        const data = await r.json()
        if (id !== reqIdRef.current) return
        setPosts(data.posts || [])
      })
      .catch((e) => {
        if (id !== reqIdRef.current) return
        setError(e instanceof Error ? e.message : "Failed to load posts")
      })
      .finally(() => {
        if (id === reqIdRef.current) setLoading(false)
      })
  }, [buildQuery])

  // Group by same-college vs others when no college filter is active
  const { sameCollege, otherColleges, groupByCollege } = useMemo(() => {
    if (collegeId) {
      return { sameCollege: posts, otherColleges: [], groupByCollege: false }
    }
    const same: WritingPost[] = []
    const others: WritingPost[] = []
    for (const p of posts) {
      if (user?.collegeId && p.collegeId === user.collegeId) same.push(p)
      else others.push(p)
    }
    return { sameCollege: same, otherColleges: others, groupByCollege: true }
  }, [posts, collegeId, user?.collegeId])

  async function handleChat(post: WritingPost) {
    if (!user) {
      toast({ title: "Please sign in to start a chat.", variant: "destructive" })
      return
    }
    try {
      const r = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextType: "WRITING",
          contextId: post.id,
          contextTitle: post.title,
          participantId: post.userId,
        }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.error || "Could not start chat")
      }
      const data = await r.json()
      const conv = data.conversation || data
      navigate("chat", { conv: conv.id })
    } catch (e) {
      toast({
        title: "Chat unavailable",
        description: e instanceof Error ? e.message : "Try again later.",
        variant: "destructive",
      })
      throw e
    }
  }

  const showEmpty = !loading && posts.length === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Writing Hub
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find a writer for your assignments, or offer your writing skills to classmates.
          </p>
        </div>
        <PostButton onPick={(t) => navigate("new-writing", { extra: { type: t } })} />
      </div>

      {/* Payment info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-foreground/90">
          <span className="font-semibold text-primary">Payment note:</span>{" "}
          Payment is to be settled directly between students. CampusKart only helps you
          connect — it does not handle or guarantee any transactions.
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabType)}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="NEED_WRITER" className="gap-1.5">
            <PenLine className="size-4" />
            Need a Writer
          </TabsTrigger>
          <TabsTrigger value="CAN_WRITE" className="gap-1.5">
            <UserCheck className="size-4" />
            Writers Available
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Search by subject or title..."
                className="pl-9"
                aria-label="Search by subject"
              />
              {subject && (
                <button
                  type="button"
                  onClick={() => setSubject("")}
                  aria-label="Clear subject search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:flex lg:items-center">
              {tab === "NEED_WRITER" && (
                <DeadlineFilter value={deadline} onChange={setDeadline} />
              )}
              <div className={cn("lg:w-[240px]", tab === "NEED_WRITER" ? "col-span-2 sm:col-span-1" : "col-span-2")}>
                <CollegeSelect
                  value={collegeId}
                  onChange={(id) => setCollegeId(id)}
                  placeholder="All colleges"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mt-5"
          >
            {loading ? (
              <WritingListSkeleton count={4} />
            ) : error ? (
              <EmptyState
                icon={<Sparkles className="size-7" />}
                title="Something went wrong"
                description={error}
                action={
                  <Button onClick={() => window.location.reload()} variant="outline">
                    Retry
                  </Button>
                }
              />
            ) : showEmpty ? (
              <EmptyState
                icon={
                  tab === "NEED_WRITER" ? (
                    <PenLine className="size-7" />
                  ) : (
                    <UserCheck className="size-7" />
                  )
                }
                title={
                  tab === "NEED_WRITER"
                    ? "No writing requests yet"
                    : "No writers available yet"
                }
                description={
                  tab === "NEED_WRITER"
                    ? "Be the first to post a writing request, or adjust your filters."
                    : "No writers match your filters — try clearing them, or offer your own writing skills."
                }
                action={
                  <Button
                    onClick={() =>
                      navigate("new-writing", {
                        extra: { type: tab === "NEED_WRITER" ? "need" : "writer" },
                      })
                    }
                    className="gap-2"
                  >
                    <Plus className="size-4" />
                    {tab === "NEED_WRITER" ? "Request a writer" : "Offer your writing"}
                  </Button>
                }
              />
            ) : (
              <div className="space-y-8">
                {groupByCollege && sameCollege.length > 0 && (
                  <PostSection
                    title={user?.collegeName ? `From ${user.collegeName}` : "From your college"}
                    posts={sameCollege}
                    onChat={handleChat}
                  />
                )}
                {groupByCollege && otherColleges.length > 0 && (
                  <PostSection
                    title="From other colleges"
                    posts={otherColleges}
                    onChat={handleChat}
                  />
                )}
                {!groupByCollege && posts.length > 0 && (
                  <PostSection title={null} posts={posts} onChat={handleChat} />
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  )
}

function PostSection({
  title,
  posts,
  onChat,
}: {
  title: string | null
  posts: WritingPost[]
  onChat: (post: WritingPost) => Promise<void>
}) {
  return (
    <section>
      {title && (
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {posts.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            whileHover={{ y: -4 }}
          >
            <WritingCard post={p} onChat={() => onChat(p)} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function PostButton({ onPick }: { onPick: (t: "need" | "writer") => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2 self-start sm:self-auto">
          <Plus className="size-4" />
          Post
          <ChevronDown className="size-4 opacity-80" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>What would you like to post?</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onPick("need")}
          className="cursor-pointer gap-2"
        >
          <PenLine className="size-4 text-primary" />
          <div className="flex flex-col">
            <span>I need a writer</span>
            <span className="text-xs text-muted-foreground">
              Post an assignment you need help with
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onPick("writer")}
          className="cursor-pointer gap-2"
        >
          <UserCheck className="size-4 text-primary" />
          <div className="flex flex-col">
            <span>I&apos;m a writer</span>
            <span className="text-xs text-muted-foreground">
              Offer your writing services
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DeadlineFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Select
      value={value || "any"}
      onValueChange={(v) => onChange(v === "any" ? "" : v)}
    >
      <SelectTrigger className="w-full lg:w-[180px]" aria-label="Filter by deadline">
        <Calendar className="mr-1 size-4 text-muted-foreground" />
        <SelectValue placeholder="Any deadline" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="any">Any deadline</SelectItem>
        <SelectItem value={isoDaysFromNow(3)}>Within 3 days</SelectItem>
        <SelectItem value={isoDaysFromNow(7)}>Within 7 days</SelectItem>
        <SelectItem value={isoDaysFromNow(14)}>Within 14 days</SelectItem>
        <SelectItem value={isoDaysFromNow(30)}>Within 30 days</SelectItem>
      </SelectContent>
    </Select>
  )
}

function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// Loading export for the view-router fallback (optional reuse)
export function WritingLoading() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="mr-2 size-5 animate-spin" />
      Loading Writing Hub…
    </div>
  )
}
