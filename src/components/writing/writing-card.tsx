"use client"

import { format, isPast, isToday } from "date-fns"
import {
  BookOpen,
  Building2,
  Calendar,
  Clock,
  FileText,
  IndianRupee,
  Loader2,
  MessageCircle,
  User as UserIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAuth } from "@/store/auth-store"
import { useState } from "react"
import type { WritingPost } from "@/lib/types"

interface WritingCardProps {
  post: WritingPost
  onChat?: () => void
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`

export function WritingCard({ post, onChat }: WritingCardProps) {
  const { user } = useAuth()
  const [chatLoading, setChatLoading] = useState(false)
  const isOwner = !!user && user.id === post.userId

  const isNeedWriter = post.type === "NEED_WRITER"

  async function handleChat() {
    if (!onChat) return
    setChatLoading(true)
    try {
      await onChat()
    } finally {
      // The parent will navigate away on success; reset only if still mounted.
      setChatLoading(false)
    }
  }

  // Deadline formatting + urgency
  const deadline = post.deadline ? new Date(post.deadline) : null
  const deadlineOverdue =
    deadline && isNeedWriter && post.status === "OPEN" && isPast(deadline) && !isToday(deadline)

  const statusStyles: Record<string, string> = {
    OPEN: "bg-primary/10 text-primary border-primary/30",
    IN_PROGRESS: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    COMPLETED: "bg-muted text-muted-foreground border-border",
  }
  const statusLabel: Record<string, string> = {
    OPEN: "Open",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      {/* Header: type + status badges */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge
          variant={isNeedWriter ? "default" : "secondary"}
          className={cn(
            isNeedWriter
              ? "border-transparent bg-primary/10 text-primary"
              : ""
          )}
        >
          {isNeedWriter ? "Need a Writer" : "Writer Available"}
        </Badge>
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
            statusStyles[post.status] || statusStyles.OPEN
          )}
        >
          {statusLabel[post.status] || post.status}
        </span>
        {isOwner && (
          <span className="ml-auto inline-flex items-center rounded-md border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
            Your post
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="line-clamp-1 text-lg font-semibold text-foreground">
        {post.title}
      </h3>

      {/* Subject */}
      <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <BookOpen className="size-3.5 shrink-0 text-primary/70" />
        <span className="truncate">{post.subject}</span>
      </div>

      {/* Description */}
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
        {post.description}
      </p>

      {/* Subjects list (CAN_WRITE) */}
      {!isNeedWriter && post.subjects.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.subjects.slice(0, 5).map((s, i) => (
            <span
              key={`${s}-${i}`}
              className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs text-foreground"
            >
              {s}
            </span>
          ))}
          {post.subjects.length > 5 && (
            <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs text-muted-foreground">
              +{post.subjects.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Info grid */}
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {isNeedWriter ? (
          <>
            <InfoItem
              icon={<FileText className="size-3.5" />}
              label="Pages"
              value={post.pageCount != null ? String(post.pageCount) : "—"}
            />
            <InfoItem
              icon={<Calendar className="size-3.5" />}
              label="Deadline"
              value={
                deadline ? format(deadline, "d MMM yyyy") : "—"
              }
              danger={!!deadlineOverdue}
            />
            <InfoItem
              icon={<IndianRupee className="size-3.5" />}
              label="Per page"
              value={inr(post.pricePerPage)}
            />
            <InfoItem
              icon={<IndianRupee className="size-3.5" />}
              label="Total"
              value={post.totalPrice != null ? inr(post.totalPrice) : "—"}
              emphasis
            />
          </>
        ) : (
          <>
            <InfoItem
              icon={<BookOpen className="size-3.5" />}
              label="Subjects"
              value={post.subjects.length > 0 ? `${post.subjects.length} listed` : "—"}
            />
            <InfoItem
              icon={<Clock className="size-3.5" />}
              label="Turnaround"
              value={post.turnaround || "—"}
            />
            <InfoItem
              icon={<IndianRupee className="size-3.5" />}
              label="Per page"
              value={inr(post.pricePerPage)}
              emphasis
            />
            <div className="col-span-2 flex items-start gap-1.5 rounded-md bg-primary/5 px-2 py-1.5 text-xs text-primary">
              <IndianRupee className="mt-0.5 size-3.5 shrink-0" />
              <span>Total depends on the assignment length — settle directly.</span>
            </div>
          </>
        )}
      </dl>

      {/* Footer: poster + action */}
      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <div className="min-w-0 flex items-center gap-2 text-xs text-muted-foreground">
          <UserIcon className="size-3.5 shrink-0" />
          <span className="truncate">{post.userName}</span>
          <span aria-hidden>·</span>
          <span className="flex min-w-0 items-center gap-1">
            <Building2 className="size-3 shrink-0 text-primary/70" />
            <span className="truncate">{post.collegeName || "Unknown college"}</span>
          </span>
        </div>

        {isOwner ? null : (
          <Button
            size="sm"
            onClick={handleChat}
            disabled={chatLoading}
            className="shrink-0 gap-1.5"
          >
            {chatLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageCircle className="size-4" />
            )}
            <span className="hidden sm:inline">
              {isNeedWriter ? "I'll Write This" : "Hire This Writer"}
            </span>
            <span className="sm:hidden">{isNeedWriter ? "Write" : "Hire"}</span>
          </Button>
        )}
      </div>
    </article>
  )
}

function InfoItem({
  icon,
  label,
  value,
  emphasis,
  danger,
}: {
  icon: React.ReactNode
  label: string
  value: string
  emphasis?: boolean
  danger?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        <span className="text-muted-foreground/80">{icon}</span>
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 truncate font-medium",
          emphasis ? "text-primary" : "text-foreground",
          danger && "text-destructive"
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  )
}
