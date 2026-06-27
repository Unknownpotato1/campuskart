"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Search, Store, Plus, Loader2, X } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CollegeSelect } from "@/components/site/college-select"
import { EmptyState } from "@/components/shared/empty-state"
import { ProductGridSkeleton } from "@/components/shared/loading-skeletons"
import { ProductCard } from "./product-card"
import { useNav } from "@/hooks/use-nav"
import { useAuth } from "@/store/auth-store"
import type { Product } from "@/lib/types"

const CATEGORIES = [
  { value: "Books", label: "Books" },
  { value: "Electronics", label: "Electronics" },
  { value: "Lab Equipment", label: "Lab Equipment" },
  { value: "Furniture", label: "Furniture" },
  { value: "Clothing", label: "Clothing" },
  { value: "Other", label: "Other" },
] as const

const CONDITIONS = [
  { value: "New", label: "New" },
  { value: "Like New", label: "Like New" },
  { value: "Good", label: "Good" },
  { value: "Fair", label: "Fair" },
] as const

const PAGE_SIZE = 12

export function MarketplaceView() {
  const { navigate } = useNav()
  const { user } = useAuth()

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [condition, setCondition] = useState<string>("all")
  const [collegeId, setCollegeId] = useState<string | null>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [reachedEnd, setReachedEnd] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const reqIdRef = useRef(0)

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  const buildQuery = useCallback(
    (cursor?: string | null) => {
      const params = new URLSearchParams()
      params.set("limit", String(PAGE_SIZE))
      if (debouncedSearch) params.set("q", debouncedSearch)
      if (category && category !== "all") params.set("category", category)
      if (condition && condition !== "all") params.set("condition", condition)
      if (collegeId) params.set("collegeId", collegeId)
      if (cursor) params.set("cursor", cursor)
      return params.toString()
    },
    [debouncedSearch, category, condition, collegeId]
  )

  // Reset + first fetch on filter change
  useEffect(() => {
    const id = ++reqIdRef.current
    setLoading(true)
    setError(null)
    setReachedEnd(false)
    setProducts([])
    setNextCursor(null)

    fetch(`/api/products?${buildQuery(null)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load listings")
        const data = await r.json()
        if (id !== reqIdRef.current) return
        setProducts(data.products || [])
        setNextCursor(data.nextCursor || null)
        setReachedEnd(!data.nextCursor)
      })
      .catch((e) => {
        if (id !== reqIdRef.current) return
        setError(e instanceof Error ? e.message : "Failed to load listings")
      })
      .finally(() => {
        if (id === reqIdRef.current) setLoading(false)
      })
  }, [buildQuery])

  // Load more (infinite scroll)
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || reachedEnd || loading) return
    setLoadingMore(true)
    try {
      const r = await fetch(`/api/products?${buildQuery(nextCursor)}`)
      if (!r.ok) throw new Error("Failed to load more")
      const data = await r.json()
      setProducts((prev) => {
        const incoming: Product[] = data.products || []
        // Deduplicate by id (defensive against any overlap)
        const seen = new Set(prev.map((p) => p.id))
        const merged = [...prev, ...incoming.filter((p) => !seen.has(p.id))]
        return merged
      })
      setNextCursor(data.nextCursor || null)
      setReachedEnd(!data.nextCursor)
    } catch {
      // Silent — UI continues to show what was loaded
    } finally {
      setLoadingMore(false)
    }
  }, [nextCursor, loadingMore, reachedEnd, loading, buildQuery])

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore()
        }
      },
      { rootMargin: "300px 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  // Group by same-college vs others — only when no college filter active
  const { sameCollege, otherColleges, groupByCollege } = useMemo(() => {
    const same: Product[] = []
    const others: Product[] = []
    if (collegeId) {
      // Filter active — no grouping
      return { sameCollege: products, otherColleges: [], groupByCollege: false }
    }
    for (const p of products) {
      if (user?.collegeId && p.collegeId === user.collegeId) same.push(p)
      else others.push(p)
    }
    return { sameCollege: same, otherColleges: others, groupByCollege: true }
  }, [products, collegeId, user?.collegeId])

  const handleSell = () => navigate("new-listing")

  const showEmpty = !loading && products.length === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Marketplace
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Buy and sell books, electronics, lab gear and more with students near you.
          </p>
        </div>
        <Button onClick={handleSell} className="gap-2 self-start sm:self-auto">
          <Plus className="size-4" />
          Sell something
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or description..."
              className="pl-9"
              aria-label="Search listings"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full lg:w-[150px]" aria-label="Filter by category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger className="w-full lg:w-[140px]" aria-label="Filter by condition">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All conditions</SelectItem>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="col-span-2 sm:col-span-1 lg:w-[220px]">
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
      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : error ? (
        <EmptyState
          icon={<Store className="size-7" />}
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
          icon={<Store className="size-7" />}
          title="No listings found"
          description="Try adjusting filters or be the first to list something."
          action={
            <Button onClick={handleSell} className="gap-2">
              <Plus className="size-4" />
              Sell something
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {groupByCollege && sameCollege.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {user?.collegeName ? `From ${user.collegeName}` : "From your college"}
              </h2>
              <ProductGrid products={sameCollege} navigate={navigate} />
            </section>
          )}

          {groupByCollege && otherColleges.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                From other colleges
              </h2>
              <ProductGrid products={otherColleges} navigate={navigate} />
            </section>
          )}

          {!groupByCollege && products.length > 0 && (
            <ProductGrid products={products} navigate={navigate} />
          )}

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-10 w-full" aria-hidden="true" />
          {loadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          )}
          {reachedEnd && products.length > 0 && (
            <p className="py-2 text-center text-sm text-muted-foreground">
              You&apos;ve reached the end.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ProductGrid({
  products,
  navigate,
}: {
  products: Product[]
  navigate: (view: "product", opts?: { id?: string }) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          whileHover={{ y: -4 }}
        >
          <ProductCard product={p} onClick={() => navigate("product", { id: p.id })} />
        </motion.div>
      ))}
    </div>
  )
}
