"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ImageUpload } from "@/components/site/image-upload"
import { CollegeSelect } from "@/components/site/college-select"
import { Skeleton } from "@/components/ui/skeleton"
import { useNav } from "@/hooks/use-nav"
import { useAuth } from "@/store/auth-store"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { ProductCategory, ProductCondition } from "@/lib/types"

const CATEGORIES: ProductCategory[] = [
  "Books",
  "Electronics",
  "Lab Equipment",
  "Furniture",
  "Clothing",
  "Other",
]
const CONDITIONS: ProductCondition[] = ["New", "Like New", "Good", "Fair"]

export function NewListingForm() {
  const { navigate, extra } = useNav()
  const { user } = useAuth()
  const { toast } = useToast()

  const editId = extra.edit || null
  const isEdit = !!editId

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [category, setCategory] = useState<ProductCategory | "">("")
  const [condition, setCondition] = useState<ProductCondition | "">("")
  const [images, setImages] = useState<string[]>([])
  const [collegeId, setCollegeId] = useState<string | null>(user?.collegeId || null)
  const [collegeName, setCollegeName] = useState<string | null>(user?.collegeName || null)

  const [submitting, setSubmitting] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(isEdit)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Prefill when editing
  useEffect(() => {
    if (!editId) return
    setLoadingEdit(true)
    fetch(`/api/products/${editId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load")
        const data = await r.json()
        const p = data.product
        if (!p) throw new Error("Not found")
        // Only the seller can edit
        if (user && p.sellerId !== user.id) {
          toast({ title: "Not your listing", variant: "destructive" })
          navigate("marketplace")
          return
        }
        setTitle(p.title)
        setDescription(p.description)
        setPrice(String(p.price))
        setCategory(p.category as ProductCategory)
        setCondition(p.condition as ProductCondition)
        setImages(p.images || [])
        setCollegeId(p.collegeId)
        setCollegeName(p.collegeName)
      })
      .catch(() => {
        toast({ title: "Could not load listing", variant: "destructive" })
        navigate("marketplace")
      })
      .finally(() => setLoadingEdit(false))
  }, [editId, user, navigate, toast])

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!title.trim()) next.title = "Title is required"
    if (!description.trim()) next.description = "Description is required"
    const p = parseFloat(price)
    if (isNaN(p) || p <= 0) next.price = "Price must be greater than 0"
    if (!category) next.category = "Choose a category"
    if (!condition) next.condition = "Choose a condition"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) {
      toast({ title: "Please fix the errors.", variant: "destructive" })
      return
    }
    setSubmitting(true)
    const payload = {
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category,
      condition,
      images,
      collegeId,
      collegeName,
    }
    try {
      if (isEdit && editId) {
        const r = await fetch(`/api/products/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!r.ok) {
          const err = await r.json().catch(() => ({}))
          throw new Error(err.error || "Failed to update")
        }
        const data = await r.json()
        toast({ title: "Listing updated!" })
        navigate("product", { id: data.product.id })
      } else {
        const r = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!r.ok) {
          const err = await r.json().catch(() => ({}))
          throw new Error(err.error || "Failed to post listing")
        }
        const data = await r.json()
        toast({ title: "Listing posted!", description: "Good luck with the sale." })
        navigate("product", { id: data.product.id })
      }
    } catch (e) {
      toast({
        title: isEdit ? "Could not update" : "Could not post",
        description: e instanceof Error ? e.message : "Try again later.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingEdit) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("marketplace")}
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
            <CardTitle className="text-xl">
              {isEdit ? "Edit listing" : "Post a listing"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Engineering Mathematics textbook (Grewal)"
                  maxLength={120}
                  aria-invalid={!!errors.title}
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe condition, edition, what's included, etc."
                  rows={4}
                  maxLength={2000}
                  aria-invalid={!!errors.description}
                />
                {errors.description && (
                  <p className="text-xs text-destructive">{errors.description}</p>
                )}
              </div>

              {/* Price */}
              <div className="space-y-1.5">
                <Label htmlFor="price">Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="price"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="pl-7"
                    aria-invalid={!!errors.price}
                  />
                </div>
                {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={category || undefined}
                  onValueChange={(v) => setCategory(v as ProductCategory)}
                >
                  <SelectTrigger className="w-full" aria-label="Category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-xs text-destructive">{errors.category}</p>
                )}
              </div>

              {/* Condition */}
              <div className="space-y-1.5">
                <Label>Condition</Label>
                <RadioGroup
                  value={condition || undefined}
                  onValueChange={(v) => setCondition(v as ProductCondition)}
                  className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                >
                  {CONDITIONS.map((c) => (
                    <label
                      key={c}
                      htmlFor={`cond-${c}`}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
                        condition === c
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <RadioGroupItem id={`cond-${c}`} value={c} />
                      <span>{c}</span>
                    </label>
                  ))}
                </RadioGroup>
                {errors.condition && (
                  <p className="text-xs text-destructive">{errors.condition}</p>
                )}
              </div>

              {/* Images */}
              <div className="space-y-1.5">
                <Label>Photos</Label>
                <ImageUpload value={images} onChange={setImages} max={4} />
                <p className="text-xs text-muted-foreground">
                  Tip: at least one clear photo helps your listing stand out.
                </p>
              </div>

              {/* College */}
              <div className="space-y-1.5">
                <Label>College</Label>
                <CollegeSelect
                  value={collegeId}
                  onChange={(id, college) => {
                    setCollegeId(id)
                    setCollegeName(college?.name || null)
                  }}
                  placeholder="Select your college"
                />
                <p className="text-xs text-muted-foreground">
                  Used to group your listing with other students on your campus.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("marketplace")}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="gap-2">
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : isEdit ? (
                    <Save className="size-4" />
                  ) : null}
                  {isEdit ? "Save changes" : "Post listing"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
