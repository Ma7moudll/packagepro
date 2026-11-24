"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface KPICardProps {
  title: string
  value: React.ReactNode;
  icon: LucideIcon
  hint?: string
  tone?: "default" | "positive" | "warning" | "negative"
  loading?: boolean
}

const TONE_CLASSES: Record<NonNullable<KPICardProps["tone"]>, string> = {
  default: "text-slate-600 bg-slate-100",
  positive: "text-emerald-600 bg-emerald-50",
  warning: "text-amber-600 bg-amber-50",
  negative: "text-rose-600 bg-rose-50",
}

export function KPICard({ title, value, icon: Icon, hint, tone = "default", loading }: KPICardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row items-start justify-between">
          <div className="min-w-0 flex-1 w-full">
            <p className="text-sm font-medium text-slate-500 break-words">{title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 break-words">{value}</p>
            {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
          </div>
          <div className={cn("rounded-lg p-2.5 shrink-0", TONE_CLASSES[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
