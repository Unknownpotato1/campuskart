"use client"

import { useState, useRef, useCallback } from "react"
import imageCompression from "browser-image-compression"
import { Upload, X, ImagePlus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface ImageUploadProps {
  value: string[]
  onChange: (urls: string[]) => void
  max?: number
}

export function ImageUpload({ value, onChange, max = 4 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      const remaining = max - value.length
      if (remaining <= 0) {
        toast({ title: "Maximum reached", description: `You can upload up to ${max} images.`, variant: "destructive" })
        return
      }
      const toUpload = Array.from(files).slice(0, remaining)
      setUploading(true)
      const newUrls: string[] = []
      try {
        for (const file of toUpload) {
          // Compress before upload
          const compressed = await imageCompression(file, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1280,
            useWebWorker: true,
          })
          const formData = new FormData()
          formData.append("file", compressed)
          const res = await fetch("/api/upload", { method: "POST", body: formData })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error || "Upload failed")
          }
          const data = await res.json()
          newUrls.push(data.url)
        }
        onChange([...value, ...newUrls])
        toast({ title: "Images uploaded", description: `${newUrls.length} image(s) added.` })
      } catch (e) {
        toast({
          title: "Upload failed",
          description: e instanceof Error ? e.message : "Could not upload image.",
          variant: "destructive",
        })
      } finally {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ""
      }
    },
    [value, max, onChange, toast]
  )

  const removeImage = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {value.map((url, idx) => (
          <div
            key={idx}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
          >
            <img src={url} alt={`Upload ${idx + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs font-medium">Add image</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="text-xs text-muted-foreground">
        <Upload className="mr-1 inline h-3 w-3" />
        Up to {max} images. Images are compressed automatically before upload.
      </p>
    </div>
  )
}
