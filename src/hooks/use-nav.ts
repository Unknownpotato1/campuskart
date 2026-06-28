"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"

export type View =
  | "home"
  | "marketplace"
  | "product"
  | "writing"
  | "chat"
  | "profile"
  | "new-listing"
  | "new-writing"
  | "edit-listing"

export interface NavState {
  view: View
  id: string | null
  conv: string | null // selected conversation id
  extra: Record<string, string>
}

export function useNav() {
  const router = useRouter()
  const sp = useSearchParams()

  const state: NavState = useMemo(() => {
    const view = (sp.get("view") as View) || "home"
    const id = sp.get("id")
    const conv = sp.get("conv")
    const extra: Record<string, string> = {}
    sp.forEach((value, key) => {
      if (!["view", "id", "conv"].includes(key)) extra[key] = value
    })
    return { view, id: id || null, conv: conv || null, extra }
  }, [sp])

  const navigate = useCallback(
    (view: View, opts?: { id?: string | null; conv?: string | null; extra?: Record<string, string> }) => {
      const params = new URLSearchParams()
      params.set("view", view)
      if (opts?.id) params.set("id", opts.id)
      if (opts?.conv) params.set("conv", opts.conv)
      if (opts?.extra) {
        for (const [k, v] of Object.entries(opts.extra)) params.set(k, v)
      }
      router.push(`/?${params.toString()}`)
      // scroll to top on view change
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
    },
    [router]
  )

  return { ...state, navigate }
}
