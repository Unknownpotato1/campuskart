"use client"

import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { format } from "date-fns"
import {
  BookOpen,
  Building2,
  CheckCircle2,
  Info,
  Loader2,
  Mail,
  MapPin,
  Package,
  PenLine,
  Plus,
  ShoppingCart,
  Trash2,
  TrendingUp,
  User as UserIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { CollegeSelect } from "@/components/site/college-select"
import { EmptyState } from "@/components/shared/empty-state"
import {
  ProductGridSkeleton,
  WritingListSkeleton,
} from "@/components/shared/loading-skeletons"

import { useNav, type View } from "@/hooks/use-nav"
import { useAuth } from "@/store/auth-store"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { Product, WritingPost } from "@/lib/types"

type TabKey = "profile" | "listings" | "writing"
type Navigate = (view: View, opts?: { id?: string | null; conv?: string | null; extra?: Record<string, string> }) => void

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function ProfileView() {
  const { navigate, extra } = useNav()
  const { user } = useAuth()

  const tab: TabKey =
    extra.tab === "listings" || extra.tab === "writing" ? extra.tab : "profile"

  // my-content fetch (single source of truth for both Listings & Writing tabs)
  const [products, setProducts] = useState<Product[]>([])
  const [writingPosts, setWritingPosts] = useState<WritingPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchContent = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch("/api/profile/my-content")
      if (!r.ok) {
        if (r.status === 401) {
          setError("Please sign in to view your content.")
        } else {
          throw new Error("Failed to load your content")
        }
        return
      }
      const data = await r.json()
      setProducts(data.products || [])
      setWritingPosts(data.writingPosts || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load your content")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchContent()
  }, [fetchContent, refreshKey])

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const handleTabChange = (next: string) => {
    navigate("profile", { extra: { tab: next } })
  }

  if (!user) {
    return (
      <EmptyState
        icon={<UserIcon className="size-7" />}
        title="Sign in to view your profile"
        description="You need to be signed in to manage your listings and writing posts."
      />
    )
  }

  const initials = initialsOf(user.name) || "?"
  const location = [user.city, user.state].filter(Boolean).join(", ")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <Avatar className="size-20 border border-border shadow-sm sm:size-24">
          {user.photo ? <AvatarImage src={user.photo} alt={user.name} /> : null}
          <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {user.name}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5">
              <Mail className="size-4 shrink-0 text-primary/70" />
              <span className="break-all">{user.email}</span>
            </span>
            {user.collegeName && (
              <span className="flex min-w-0 items-center gap-1.5">
                <Building2 className="size-4 shrink-0 text-primary/70" />
                <span className="truncate">{user.collegeName}</span>
              </span>
            )}
            {location && (
              <span className="flex min-w-0 items-center gap-1.5">
                <MapPin className="size-4 shrink-0 text-primary/70" />
                <span className="truncate">{location}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="listings">My Listings</TabsTrigger>
          <TabsTrigger value="writing">My Writing</TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="mt-5"
          >
            {tab === "profile" && <ProfileEditForm onSaved={refresh} />}
            {tab === "listings" && (
              <ListingsTab
                products={products}
                loading={loading}
                error={error}
                onRefresh={refresh}
                onRetry={fetchContent}
                navigate={navigate}
              />
            )}
            {tab === "writing" && (
              <WritingTab
                posts={writingPosts}
                loading={loading}
                error={error}
                onRefresh={refresh}
                onRetry={fetchContent}
                navigate={navigate}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Profile edit form
// ----------------------------------------------------------------------------

function ProfileEditForm({ onSaved }: { onSaved: () => void }) {
  const { user, setUser } = useAuth()
  const { toast } = useToast()

  // Initialize once from the current user (matches onboarding-modal pattern)
  const [name, setName] = useState(user?.name || "")
  const [phone, setPhone] = useState(user?.phone || "")
  const [photo, setPhoto] = useState(user?.photo || "")
  const [collegeId, setCollegeId] = useState<string | null>(user?.collegeId || null)
  const [saving, setSaving] = useState(false)

  if (!user) return null

  async function handleSave() {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        phone: phone.trim(),
        photo: photo.trim(),
      }
      // Only send collegeId when it actually changed (avoid no-op resets)
      if (collegeId !== user!.collegeId) {
        body.collegeId = collegeId || ""
      }
      const r = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.error || "Failed to update profile")
      }
      const data = await r.json()
      setUser(data.user)
      toast({ title: "Profile updated", description: "Your changes have been saved." })
      onSaved()
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const photoUrl = photo.trim()

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Edit profile</CardTitle>
        <CardDescription>
          Update your name, contact, photo, and college.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Live avatar preview */}
        <div className="flex items-center gap-4">
          <Avatar className="size-16 border border-border">
            {photoUrl ? <AvatarImage src={photoUrl} alt={name || "Avatar"} /> : null}
            <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
              {initialsOf(name) || "?"}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground">
            Your photo appears on listings and in chats.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-name">Name</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-phone">Phone</Label>
          <Input
            id="profile-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Optional"
            type="tel"
            autoComplete="tel"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-photo">Photo URL</Label>
          <Input
            id="profile-photo"
            value={photo}
            onChange={(e) => setPhoto(e.target.value)}
            placeholder="https://..."
            type="url"
            inputMode="url"
          />
          <p className="text-xs text-muted-foreground">
            Paste a direct image URL. Optional.
          </p>
        </div>

        <div className="space-y-2">
          <Label>College</Label>
          <CollegeSelect
            value={collegeId}
            onChange={(id) => setCollegeId(id)}
            placeholder="Select your college"
          />
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3 shrink-0 text-primary/70" />
            <span>
              Changing your college affects which listings you see prioritized
              in the marketplace.
            </span>
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ----------------------------------------------------------------------------
// My Listings tab
// ----------------------------------------------------------------------------

function ListingsTab({
  products,
  loading,
  error,
  onRefresh,
  onRetry,
  navigate,
}: {
  products: Product[]
  loading: boolean
  error: string | null
  onRefresh: () => void
  onRetry: () => void
  navigate: Navigate
}) {
  if (loading) {
    return <ProductGridSkeleton count={4} />
  }
  if (error) {
    return (
      <EmptyState
        icon={<Package className="size-7" />}
        title="Something went wrong"
        description={error}
        action={
          <Button onClick={onRetry} variant="outline">
            Retry
          </Button>
        }
      />
    )
  }
  if (products.length === 0) {
    return (
      <EmptyState
        icon={<Package className="size-7" />}
        title="No listings yet"
        description="Post your first item to the marketplace."
        action={
          <Button onClick={() => navigate("new-listing")} className="gap-2">
            <Plus className="size-4" />
            Sell something
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => navigate("new-listing")} className="gap-2 self-start sm:self-auto">
          <Plus className="size-4" />
          Post a listing
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => (
          <MyProductCard
            key={p.id}
            product={p}
            onRefresh={onRefresh}
            onClick={() => navigate("product", { id: p.id })}
          />
        ))}
      </div>
    </div>
  )
}

function MyProductCard({
  product,
  onRefresh,
  onClick,
}: {
  product: Product
  onRefresh: () => void
  onClick: () => void
}) {
  const { toast } = useToast()
  const [statusLoading, setStatusLoading] = useState(false)
  const [bumpLoading, setBumpLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const sold = product.status === "SOLD"
  const cover = product.images?.[0] || "/placeholder.svg"

  async function handleStatus() {
    setStatusLoading(true)
    const next = sold ? "ACTIVE" : "SOLD"
    try {
      const r = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (!r.ok) throw new Error("Failed to update")
      toast({
        title: next === "SOLD" ? "Marked as sold" : "Marked as active",
      })
      onRefresh()
    } catch {
      toast({ title: "Update failed", variant: "destructive" })
    } finally {
      setStatusLoading(false)
    }
  }

  async function handleBump() {
    setBumpLoading(true)
    try {
      const r = await fetch(`/api/products/${product.id}/bump`, { method: "POST" })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        throw new Error(data.error || "Failed to bump")
      }
      toast({
        title: "Listing bumped!",
        description: "It now appears near the top. You can bump again in 24h.",
      })
      onRefresh()
    } catch (e) {
      toast({
        title: "Could not bump",
        description: e instanceof Error ? e.message : "Try again later.",
        variant: "destructive",
      })
    } finally {
      setBumpLoading(false)
    }
  }

  async function handleDelete() {
    setDeleteLoading(true)
    try {
      const r = await fetch(`/api/products/${product.id}`, { method: "DELETE" })
      if (!r.ok) throw new Error("Failed to delete")
      toast({ title: "Listing deleted" })
      onRefresh()
    } catch {
      toast({ title: "Delete failed", variant: "destructive" })
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      {/* Clickable card area */}
      <button
        type="button"
        onClick={onClick}
        aria-label={`View ${product.title}`}
        className="group flex flex-1 items-start gap-3 p-3 text-left transition hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          <img
            src={cover}
            alt={product.title}
            className={cn(
              "h-full w-full object-cover transition duration-300 group-hover:scale-105",
              sold && "opacity-60"
            )}
            loading="lazy"
          />
          {sold && (
            <Badge
              variant="destructive"
              className="absolute left-1 top-1 px-1.5 py-0.5 text-[10px]"
            >
              SOLD
            </Badge>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 font-medium text-foreground">
            {product.title}
          </h3>
          <p className="mt-0.5 text-lg font-bold text-primary">
            {inr(product.price)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px]">
              {product.condition}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {product.category}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Posted {format(new Date(product.createdAt), "d MMM yyyy")}
          </p>
        </div>
      </button>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-1.5 border-t border-border bg-muted/30 p-2">
        <Button
          size="sm"
          variant={sold ? "outline" : "secondary"}
          onClick={handleStatus}
          disabled={statusLoading}
          className="gap-1 text-xs"
          aria-label={sold ? "Mark as active" : "Mark as sold"}
        >
          {statusLoading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : sold ? (
            <CheckCircle2 className="size-3" />
          ) : (
            <ShoppingCart className="size-3" />
          )}
          <span className="hidden sm:inline">{sold ? "Active" : "Sold"}</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleBump}
          disabled={bumpLoading}
          className="gap-1 text-xs"
          aria-label="Bump listing"
        >
          {bumpLoading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <TrendingUp className="size-3" />
          )}
          <span className="hidden sm:inline">Bump</span>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="Delete listing"
            >
              <Trash2 className="size-3" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The listing will be permanently
                removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteLoading}
                className="gap-2 bg-destructive text-white hover:bg-destructive/90"
              >
                {deleteLoading && <Loader2 className="size-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// My Writing Posts tab
// ----------------------------------------------------------------------------

const WRITING_STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
}

const WRITING_STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-primary/10 text-primary border-primary/30",
  IN_PROGRESS: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  COMPLETED: "bg-muted text-muted-foreground border-border",
}

function WritingTab({
  posts,
  loading,
  error,
  onRefresh,
  onRetry,
  navigate,
}: {
  posts: WritingPost[]
  loading: boolean
  error: string | null
  onRefresh: () => void
  onRetry: () => void
  navigate: Navigate
}) {
  if (loading) {
    return <WritingListSkeleton count={4} />
  }
  if (error) {
    return (
      <EmptyState
        icon={<PenLine className="size-7" />}
        title="Something went wrong"
        description={error}
        action={
          <Button onClick={onRetry} variant="outline">
            Retry
          </Button>
        }
      />
    )
  }
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<PenLine className="size-7" />}
        title="No writing posts yet"
        description="Post a writing request or offer your writing services."
        action={
          <Button
            onClick={() => navigate("new-writing", { extra: { type: "need" } })}
            className="gap-2"
          >
            <Plus className="size-4" />
            Post a writing request
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => navigate("new-writing", { extra: { type: "need" } })}
          className="gap-2 self-start sm:self-auto"
        >
          <Plus className="size-4" />
          Post
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {posts.map((p) => (
          <MyWritingCard key={p.id} post={p} onRefresh={onRefresh} />
        ))}
      </div>
    </div>
  )
}

function MyWritingCard({
  post,
  onRefresh,
}: {
  post: WritingPost
  onRefresh: () => void
}) {
  const { toast } = useToast()
  const [statusLoading, setStatusLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const isNeedWriter = post.type === "NEED_WRITER"

  async function handleStatusChange(next: string) {
    if (next === post.status) return
    setStatusLoading(true)
    try {
      const r = await fetch(`/api/writing/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.error || "Failed to update")
      }
      toast({
        title: "Status updated",
        description: `Marked as ${WRITING_STATUS_LABEL[next].toLowerCase()}.`,
      })
      onRefresh()
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Try again later.",
        variant: "destructive",
      })
    } finally {
      setStatusLoading(false)
    }
  }

  async function handleDelete() {
    setDeleteLoading(true)
    try {
      const r = await fetch(`/api/writing/${post.id}`, { method: "DELETE" })
      if (!r.ok) throw new Error("Failed to delete")
      toast({ title: "Post deleted" })
      onRefresh()
    } catch {
      toast({ title: "Delete failed", variant: "destructive" })
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-4">
      {/* Header badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={isNeedWriter ? "default" : "secondary"}
          className={cn(
            isNeedWriter && "border-transparent bg-primary/10 text-primary"
          )}
        >
          {isNeedWriter ? "Need a Writer" : "Writer Available"}
        </Badge>
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
            WRITING_STATUS_STYLES[post.status]
          )}
        >
          {WRITING_STATUS_LABEL[post.status]}
        </span>
      </div>

      {/* Title + subject */}
      <h3 className="mt-2 line-clamp-1 text-lg font-semibold text-foreground">
        {post.title}
      </h3>
      <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <BookOpen className="size-3.5 shrink-0 text-primary/70" />
        <span className="truncate">{post.subject}</span>
      </div>

      {/* Info */}
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">
            {isNeedWriter ? "Pages" : "Subjects"}
          </dt>
          <dd className="font-medium text-foreground">
            {isNeedWriter
              ? post.pageCount != null
                ? String(post.pageCount)
                : "—"
              : `${post.subjects.length} listed`}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            {isNeedWriter ? "Total" : "Per page"}
          </dt>
          <dd className="font-medium text-primary">
            {isNeedWriter
              ? post.totalPrice != null
                ? inr(post.totalPrice)
                : "—"
              : inr(post.pricePerPage)}
          </dd>
        </div>
      </dl>

      {/* Actions */}
      <div className="mt-auto flex items-center gap-2 pt-4">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={`status-${post.id}`} className="sr-only">
            Status
          </Label>
          <Select
            value={post.status}
            onValueChange={handleStatusChange}
            disabled={statusLoading}
          >
            <SelectTrigger
              id={`status-${post.id}`}
              className="h-8 w-[150px] text-xs"
              size="sm"
              aria-label="Update post status"
            >
              {statusLoading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : null}
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="Delete writing post"
            >
              <Trash2 className="size-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this writing post?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The post will be permanently
                removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteLoading}
                className="gap-2 bg-destructive text-white hover:bg-destructive/90"
              >
                {deleteLoading && <Loader2 className="size-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </article>
  )
}
