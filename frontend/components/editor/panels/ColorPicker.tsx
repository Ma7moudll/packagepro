"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pipette, Palette, History, Grid3X3, Search } from "lucide-react"
import chroma from "chroma-js"
import pantoneColors from "pantone-colors"

const PRESET_COLORS = [
  "#000000", "#ffffff", "#dc2626", "#ea580c", "#d97706",
  "#65a30d", "#16a34a", "#0891b2", "#2563eb", "#7c3aed",
  "#db2777", "#be185d", "#f43f5e", "#f97316", "#f59e0b",
  "#84cc16", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6",
  "#ec4899", "#e11d48", "#fdba74", "#fcd34d", "#bef264",
  "#86efac", "#67e8f9", "#93c5fd", "#c4b5fd", "#f9a8d4",
  "#64748b", "#6b7280", "#71717a", "#737373", "#78716c",
  "#94a3b8", "#9ca3af", "#a1a1aa", "#a3a3a3", "#a8a29e",
  "#cbd5e1", "#d1d5db", "#d4d4d4", "#d6d3d1", "#e2e8f0",
]

function hslToHex(h: number, s: number, l: number): string {
  return chroma(h, s, l, "hsl").hex()
}

function hexToHsl(hex: string): [number, number, number] {
  try {
    const c = chroma(hex)
    return [c.get("hsl.h") || 0, c.get("hsl.s") * 100, c.get("hsl.l") * 100]
  } catch {
    return [0, 0, 0]
  }
}

function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex)
}

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
}

