import { Skeleton } from "@/components/ui/skeleton"

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function WritingCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-12 w-full" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    </div>
  )
}

export function WritingListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <WritingCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ChatSkeleton() {
  return (
    <div className="grid h-[70vh] grid-cols-1 md:grid-cols-[300px_1fr] gap-4">
      <div className="hidden md:block rounded-2xl border border-border bg-card p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-1/2" />
        ))}
      </div>
    </div>
  )
}
