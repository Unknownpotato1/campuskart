"use client"

import { useEffect, useState, useMemo } from "react"
import { Check, ChevronsUpDown, Search, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface College {
  id: string
  name: string
  city: string
  state: string
}

interface CollegeSelectProps {
  value: string | null // college id
  onChange: (collegeId: string | null, college?: College) => void
  placeholder?: string
  className?: string
}

export function CollegeSelect({ value, onChange, placeholder = "Select your college", className }: CollegeSelectProps) {
  const [open, setOpen] = useState(false)
  const [colleges, setColleges] = useState<College[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/colleges")
      .then((r) => r.json())
      .then((d) => setColleges(d.colleges || []))
      .finally(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, College[]>()
    for (const c of colleges) {
      if (!map.has(c.state)) map.set(c.state, [])
      map.get(c.state)!.push(c)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [colleges])

  const selected = colleges.find((c) => c.id === value) || null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}
        >
          <span className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0 text-primary" />
            {selected ? selected.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0" align="start">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput placeholder="Search college or city..." className="h-9" />
          </div>
          <CommandList>
            <CommandEmpty>{loading ? "Loading..." : "No college found."}</CommandEmpty>
            <ScrollArea className="h-[300px]">
              {grouped.map(([state, list]) => (
                <CommandGroup key={state} heading={state}>
                  {list.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`${c.name} ${c.city} ${c.state}`}
                      onSelect={() => {
                        onChange(c.id === value ? null : c.id, c)
                        setOpen(false)
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", value === c.id ? "opacity-100" : "opacity-0")} />
                      <div className="flex flex-col">
                        <span>{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.city}, {c.state}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
