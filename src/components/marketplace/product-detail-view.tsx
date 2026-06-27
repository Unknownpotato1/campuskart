"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { format } from "date-fns"
import {
  ArrowLeft,
  Building2,
  Calendar,
  Flag,
  Loader2,
  MessageCircle,
  Pencil,
  Share2,
  ShoppingCart,
  Trash2,
  TrendingUp,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { EmptyState } from "@/components/shared/empty-state"
import { useNav } from "@/hooks/use-nav"
import { useAuth } from "@/store/auth-store"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/types"

export function ProductDetailView() {
  const { id, navigate, extra } = useNav()
  const { user } = useAuth()
  const { toast } = useToast()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeImage, setActiveImage] = useState(0)

  // Report dialog
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState("")
  const [reportSubmitting, setReportSubmitting] = useState(false)

  // Seller actions state
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [bumpLoading, setBumpLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)

  // Edit mode: if extra.edit is set, show the edit form. We just redirect to
  // new-listing with extra.edit; the NewListingForm handles prefilling.
  useEffect(() => {
    if (extra.edit) {
      navigate("new-listing", { extra: { edit: id || "" } })
    }
  }, [extra.edit, id, navigate])

  useEffect(() => {
    if (!id) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setLoading(true)
    setNotFound(false)
    setProduct(null)
    setActiveImage(0)
    fetch(`/api/products/${id}`)
      .then(async (r) => {
        if (r.status === 404) {
          setNotFound(true)
          return null
        }
        if (!r.ok) throw new Error("Failed to load product")
        return r.json()
      })
      .then((data) => {
        if (data?.product) setProduct(data.product)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <ProductDetailSkeleton />

  if (notFound || !product) {
    return (
      <EmptyState
        icon={<ShoppingCart className="size-7" />}
        title="Listing not found"
        description="This listing may have been removed or the link is invalid."
        action={<Button onClick={() => navigate("marketplace")}>Back to Marketplace</Button>}
      />
    )
  }

  const isSeller = !!user && user.id === product.sellerId
  const images = product.images?.length ? product.images : ["/placeholder.svg"]
  const safeActive = Math.min(activeImage, images.length - 1)
  const initials = product.sellerName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  async function handleChat() {
    if (!user) {
      toast({ title: "Please sign in to chat.", variant: "destructive" })
      return
    }
    setChatLoading(true)
    try {
      const r = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextType: "PRODUCT",
          contextId: product!.id,
          contextTitle: product!.title,
          participantId: product!.sellerId,
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
    } finally {
      setChatLoading(false)
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/?view=product&id=${product!.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: "Link copied", description: "Share it with your friends." })
    } catch {
      toast({ title: "Could not copy", description: url, variant: "destructive" })
    }
  }

  async function handleReport() {
    if (!reportReason.trim()) {
      toast({ title: "Please add a reason.", variant: "destructive" })
      return
    }
    setReportSubmitting(true)
    try {
      const r = await fetch(`/api/products/${product!.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason.trim() }),
      })
      if (r.status === 409) {
        toast({ title: "Already reported", description: "You already reported this listing." })
        setReportOpen(false)
        setReportReason("")
        return
      }
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.error || "Failed to submit report")
      }
      toast({ title: "Report submitted", description: "Thanks — our team will review it." })
      setReportOpen(false)
      setReportReason("")
    } catch (e) {
      toast({
        title: "Could not submit",
        description: e instanceof Error ? e.message : "Try again later.",
        variant: "destructive",
      })
    } finally {
      setReportSubmitting(false)
    }
  }

  async function handleToggleStatus() {
    setStatusUpdating(true)
    const next = product!.status === "SOLD" ? "ACTIVE" : "SOLD"
    try {
      const r = await fetch(`/api/products/${product!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (!r.ok) throw new Error("Failed to update")
      const data = await r.json()
      setProduct(data.product)
      toast({
        title: next === "SOLD" ? "Marked as sold" : "Marked as active",
      })
    } catch {
      toast({ title: "Update failed", variant: "destructive" })
    } finally {
      setStatusUpdating(false)
    }
  }

  async function handleBump() {
    setBumpLoading(true)
    try {
      const r = await fetch(`/api/products/${product!.id}/bump`, { method: "POST" })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        throw new Error(data.error || "Failed to bump")
      }
      setProduct(data.product)
      toast({
        title: "Listing bumped!",
        description: "It now appears near the top of the marketplace. You can bump again in 24h.",
      })
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
      const r = await fetch(`/api/products/${product!.id}`, { method: "DELETE" })
      if (!r.ok) throw new Error("Failed to delete")
      toast({ title: "Listing deleted" })
      navigate("marketplace")
    } catch {
      toast({ title: "Delete failed", variant: "destructive" })
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("marketplace")}
        className="-ml-2 gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Marketplace
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="grid gap-8 lg:grid-cols-2"
      >
        {/* Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
            <img
              src={images[safeActive]}
              alt={product.title}
              className={cn(
                "h-full w-full object-cover",
                product.status === "SOLD" && "opacity-70"
              )}
            />
            {product.status === "SOLD" && (
              <Badge variant="destructive" className="absolute left-3 top-3 px-3 py-1 text-sm">
                SOLD
              </Badge>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.slice(0, 4).map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(idx)}
                  aria-label={`View image ${idx + 1}`}
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-xl border-2 bg-muted transition",
                    idx === safeActive
                      ? "border-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <img
                    src={img}
                    alt={`${product.title} ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{product.category}</Badge>
            <Badge variant="outline">{product.condition}</Badge>
            {product.status === "SOLD" && <Badge variant="destructive">Sold</Badge>}
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {product.title}
            </h1>
            <p className="mt-2 text-3xl font-bold text-primary">
              ₹{product.price.toLocaleString("en-IN")}
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground">Description</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>

          {/* Seller info card */}
          <Card className="bg-card/60">
            <CardContent className="flex items-center gap-3 py-4">
              <Avatar className="size-11">
                {user?.photo ? <AvatarImage src={user.photo} alt={product.sellerName} /> : null}
                <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{product.sellerName}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="size-3 text-primary/70" />
                    <span className="truncate">{product.collegeName || "Unknown college"}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {format(new Date(product.createdAt), "d MMM yyyy")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          {isSeller ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
                  Seller controls
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    onClick={handleToggleStatus}
                    disabled={statusUpdating}
                    variant={product.status === "SOLD" ? "outline" : "default"}
                    className="gap-2"
                  >
                    {statusUpdating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : product.status === "SOLD" ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <ShoppingCart className="size-4" />
                    )}
                    {product.status === "SOLD" ? "Mark as Active" : "Mark as Sold"}
                  </Button>
                  <Button
                    onClick={handleBump}
                    disabled={bumpLoading}
                    variant="secondary"
                    className="gap-2"
                  >
                    {bumpLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <TrendingUp className="size-4" />
                    )}
                    Bump listing
                  </Button>
                  <Button
                    onClick={() => navigate("new-listing", { extra: { edit: product.id } })}
                    variant="outline"
                    className="gap-2"
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. The listing will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={deleteLoading}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          {deleteLoading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            "Delete"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                onClick={handleChat}
                disabled={chatLoading}
                className="gap-2 sm:col-span-2"
                size="lg"
              >
                {chatLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MessageCircle className="size-4" />
                )}
                Chat with Seller
              </Button>
              <Button onClick={handleShare} variant="outline" className="gap-2">
                <Share2 className="size-4" />
                Share
              </Button>
              {user && (
                <Button
                  onClick={() => setReportOpen(true)}
                  variant="outline"
                  className="gap-2 text-muted-foreground"
                >
                  <Flag className="size-4" />
                  Report
                </Button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this listing</DialogTitle>
            <DialogDescription>
              Tell us what&apos;s wrong with this listing. Our team will review your report.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="e.g. Prohibited item, scam, misleading photos..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)} disabled={reportSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleReport} disabled={reportSubmitting} className="gap-2">
              {reportSubmitting && <Loader2 className="size-4 animate-spin" />}
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden link for SEO/accessibility — not rendered visually */}
      <Link href={`/?view=product&id=${product.id}`} className="hidden" prefetch={false}>
        {product.title}
      </Link>
    </div>
  )
}

function ProductDetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-5">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-9 w-1/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}
