"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { format, formatDistanceToNow } from "date-fns"
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  PenLine,
  Search,
  Send,
  Tag,
} from "lucide-react"
import { useNav } from "@/hooks/use-nav"
import { useAuth } from "@/store/auth-store"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { EmptyState } from "@/components/shared/empty-state"
import { ChatSkeleton } from "@/components/shared/loading-skeletons"
import { cn } from "@/lib/utils"
import type { Conversation, Message } from "@/lib/types"
import { subscribeToMessages, subscribeToConversations } from "@/lib/firebase-client"

type ConversationWithMeta = Conversation & { unread: number; otherName?: string }

export function ChatView() {
  const { conv, navigate } = useNav()
  const isMobile = useIsMobile()
  // On mobile, show only the messages pane when a conversation is selected;
  // otherwise show only the conversation list. On desktop, show both panes.
  const showMessagesOnMobile = isMobile && !!conv

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[300px_1fr] h-[calc(100vh-9rem)]">
      <div
        className={cn(
          "min-h-0",
          showMessagesOnMobile ? "hidden" : "block",
          "md:block"
        )}
      >
        <ConversationList selectedId={conv} />
      </div>
      <div
        className={cn(
          "min-h-0",
          showMessagesOnMobile ? "block" : "hidden",
          "md:block"
        )}
      >
        {conv ? (
          <MessagesPane key={conv} convId={conv} onBack={() => navigate("chat")} />
        ) : (
          <DesktopPlaceholder />
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Left pane — conversation list                                       */
/* ------------------------------------------------------------------ */

function ConversationList({ selectedId }: { selectedId: string | null }) {
  const { navigate } = useNav()
  const { user } = useAuth()
  const [convos, setConvos] = useState<ConversationWithMeta[] | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await fetch("/api/conversations")
        if (!active || !res.ok) return
        const data = await res.json()
        if (active) setConvos(data.conversations || [])
      } catch {
        /* ignore transient errors */
      }
    }
    load()

    // Real-time: subscribe to the user's conversations and refetch the
    // enriched list whenever Firestore reports a change. Falls back to a
    // 5s poll if the listener can't start (e.g. Firestore not configured
    // or security rules block the query).
    let unsub: (() => void) | null = null
    let pollTimer: ReturnType<typeof setInterval> | null = null
    try {
      if (user?.id) {
        unsub = subscribeToConversations(
          user.id,
          () => {
            if (active) load()
          },
          () => {
            if (!active || pollTimer) return
            pollTimer = setInterval(load, 5000)
          }
        )
      } else {
        pollTimer = setInterval(load, 5000)
      }
    } catch {
      pollTimer = setInterval(load, 5000)
    }

    return () => {
      active = false
      if (unsub) unsub()
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [user?.id])

  const handleOpen = (id: string) => {
    navigate("chat", { conv: id })
    // Mark as read immediately so the unread badge clears promptly.
    fetch(`/api/conversations/${id}/read`, { method: "POST" }).catch(() => {
      /* ignore */
    })
  }

  const filtered = (convos || []).filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.contextTitle.toLowerCase().includes(q) ||
      (c.otherName || "").toLowerCase().includes(q)
    )
  })

  if (convos === null) {
    return <ChatSkeleton />
  }

  if (convos.length === 0) {
    return (
      <div className="h-full">
        <EmptyState
          icon={<MessageCircle className="size-7" />}
          title="No conversations yet"
          description="Start chatting from a product or writing post."
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9"
            aria-label="Search conversations"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scroll-thin">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No matches found.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((c) => {
              const isActive = selectedId === c.id
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleOpen(c.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "w-full px-4 py-3 text-left transition hover:bg-accent/50",
                      isActive && "bg-primary/10 hover:bg-primary/10"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="size-10 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {initials(c.otherName || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {c.contextTitle}
                          </p>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {c.lastMessageAt
                              ? formatDistanceToNow(new Date(c.lastMessageAt), {
                                  addSuffix: true,
                                })
                              : ""}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-muted-foreground">
                            {c.lastMessage || "No messages yet"}
                          </p>
                          {c.unread > 0 && (
                            <span
                              className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground"
                              aria-label={`${c.unread} unread`}
                            >
                              {c.unread > 9 ? "9+" : c.unread}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                          {c.otherName ? `with ${c.otherName}` : "Unknown user"}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Right pane — messages                                               */
/* ------------------------------------------------------------------ */

function MessagesPane({
  convId,
  onBack,
}: {
  convId: string
  onBack: () => void
}) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [conversation, setConversation] = useState<ConversationWithMeta | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [loadingConv, setLoadingConv] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const pendingRef = useRef<Map<string, Message>>(new Map())
  const notFoundRef = useRef(false)
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    userIdRef.current = user?.id ?? null
  }, [user?.id])
  useEffect(() => {
    notFoundRef.current = notFound
  }, [notFound])

  // Load the conversation context (header info).
  useEffect(() => {
    let active = true
    setLoadingConv(true)
    setNotFound(false)
    setConversation(null)
    fetch(`/api/conversations/${convId}`)
      .then(async (r) => {
        if (!active) return null
        if (r.status === 404) {
          setNotFound(true)
          return null
        }
        if (!r.ok) return null
        return r.json()
      })
      .then((data) => {
        if (!active) return
        if (data?.conversation) setConversation(data.conversation)
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => {
        if (active) setLoadingConv(false)
      })
    return () => {
      active = false
    }
  }, [convId])

  // Reset message state when switching conversations.
  useEffect(() => {
    setMessages([])
    pendingRef.current = new Map()
    isNearBottomRef.current = true
  }, [convId])

  // Real-time messages via Firestore onSnapshot (falls back to polling if
  // Firestore isn't configured / listener errors — e.g. security rules).
  useEffect(() => {
    let active = true
    let pollTimer: ReturnType<typeof setInterval> | null = null

    const applyServerMessages = (serverMessages: Message[]) => {
      if (!active) return
      // Drop optimistic entries that the server has now confirmed.
      const stillPending: Message[] = []
      for (const [tempId, msg] of pendingRef.current.entries()) {
        const confirmed = serverMessages.some(
          (sm) =>
            sm.senderId === msg.senderId &&
            sm.content === msg.content &&
            Math.abs(
              new Date(sm.createdAt).getTime() - new Date(msg.createdAt).getTime()
            ) < 30000
        )
        if (confirmed) pendingRef.current.delete(tempId)
        else stillPending.push(msg)
      }

      const merged = [...serverMessages]
      for (const pm of stillPending) {
        if (merged.some((m) => m.id === pm.id)) continue
        const idx = merged.findIndex(
          (m) => new Date(m.createdAt) > new Date(pm.createdAt)
        )
        if (idx === -1) merged.push(pm)
        else merged.splice(idx, 0, pm)
      }
      setMessages(merged)

      const uid = userIdRef.current
      if (uid) {
        const hasUnreadFromOthers = serverMessages.some(
          (m) => m.senderId !== uid && !m.read
        )
        if (hasUnreadFromOthers) {
          fetch(`/api/conversations/${convId}/read`, { method: "POST" }).catch(
            () => {
              /* ignore */
            }
          )
        }
      }
    }

    // Try the real-time Firestore listener first.
    let unsub: (() => void) | null = null
    let usingListener = false
    try {
      unsub = subscribeToMessages(
        convId,
        applyServerMessages,
        () => {
          // Listener errored (e.g. permissions) → fall back to polling.
          if (!active || pollTimer) return
          pollTimer = setInterval(async () => {
            if (notFoundRef.current) return
            try {
              const res = await fetch(`/api/conversations/${convId}/messages`)
              if (!active || !res.ok) return
              const data = await res.json()
              applyServerMessages(data.messages || [])
            } catch {
              /* ignore */
            }
          }, 3000)
        }
      )
      usingListener = true
    } catch {
      // firebase-client not available → polling fallback below.
    }

    if (!usingListener) {
      const load = async () => {
        if (notFoundRef.current) return
        try {
          const res = await fetch(`/api/conversations/${convId}/messages`)
          if (!active || !res.ok) return
          const data = await res.json()
          applyServerMessages(data.messages || [])
        } catch {
          /* ignore */
        }
      }
      load()
      pollTimer = setInterval(load, 3000)
    }

    return () => {
      active = false
      if (unsub) unsub()
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [convId])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  // Auto-scroll on new messages, but only if the user is near the bottom.
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom()
    }
  }, [messages, scrollToBottom])

  // Initial scroll to bottom when the conversation loads.
  useEffect(() => {
    isNearBottomRef.current = true
    scrollToBottom()
  }, [convId, scrollToBottom])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 100
  }

  const handleSend = async () => {
    const content = input.trim()
    if (!content || !user || sending) return

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimistic: Message = {
      id: tempId,
      conversationId: convId,
      senderId: user.id,
      senderName: user.name,
      content,
      read: false,
      createdAt: new Date().toISOString(),
    }
    pendingRef.current.set(tempId, optimistic)
    setMessages((prev) => [...prev, optimistic])
    setInput("")
    setSending(true)
    // We just sent a message — pin to the bottom.
    isNearBottomRef.current = true

    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error("Failed to send")
      const data = await res.json()
      const real = data.message as Message
      pendingRef.current.delete(tempId)
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === tempId)
        if (idx === -1) return prev
        // If a poll already inserted the real message, just drop the temp.
        if (prev.some((m) => m.id === real.id)) {
          return prev.filter((m) => m.id !== tempId)
        }
        const copy = [...prev]
        copy[idx] = real
        return copy
      })
      setTimeout(() => scrollToBottom("smooth"), 50)
    } catch {
      pendingRef.current.delete(tempId)
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setInput(content) // restore so the user can retry
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  if (loadingConv) {
    return <MessagesPaneSkeleton />
  }

  if (notFound || !conversation) {
    return (
      <div className="h-full">
        <EmptyState
          icon={<MessageCircle className="size-7" />}
          title="Conversation not found"
          description="This conversation may have been removed."
          action={<Button onClick={onBack}>Back to chats</Button>}
        />
      </div>
    )
  }

  const otherName = conversation.otherName || "Other user"
  const contextLabel = conversation.contextType === "PRODUCT" ? "Product" : "Writing"

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border p-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 md:hidden"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Avatar className="size-9 shrink-0">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials(otherName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {otherName}
            </p>
            <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
              {conversation.contextType === "PRODUCT" ? (
                <Tag className="size-2.5" />
              ) : (
                <PenLine className="size-2.5" />
              )}
              {contextLabel}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            Re: {conversation.contextTitle}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 space-y-2 overflow-y-auto p-4 scroll-thin"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            <div>
              <p className="text-3xl" aria-hidden>
                👋
              </p>
              <p className="mt-2">Say hi!</p>
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const mine = !!userIdRef.current && m.senderId === userIdRef.current
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn("flex", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {!mine && (
                    <p className="mb-0.5 text-[10px] font-semibold text-primary">
                      {m.senderName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p
                    className={cn(
                      "mt-1 text-[10px]",
                      mine ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}
                  >
                    {safeFormatTime(m.createdAt)}
                  </p>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message..."
            rows={1}
            aria-label="Message"
            className="flex max-h-32 min-h-[2.5rem] w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
          <Button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || sending}
            size="icon"
            className="size-9 shrink-0 rounded-xl"
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Helpers + small subcomponents                                       */
/* ------------------------------------------------------------------ */

function DesktopPlaceholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageCircle className="size-7" />
      </div>
      <p className="text-sm font-semibold text-foreground">Select a conversation</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        Pick a conversation from the list to start messaging.
      </p>
    </div>
  )
}

function MessagesPaneSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border p-3">
        <div className="size-9 animate-pulse rounded-full bg-muted" />
        <div className="space-y-1.5">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-40 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="flex-1 space-y-3 p-4">
        <div className="h-10 w-1/2 animate-pulse rounded-2xl bg-muted" />
        <div className="ml-auto h-10 w-1/3 animate-pulse rounded-2xl bg-muted" />
        <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-muted" />
        <div className="ml-auto h-10 w-1/2 animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="border-t border-border p-3">
        <div className="h-9 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  )
}

function initials(name: string): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function safeFormatTime(iso: string): string {
  try {
    return format(new Date(iso), "p")
  } catch {
    return ""
  }
}
