"use client"

import { Building2 } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/types"

interface ProductCardProps {
  product: Product
  onClick?: () => void
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const cover = product.images?.[0] || "/placeholder.svg"
  const sold = product.status === "SOLD"

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View ${product.title}`}
      className={cn(
        "group overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:shadow-lg",
        "flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
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
            className="absolute left-2 top-2 px-2 py-1 text-xs font-semibold shadow-sm"
          >
            SOLD
          </Badge>
        )}
        <Badge
          variant="secondary"
          className="absolute right-2 top-2 bg-background/90 px-2 py-1 text-xs text-foreground shadow-sm backdrop-blur"
        >
          {product.condition}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-1 font-medium text-foreground">{product.title}</h3>
        <p className="text-lg font-bold text-primary">
          ₹{product.price.toLocaleString("en-IN")}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="size-3 shrink-0 text-primary/70" />
            <span className="truncate">
              {product.collegeName || "Unknown college"}
            </span>
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {format(new Date(product.createdAt), "d MMM yyyy")}
          </span>
        </div>
      </div>
    </button>
  )
}
