"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CollegeSelect, type College } from "@/components/site/college-select"
import { GraduationCap, Loader2, MapPin } from "lucide-react"
import { useAuth } from "@/store/auth-store"
import { useToast } from "@/hooks/use-toast"

interface OnboardingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When true, show a close affordance (manual edit). */
  dismissable?: boolean
}

export function OnboardingModal({ open, onOpenChange, dismissable = false }: OnboardingModalProps) {
  const { user, setUser } = useAuth()
  const { toast } = useToast()
  const [collegeId, setCollegeId] = useState<string | null>(user?.collegeId || null)
  const [selected, setSelected] = useState<College | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!collegeId || !selected) {
      toast({ title: "Select your college", description: "Please pick your university/college.", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collegeId }),
      })
      if (!res.ok) throw new Error("Failed to save")
      const data = await res.json()
      setUser(data.user)
      toast({ title: "College saved", description: `Welcome from ${selected.name}!` })
      onOpenChange(false)
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={dismissable ? onOpenChange : undefined}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => { if (!dismissable) e.preventDefault() }}>
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <GraduationCap className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center text-2xl">One last step!</DialogTitle>
          <DialogDescription className="text-center">
            Select your university/college so we can show you listings from your campus first.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" /> State &amp; College
            </div>
            <CollegeSelect
              value={collegeId}
              onChange={(id, college) => {
                setCollegeId(id)
                setSelected(college || null)
              }}
              placeholder="Search your college..."
            />
          </div>

          {selected && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <p className="font-medium text-foreground">{selected.name}</p>
              <p className="text-muted-foreground">{selected.city}, {selected.state}</p>
            </div>
          )}

          <Button className="w-full" size="lg" onClick={handleSave} disabled={saving || !collegeId}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GraduationCap className="mr-2 h-4 w-4" />}
            Start exploring CampusKart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