export function ColorPicker({ value, onChange, label, showLabel = true, size = "md" }: ColorPickerProps) {
  const [hue, setHue] = useState(() => hexToHsl(value)[0])
  const [sat, setSat] = useState(() => hexToHsl(value)[1])
  const [light, setLight] = useState(() => hexToHsl(value)[2])
  const [hexInput, setHexInput] = useState(value)
  const [activeTab, setActiveTab] = useState("picker")
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      return JSON.parse(localStorage.getItem("cp_recent") || "[]")
    } catch { return [] }
  })

  const hueRef = useRef<HTMLDivElement>(null)
  const satLightRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<"hue" | "satlight" | null>(null)

  useEffect(() => {
    try {
      const c = chroma(value)
      setHue(c.get("hsl.h") || 0)
      setSat(c.get("hsl.s") * 100)
      setLight(c.get("hsl.l") * 100)
      setHexInput(value)
    } catch {}
  }, [value])

  const commitColor = useCallback((hex: string) => {
    if (!isValidHex(hex)) return
    onChange(hex)
    setRecentColors((prev) => {
      const next = [hex, ...prev.filter((c) => c !== hex)].slice(0, 12)
      if (typeof window !== "undefined") {
        localStorage.setItem("cp_recent", JSON.stringify(next))
      }
      return next
    })
  }, [onChange])

  const handleHueChange = useCallback((clientX: number) => {
    if (!hueRef.current) return
    const rect = hueRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const h = x * 360
    setHue(h)
    const hex = hslToHex(h, sat / 100, light / 100)
    setHexInput(hex)
    onChange(hex)
  }, [sat, light, onChange])

  const handleSatLightChange = useCallback((clientX: number, clientY: number) => {
    if (!satLightRef.current) return
    const rect = satLightRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    const s = x * 100
    const l = (1 - y) * 100
    setSat(s)
    setLight(l)
    const hex = hslToHex(hue, s / 100, l / 100)
    setHexInput(hex)
    onChange(hex)
  }, [hue, onChange])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging.current === "hue") handleHueChange(e.clientX)
      if (dragging.current === "satlight") handleSatLightChange(e.clientX, e.clientY)
    }
    const handleMouseUp = () => {
      if (dragging.current) {
        dragging.current = null
        commitColor(hexInput)
      }
    }
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [handleHueChange, handleSatLightChange, commitColor, hexInput])

  const pickerColors = [
    { label: "Red", colors: ["#dc2626", "#ef4444", "#f87171", "#fca5a5", "#fecaca"] },
    { label: "Orange", colors: ["#ea580c", "#f97316", "#fb923c", "#fdba74", "#fed7aa"] },
    { label: "Amber", colors: ["#d97706", "#f59e0b", "#fbbf24", "#fcd34d", "#fde68a"] },
    { label: "Yellow", colors: ["#ca8a04", "#eab308", "#facc15", "#fde047", "#fef08a"] },
    { label: "Lime", colors: ["#65a30d", "#84cc16", "#a3e635", "#bef264", "#d9f99d"] },
    { label: "Green", colors: ["#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0"] },
    { label: "Emerald", colors: ["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0"] },
    { label: "Teal", colors: ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#ccfbf1"] },
    { label: "Cyan", colors: ["#0891b2", "#06b6d4", "#22d3ee", "#67e8f9", "#a5f3fc"] },
    { label: "Sky", colors: ["#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd"] },
    { label: "Blue", colors: ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"] },
    { label: "Indigo", colors: ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"] },
    { label: "Violet", colors: ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"] },
    { label: "Purple", colors: ["#9333ea", "#a855f7", "#c084fc", "#d8b4fe", "#e9d5ff"] },
    { label: "Pink", colors: ["#db2777", "#ec4899", "#f472b6", "#f9a8d4", "#fbcfe8"] },
    { label: "Rose", colors: ["#be185d", "#f43f5e", "#fb7185", "#fda4af", "#ffe4e6"] },
    { label: "Slate", colors: ["#1e293b", "#334155", "#475569", "#64748b", "#94a3b8"] },
    { label: "Gray", colors: ["#374151", "#4b5563", "#6b7280", "#9ca3af", "#d1d5db"] },
    { label: "Zinc", colors: ["#27272a", "#3f3f46", "#52525b", "#71717a", "#a1a1aa"] },
    { label: "Neutral", colors: ["#292524", "#44403c", "#57534e", "#78716c", "#a8a29e"] },
    { label: "Brown", colors: ["#78350f", "#92400e", "#b45309", "#d97706", "#f59e0b"] },
  ]

  const [satLightBg, setSatLightBg] = useState(`linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hslToHex(hue, 1, 0.5)})`)

  useEffect(() => {
    setSatLightBg(`linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hslToHex(hue, 1, 0.5)})`)
  }, [hue])

  const swatchSize = size === "sm" ? "w-7 h-7" : size === "lg" ? "w-10 h-10" : "w-8 h-8"

  const pantoneEntries = Object.entries(pantoneColors).filter(([k]) => !["default", "isDark"].includes(k))
  const filteredPantone = searchQuery
    ? pantoneEntries.filter(([k]) => k.toLowerCase().includes(searchQuery.toLowerCase()))
    : pantoneEntries.slice(0, 50)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative group cursor-pointer overflow-hidden rounded-lg border-2 border-slate-200 hover:border-slate-400 transition-all"
          style={{ width: size === "sm" ? 28 : size === "lg" ? 44 : 36, height: size === "sm" ? 28 : size === "lg" ? 44 : 36 }}
        >
          <div className="w-full h-full rounded-[5px]" style={{ backgroundColor: value }} />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-all rounded-[5px]">
            <Pipette className="text-white opacity-0 group-hover:opacity-100 h-3 w-3 drop-shadow" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start" sideOffset={4}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b px-3 pt-2">
            <TabsList className="w-full h-8">
              <TabsTrigger value="picker" className="flex-1 text-[10px] gap-1">
                <Palette className="h-3 w-3" /> Picker
              </TabsTrigger>
              <TabsTrigger value="palettes" className="flex-1 text-[10px] gap-1">
                <Grid3X3 className="h-3 w-3" /> Palettes
              </TabsTrigger>
              <TabsTrigger value="pantone" className="flex-1 text-[10px] gap-1">
                <Search className="h-3 w-3" /> Pantone
              </TabsTrigger>
              <TabsTrigger value="recent" className="flex-1 text-[10px] gap-1">
                <History className="h-3 w-3" /> Recent
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="picker" className="p-3 space-y-3 mt-0">
            {/* Sat/Light square */}
            <div
              ref={satLightRef}
              className="w-full h-40 rounded-lg cursor-crosshair relative"
              style={{ background: satLightBg }}
              onMouseDown={(e) => { dragging.current = "satlight"; handleSatLightChange(e.clientX, e.clientY) }}
            >
              <div
                className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: `${sat}%`, top: `${100 - light}%`, backgroundColor: hslToHex(hue, sat / 100, light / 100) }}
              />
            </div>

            {/* Hue slider */}
            <div
              ref={hueRef}
              className="w-full h-5 rounded-full relative cursor-ew-resize"
              style={{
                background: "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
              }}
               onMouseDown={(e) => { dragging.current = "hue"; handleHueChange(e.clientX) }}
            >
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 pointer-events-none"
                style={{ left: `${(hue / 360) * 100}%`, backgroundColor: hslToHex(hue, 1, 0.5) }}
              />
            </div>

            {/* Hex input */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg border border-slate-200 shrink-0" style={{ backgroundColor: hexInput }} />
              <Input
                value={hexInput}
                onChange={(e) => {
                  setHexInput(e.target.value)
                  if (isValidHex(e.target.value)) {
                    try {
                      const c = chroma(e.target.value)
                      setHue(c.get("hsl.h") || 0)
                      setSat(c.get("hsl.s") * 100)
                      setLight(c.get("hsl.l") * 100)
                      onChange(e.target.value)
                    } catch {}
                  }
                }}
                onBlur={() => {
                  if (!isValidHex(hexInput)) {
                    setHexInput(value)
                  } else {
                    commitColor(hexInput)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (isValidHex(hexInput)) {
                      commitColor(hexInput)
                    } else {
                      setHexInput(value)
                    }
                  }
                }}
                className="h-8 text-xs font-mono flex-1"
                placeholder="#000000"
              />
            </div>

            {/* Quick swatches */}
            <div className="grid grid-cols-10 gap-1">
              {["#000000", "#ffffff", "#dc2626", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6"].map((c) => (
                <button
                  key={c}
                  className={`rounded border ${c === "#ffffff" ? "border-slate-300" : "border-transparent"} ${swatchSize} cursor-pointer hover:scale-110 transition-transform`}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setHue(hexToHsl(c)[0])
                    setSat(hexToHsl(c)[1])
                    setLight(hexToHsl(c)[2])
                    setHexInput(c)
                    commitColor(c)
                  }}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="palettes" className="mt-0">
            <ScrollArea className="h-72">
              <div className="p-3 space-y-3">
                {pickerColors.map((group) => (
                  <div key={group.label}>
                    <span className="text-[9px] font-medium text-slate-400 mb-1 block">{group.label}</span>
                    <div className="flex gap-1">
                      {group.colors.map((c) => (
                        <button
                          key={c}
                          className={`rounded border border-slate-200 ${size === "sm" ? "w-6 h-6" : "w-7 h-7"} cursor-pointer hover:scale-110 transition-transform`}
                          style={{ backgroundColor: c }}
                          onClick={() => {
                            setHue(hexToHsl(c)[0])
                            setSat(hexToHsl(c)[1])
                            setLight(hexToHsl(c)[2])
                            setHexInput(c)
                            commitColor(c)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="pantone" className="mt-0">
            <div className="p-2 border-b">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Pantone..."
                className="h-7 text-xs"
              />
            </div>
            <ScrollArea className="h-64">
              <div className="p-2 grid grid-cols-5 gap-1">
                {filteredPantone.map(([code, hex]) => (
                  <button
                    key={code}
                    className="aspect-square rounded border border-slate-200 cursor-pointer hover:scale-110 transition-transform relative group"
                    style={{ backgroundColor: hex as string }}
                    title={`Pantone ${code}`}
                    onClick={() => {
                      const h = hex as string
                      setHue(hexToHsl(h)[0])
                      setSat(hexToHsl(h)[1])
                      setLight(hexToHsl(h)[2])
                      setHexInput(h)
                      commitColor(h)
                    }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-[6px] font-bold text-white opacity-0 group-hover:opacity-100 bg-black/40 rounded">
                      {code}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="recent" className="mt-0">
            <ScrollArea className="h-48">
              <div className="p-3">
                {recentColors.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No recent colors yet</p>
                ) : (
                  <div className="grid grid-cols-6 gap-2">
                    {recentColors.map((c) => (
                      <button
                        key={c}
                        className="aspect-square rounded-lg border border-slate-200 cursor-pointer hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                        onClick={() => {
                          setHue(hexToHsl(c)[0])
                          setSat(hexToHsl(c)[1])
                          setLight(hexToHsl(c)[2])
                          setHexInput(c)
                          commitColor(c)
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
