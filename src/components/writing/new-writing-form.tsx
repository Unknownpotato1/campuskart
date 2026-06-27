"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  CalendarClock,
  FileText,
  IndianRupee,
  Loader2,
  PenLine,
  Sparkles,
  Tags,
  UserCheck,
  X,
} from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CollegeSelect } from "@/components/site/college-select"
import { useNav } from "@/hooks/use-nav"
import { useAuth } from "@/store/auth-store"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type FormType = "need" | "writer"

interface FieldErrors {
  title?: string
  subject?: string
  description?: string
  pageCount?: string
  deadline?: string
  pricePerPage?: string
  subjects?: string
  turnaround?: string
  college?: string
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`

export function NewWritingForm() {
  const { navigate, extra } = useNav()
  const { user } = useAuth()
  const { toast } = useToast()

  // Resolve the form type from `extra.type` (default to "need").
  const type: FormType = extra.type === "writer" ? "writer" : "need"
  const isNeed = type === "need"

  // Shared fields
  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [collegeId, setCollegeId] = useState<string | null>(user?.collegeId ?? null)
  const [collegeName, setCollegeName] = useState<string | null>(user?.collegeName ?? null)

  // NEED_WRITER fields
  const [pageCount, setPageCount] = useState("")
  const [deadline, setDeadline] = useState("")
  const [pricePerPageNeed, setPricePerPageNeed] = useState("8")

  // CAN_WRITE fields
  const [subjects, setSubjects] = useState<string[]>([])
  const [pricePerPageWriter, setPricePerPageWriter] = useState("10")
  const [turnaround, setTurnaround] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  // If the user logs in mid-session, auto-fill the college once.
  useEffect(() => {
    if (!collegeId && user?.collegeId) {
      setCollegeId(user.collegeId)
      setCollegeName(user.collegeName ?? null)
    }
  }, [user?.collegeId, collegeId])

  // Live total price for NEED_WRITER.
  const pages = parseFloat(pageCount)
  const pricePer = parseFloat(pricePerPageNeed)
  const totalPrice = useMemo(() => {
    if (isNaN(pages) || isNaN(pricePer)) return 0
    return Math.max(0, pages) * Math.max(0, pricePer)
  }, [pages, pricePer])

  function switchType(next: FormType) {
    if (next === type) return
    // Re-navigate with the new type. The URL is the source of truth, so
    // back/forward and refreshes all behave intuitively.
    navigate("new-writing", { extra: { type: next } })
  }

  function validate(): boolean {
    const next: FieldErrors = {}
    if (!title.trim()) next.title = "Title is required"
    if (!subject.trim()) next.subject = "Subject is required"
    if (!description.trim()) next.description = "Description is required"
    if (!collegeId) next.college = "Please pick a college"

    if (isNeed) {
      if (isNaN(pages) || pages <= 0) next.pageCount = "Enter a positive page count"
      if (!deadline) next.deadline = "Deadline is required"
      else {
        const d = new Date(deadline)
        if (isNaN(d.getTime())) next.deadline = "Invalid date"
        else if (isPastToday(d)) next.deadline = "Deadline must be today or later"
      }
      if (isNaN(pricePer) || pricePer < 0) next.pricePerPage = "Enter a valid price"
    } else {
      if (subjects.length === 0) next.subjects = "Add at least one subject"
      const p = parseFloat(pricePerPageWriter)
      if (isNaN(p) || p < 0) next.pricePerPage = "Enter a valid price"
      if (!turnaround.trim()) next.turnaround = "Tell students your turnaround time"
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      toast({ title: "Please sign in to post.", variant: "destructive" })
      return
    }
    if (!validate()) {
      toast({ title: "Please fix the highlighted fields.", variant: "destructive" })
      return
    }
    setSubmitting(true)

    const basePayload = {
      title: title.trim(),
      subject: subject.trim(),
      description: description.trim(),
      collegeId,
      collegeName,
    }

    const payload =
      isNeed
        ? {
            ...basePayload,
            type: "NEED_WRITER" as const,
            pageCount: pages,
            deadline,
            pricePerPage: pricePer,
          }
        : {
            ...basePayload,
            type: "CAN_WRITE" as const,
            // Store the primary subject inside the subjects array too so
            // searches on the JSON `subjects` string match it.
            subjects: Array.from(new Set([subject.trim(), ...subjects])),
            pricePerPage: parseFloat(pricePerPageWriter),
            turnaround: turnaround.trim(),
          }

    try {
      const r = await fetch("/api/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.error || "Failed to post")
      }
      toast({
        title: "Post created!",
        description: isNeed
          ? "Your writing request is now live."
          : "Writers can now find you in the Writing Hub.",
      })
      navigate("writing")
    } catch (e) {
      toast({
        title: "Could not create post",
        description: e instanceof Error ? e.message : "Try again later.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back / cancel */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("writing")}
        className="-ml-2 mb-3 gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Cancel
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Post in the Writing Hub</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose whether you need a writer or want to offer your writing skills.
            </p>
          </CardHeader>

          {/* Type toggle */}
          <div className="px-6">
            <div
              role="tablist"
              aria-label="Post type"
              className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-1"
            >
              <TypeToggle
                active={isNeed}
                onClick={() => switchType("need")}
                icon={<PenLine className="size-4" />}
                label="I need a writer"
                description="Get help with an assignment"
              />
              <TypeToggle
                active={!isNeed}
                onClick={() => switchType("writer")}
                icon={<UserCheck className="size-4" />}
                label="I'm a writer"
                description="Offer your writing services"
              />
            </div>
          </div>

          <CardContent className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    isNeed
                      ? "e.g. Chemistry Lab Manual write-up"
                      : "e.g. Engineering & science assignment writer"
                  }
                  maxLength={120}
                  aria-invalid={!!errors.title}
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
              </div>

              {/* Subject (shared) */}
              <div className="space-y-1.5">
                <Label htmlFor="subject">
                  {isNeed ? "Subject" : "Primary subject"}
                </Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={
                    isNeed
                      ? "e.g. Organic Chemistry"
                      : "e.g. Engineering Mathematics"
                  }
                  maxLength={80}
                  aria-invalid={!!errors.subject}
                />
                {errors.subject && (
                  <p className="text-xs text-destructive">{errors.subject}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    isNeed
                      ? "Describe the assignment, topic, formatting, sources, etc."
                      : "Describe your experience, the kinds of assignments you handle, formatting you support, etc."
                  }
                  rows={4}
                  maxLength={2000}
                  aria-invalid={!!errors.description}
                />
                {errors.description && (
                  <p className="text-xs text-destructive">{errors.description}</p>
                )}
              </div>

              {/* Type-specific fields */}
              {isNeed ? (
                <NeedWriterFields
                  pageCount={pageCount}
                  onPageCountChange={setPageCount}
                  pageCountError={errors.pageCount}
                  deadline={deadline}
                  onDeadlineChange={setDeadline}
                  deadlineError={errors.deadline}
                  pricePerPage={pricePerPageNeed}
                  onPricePerPageChange={setPricePerPageNeed}
                  priceError={errors.pricePerPage}
                  totalPrice={totalPrice}
                />
              ) : (
                <CanWriteFields
                  subjects={subjects}
                  onSubjectsChange={setSubjects}
                  subjectsError={errors.subjects}
                  pricePerPage={pricePerPageWriter}
                  onPricePerPageChange={setPricePerPageWriter}
                  priceError={errors.pricePerPage}
                  turnaround={turnaround}
                  onTurnaroundChange={setTurnaround}
                  turnaroundError={errors.turnaround}
                />
              )}

              {/* College */}
              <div className="space-y-1.5">
                <Label>College</Label>
                <CollegeSelect
                  value={collegeId}
                  onChange={(id, college) => {
                    setCollegeId(id)
                    setCollegeName(college?.name ?? null)
                  }}
                  placeholder="Select your college"
                />
                {errors.college && (
                  <p className="text-xs text-destructive">{errors.college}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Used to group your post with students on your campus.
                </p>
              </div>

              {/* Payment note */}
              <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground/90">
                <IndianRupee className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>
                  Payment is settled directly between students. CampusKart does not
                  handle or guarantee transactions.
                </span>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("writing")}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="gap-2">
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {isNeed ? "Post request" : "Offer writing"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

/* ---------------- Sub-components ---------------- */

function TypeToggle({
  active,
  onClick,
  icon,
  label,
  description,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  description: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left transition",
        active
          ? "bg-background shadow-sm text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "flex items-center gap-1.5 text-sm font-semibold",
          active && "text-primary"
        )}
      >
        {icon}
        {label}
      </span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  )
}

function NeedWriterFields({
  pageCount,
  onPageCountChange,
  pageCountError,
  deadline,
  onDeadlineChange,
  deadlineError,
  pricePerPage,
  onPricePerPageChange,
  priceError,
  totalPrice,
}: {
  pageCount: string
  onPageCountChange: (v: string) => void
  pageCountError?: string
  deadline: string
  onDeadlineChange: (v: string) => void
  deadlineError?: string
  pricePerPage: string
  onPricePerPageChange: (v: string) => void
  priceError?: string
  totalPrice: number
}) {
  // Build the min attribute (today, in yyyy-mm-dd) so the native date
  // picker blocks past dates client-side too.
  const todayStr = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.toISOString().slice(0, 10)
  }, [])

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pageCount">
            <span className="inline-flex items-center gap-1.5">
              <FileText className="size-3.5 text-primary/70" />
              Page count
            </span>
          </Label>
          <Input
            id="pageCount"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={pageCount}
            onChange={(e) => onPageCountChange(e.target.value)}
            placeholder="e.g. 20"
            aria-invalid={!!pageCountError}
          />
          {pageCountError && (
            <p className="text-xs text-destructive">{pageCountError}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="deadline">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-3.5 text-primary/70" />
              Deadline
            </span>
          </Label>
          <Input
            id="deadline"
            type="date"
            min={todayStr}
            value={deadline}
            onChange={(e) => onDeadlineChange(e.target.value)}
            aria-invalid={!!deadlineError}
          />
          {deadlineError && (
            <p className="text-xs text-destructive">{deadlineError}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pricePerPage">
          <span className="inline-flex items-center gap-1.5">
            <IndianRupee className="size-3.5 text-primary/70" />
            Price per page
          </span>
        </Label>
        <div className="relative max-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
            ₹
          </span>
          <Input
            id="pricePerPage"
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            value={pricePerPage}
            onChange={(e) => onPricePerPageChange(e.target.value)}
            placeholder="8"
            className="pl-7"
            aria-invalid={!!priceError}
          />
        </div>
        {priceError && <p className="text-xs text-destructive">{priceError}</p>}
        <p className="text-xs text-muted-foreground">
          The default is ₹8 per page — adjust to your budget.
        </p>
      </div>

      {/* Live total */}
      <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
        <span className="text-sm font-medium text-foreground/90">Total price</span>
        <span className="text-lg font-bold text-primary">{inr(totalPrice)}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Total = pages × price per page. The student you hire will see this amount.
      </p>
    </div>
  )
}

function CanWriteFields({
  subjects,
  onSubjectsChange,
  subjectsError,
  pricePerPage,
  onPricePerPageChange,
  priceError,
  turnaround,
  onTurnaroundChange,
  turnaroundError,
}: {
  subjects: string[]
  onSubjectsChange: (s: string[]) => void
  subjectsError?: string
  pricePerPage: string
  onPricePerPageChange: (v: string) => void
  priceError?: string
  turnaround: string
  onTurnaroundChange: (v: string) => void
  turnaroundError?: string
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="subjects">
          <span className="inline-flex items-center gap-1.5">
            <Tags className="size-3.5 text-primary/70" />
            Subjects you can write
          </span>
        </Label>
        <TagInput
          values={subjects}
          onChange={onSubjectsChange}
          placeholder="Type a subject and press Enter (e.g. Physics)"
        />
        {subjectsError && (
          <p className="text-xs text-destructive">{subjectsError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Add all the subjects you can cover. The primary subject above is included
          automatically.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pricePerPageWriter">
            <span className="inline-flex items-center gap-1.5">
              <IndianRupee className="size-3.5 text-primary/70" />
              Your rate (per page)
            </span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
              ₹
            </span>
            <Input
              id="pricePerPageWriter"
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              value={pricePerPage}
              onChange={(e) => onPricePerPageChange(e.target.value)}
              placeholder="10"
              className="pl-7"
              aria-invalid={!!priceError}
            />
          </div>
          {priceError && <p className="text-xs text-destructive">{priceError}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="turnaround">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-3.5 text-primary/70" />
              Turnaround time
            </span>
          </Label>
          <Input
            id="turnaround"
            value={turnaround}
            onChange={(e) => onTurnaroundChange(e.target.value)}
            placeholder="e.g. 2-3 days"
            maxLength={60}
            aria-invalid={!!turnaroundError}
          />
          {turnaroundError && (
            <p className="text-xs text-destructive">{turnaroundError}</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Tag input ---------------- */

function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function commit(raw: string) {
    const v = raw.trim()
    if (!v) return
    // De-dupe case-insensitively, keep the typed casing for the first entry.
    const lower = new Set(values.map((s) => s.toLowerCase()))
    if (!lower.has(v.toLowerCase())) {
      onChange([...values, v])
    }
    setDraft("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      commit(draft)
    } else if (e.key === "Backspace" && !draft && values.length > 0) {
      e.preventDefault()
      onChange(values.slice(0, -1))
    }
  }

  function remove(idx: number) {
    onChange(values.filter((_, i) => i !== idx))
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0"
    >
      {values.map((s, i) => (
        <span
          key={`${s}-${i}`}
          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
        >
          {s}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              remove(i)
            }}
            aria-label={`Remove ${s}`}
            className="rounded-full p-0.5 hover:bg-primary/20"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
        placeholder={values.length === 0 ? placeholder : "Add another…"}
        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}

/* ---------------- helpers ---------------- */

function isPastToday(d: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  return target.getTime() < today.getTime()
}
