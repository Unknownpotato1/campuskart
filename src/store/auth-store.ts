"use client"

import { create } from "zustand"

export interface CurrentUser {
  id: string
  email: string
  name: string
  photo: string | null
  phone: string | null
  collegeId: string | null
  collegeName: string | null
  city: string | null
  state: string | null
  onboarded: boolean
}

interface AuthState {
  user: CurrentUser | null
  loading: boolean
  setUser: (u: CurrentUser | null) => void
  setLoading: (b: boolean) => void
  fetchUser: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (u) => set({ user: u }),
  setLoading: (b) => set({ loading: b }),
  fetchUser: async () => {
    try {
      const res = await fetch("/api/auth/me")
      const data = await res.json()
      set({ user: data.user || null, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    set({ user: null })
  },
}))
