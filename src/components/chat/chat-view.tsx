"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format, formatDistanceToNow } from "date-fns"
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Paperclip,
  PenLine,
  Search,
  Send,
  Tag,
  X,
} from "lucide-react"
import { useNav } from "@/hooks/use-nav"
import { useAuth } from "@/store/auth-store"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EmptyState } from "@/components/shared/empty-state"
import { ChatSkeleton } from "@/components/shared/loading-skeletons"
import {
  subscribeToMessages,
  subscribeToConversations,
  type ClientMessage,
} from "@/lib/firebase-client"
import type { Conversation, Message } from "@/lib/types"
import { cn } from "@/lib/utils"

type ConversationWithMeta = Conversation & {
  unread: number
  otherName?: string | null
  otherPhoto?: string | null
}

function toClient(m: Message): ClientMessage {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    senderName: m.senderName,
    senderPhoto: m.senderPhoto ?? null,
    content: m.content,
    type: m.type ?? "text",
    attachment: m.attachment ?? null,
    read: m.read,
    createdAt: m.createdAt,
  }
}

export function ChatView() {
  const { conv, navigate } = useNav()
  const isMobile = useIsMobile()
  const showMessagesOnMobile = isMobile && !!conv

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-0 md:grid-cols-[340px_1fr]",
        conv ? "h-screen" : "h-[calc(100vh-4rem)]"
      )}
    >
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
    // 5s poll if the listener can't start.
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
    <div className="flex h-full flex-col overflow-hidden border-r border-border bg-card">
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
              const name = c.otherName || "Unknown user"
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleOpen(c.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "w-full px-3 py-3 text-left transition hover:bg-accent/50",
                      isActive && "bg-primary/10 hover:bg-primary/10"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="size-11 shrink-0">
                        {c.otherPhoto ? (
                          <AvatarImage src={c.otherPhoto} alt={name} />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {initials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {name}
                          </p>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {c.lastMessageAt
                              ? formatDistanceToNow(new Date(c.lastMessageAt), {
                                  addSuffix: true,
                                })
                              : ""}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                          {c.contextTitle}
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-muted-foreground/80">
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
  const [messages, setMessages] = useState<ClientMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loadingConv, setLoadingConv] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isNearBottomRef = useRef(true)
  const pendingRef = useRef<Map<string, ClientMessage>>(new Map())
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

  // Real-time messages via Firestore onSnapshot (falls back to polling).
  useEffect(() => {
    let active = true
    let pollTimer: ReturnType<typeof setInterval> | null = null

    const applyServerMessages = (serverMessages: ClientMessage[]) => {
      if (!active) return
      // Drop optimistic entries that the server has now confirmed.
      const stillPending: ClientMessage[] = []
      for (const [tempId, msg] of pendingRef.current.entries()) {
        const confirmed = serverMessages.some(
          (sm) =>
            sm.senderId === msg.senderId &&
            (msg.attachment
              ? sm.attachment?.url === msg.attachment.url
              : sm.content === msg.content) &&
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

    let unsub: (() => void) | null = null
    let usingListener = false
    try {
      unsub = subscribeToMessages(
        convId,
        applyServerMessages,
        () => {
          if (!active || pollTimer) return
          pollTimer = setInterval(async () => {
            if (notFoundRef.current) return
            try {
              const res = await fetch(`/api/conversations/${convId}/messages`)
              if (!active || !res.ok) return
              const data = await res.json()
              applyServerMessages((data.messages || []).map(toClient))
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
          applyServerMessages((data.messages || []).map(toClient))
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
      el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  const sendOptimistic = (msg: ClientMessage) => {
    pendingRef.current.set(msg.id, msg)
    setMessages((prev) => [...prev, msg])
    isNearBottomRef.current = true
  }

  const handleSendText = async () => {
    const content = input.trim()
    if (!content || !user || sending) return

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimistic: ClientMessage = {
      id: tempId,
      conversationId: convId,
      senderId: user.id,
      senderName: user.name,
      senderPhoto: user.photo ?? null,
      content,
      type: "text",
      attachment: null,
      read: false,
      createdAt: new Date().toISOString(),
    }
    sendOptimistic(optimistic)
    setInput("")
    setSending(true)

    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type: "text" }),
      })
      if (!res.ok) throw new Error("Failed to send")
      const data = await res.json()
      const real = toClient(data.message as Message)
      pendingRef.current.delete(tempId)
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === tempId)
        if (idx === -1) return prev
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
      setInput(content)
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const handleSendAttachment = async (file: File) => {
    if (!user) return
    const isImage = file.type.startsWith("image/")
    const attachmentType: "image" | "file" = isImage ? "image" : "file"

    setUploading(true)
    let uploadResult: { url: string; name: string; size: number; contentType: string }
    try {
      const fd = new FormData()
      fd.append("file", file, file.name)
      const res = await fetch("/api/upload?kind=chat", {
        method: "POST",
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Upload failed")
      }
      const data = await res.json()
      uploadResult = {
        url: data.url,
        name: data.name || file.name,
        size: data.size || file.size,
        contentType: data.contentType || file.type,
      }
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
      setUploading(false)
      return
    }
    setUploading(false)

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimistic: ClientMessage = {
      id: tempId,
      conversationId: convId,
      senderId: user.id,
      senderName: user.name,
      senderPhoto: user.photo ?? null,
      content: "",
      type: attachmentType,
      attachment: {
        url: uploadResult.url,
        type: attachmentType,
        name: uploadResult.name,
        size: uploadResult.size,
        contentType: uploadResult.contentType,
      },
      read: false,
      createdAt: new Date().toISOString(),
    }
    sendOptimistic(optimistic)
    setSending(true)

    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "",
          type: attachmentType,
          attachment: optimistic.attachment,
        }),
      })
      if (!res.ok) throw new Error("Failed to send")
      const data = await res.json()
      const real = toClient(data.message as Message)
      pendingRef.current.delete(tempId)
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === tempId)
        if (idx === -1) return prev
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
      toast({
        title: "Failed to send attachment",
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
      void handleSendText()
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
  const otherPhoto = conversation.otherPhoto || null
  const contextLabel = conversation.contextType === "PRODUCT" ? "Product" : "Writing"

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-3 py-2.5 sm:px-4">
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
          {otherPhoto ? <AvatarImage src={otherPhoto} alt={otherName} /> : null}
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
        className="flex-1 space-y-2 overflow-y-auto p-3 sm:p-4 scroll-thin"
        style={{
          backgroundColor: "var(--muted)",
          backgroundImage:
            "radial-gradient(circle, var(--border) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
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
          messages.map((m, idx) => {
            const mine = !!userIdRef.current && m.senderId === userIdRef.current
            const prev = messages[idx - 1]
            const showAvatar = !mine && (!prev || prev.senderId !== m.senderId)
            return (
              <MessageBubble
                key={m.id}
                message={m}
                mine={mine}
                showAvatar={showAvatar}
                otherName={otherName}
                otherPhoto={otherPhoto}
                onImageClick={(url) => setLightbox(url)}
              />
            )
          })
        )}
      </div>

      {/* Composer */}
      <div
        className="border-t border-border bg-card px-3 pt-3 sm:px-4"
        style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleSendAttachment(f)
              if (fileInputRef.current) fileInputRef.current.value = ""
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
            aria-label="Attach file"
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Paperclip className="size-4" />
            )}
          </Button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message..."
            rows={1}
            aria-label="Message"
            className="flex max-h-32 min-h-[2.5rem] w-full resize-none rounded-2xl border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button
            type="button"
            onClick={() => void handleSendText()}
            disabled={!input.trim() || sending}
            size="icon"
            className="size-9 shrink-0 rounded-full"
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

      {/* Image lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              aria-label="Close preview"
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X className="size-5" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightbox}
              alt="Image preview"
              className="max-h-[90vh] max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Message bubble                                                      */
/* ------------------------------------------------------------------ */

function MessageBubble({
  message,
  mine,
  showAvatar,
  otherName,
  otherPhoto,
  onImageClick,
}: {
  message: ClientMessage
  mine: boolean
  showAvatar: boolean
  otherName: string
  otherPhoto: string | null
  onImageClick: (url: string) => void
}) {
  const type = message.type ?? "text"
  const attachment = message.attachment ?? null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}
    >
      {!mine && (
        <div className="w-8 shrink-0">
          {showAvatar && (
            <Avatar className="size-8">
              {otherPhoto ? <AvatarImage src={otherPhoto} alt={otherName} /> : null}
              <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                {initials(otherName)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
          mine
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-background text-foreground"
        )}
      >
        {type === "image" && attachment ? (
          <button
            type="button"
            onClick={() => onImageClick(attachment.url)}
            className="block overflow-hidden rounded-lg"
            aria-label="Open image"
          >
            <img
              src={attachment.url}
              alt={attachment.name || "Image"}
              className="max-h-64 max-w-full object-cover"
            />
          </button>
        ) : type === "file" && attachment ? (
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-background/40 px-2 py-1.5 transition hover:bg-background/60"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <FileText className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">
                {attachment.name || "File"}
              </p>
              <p className="text-[10px] opacity-70">{formatBytes(attachment.size)}</p>
            </div>
            <Download className="size-4 shrink-0 opacity-70" />
          </a>
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-[10px]",
            mine ? "justify-end text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          <span>{safeFormatTime(message.createdAt)}</span>
          {mine &&
            (message.read ? (
              <CheckCheck className="size-3" aria-label="Read" />
            ) : (
              <Check className="size-3" aria-label="Sent" />
            ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Helpers + small subcomponents                                       */
/* ------------------------------------------------------------------ */

function DesktopPlaceholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-card text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageCircle className="size-7" />
      </div>
      <p className="text-sm font-semibold text-foreground">Select a conversation</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        Pick a conversation from the list to start messaging.
      </p>
      <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ImageIcon className="size-3.5" />
        <span>You can send text, images and files.</span>
      </div>
    </div>
  )
}

function MessagesPaneSkeleton() {
  return (
    <div className="flex h-full flex-col bg-card">
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
        <div className="h-9 w-full animate-pulse rounded-2xl bg-muted" />
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

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}
