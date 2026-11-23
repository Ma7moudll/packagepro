"use client"
import { FinanceSummary } from "@/components/admin/finance-summary";

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { KPICard } from "@/components/admin/kpi-card"
import { useAuth } from "@/providers/auth-provider"
import { financeApi, type FinancialReport } from "@/lib/api/finance"
import { adminApi, type AdminOverview } from "@/lib/api/admin"
import {
  Banknote,
  TrendingUp,
  Receipt,
  Clock,
  BarChart3,
  Loader2,
} from "lucide-react"

type RangeKey = "7d" | "30d" | "90d" | "365d"

const RANGE_START: Record<RangeKey, (end: Date) => Date> = {
  "7d": (end) => new Date(end.getTime() - 7 * 86400000),
  "30d": (end) => new Date(end.getTime() - 30 * 86400000),
  "90d": (end) => new Date(end.getTime() - 90 * 86400000),
  "365d": (end) => new Date(end.getTime() - 365 * 86400000),
}

export default function AdminFinancePage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [report, setReport] = useState<FinancialReport | null>(null)
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [range, setRange] = useState<RangeKey>("30d")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user || user.role !== "ADMIN") return

    const end = new Date()
    const start = RANGE_START[range](end)
    setLoading(true)
    setReport(null);
    setOverview(null);
    Promise.allSettled([
      financeApi.getReport({ start: start.toISOString(), end: end.toISOString() }),
      adminApi.getOverview(),
    ])
      .then(([reportRes, overviewRes]) => {
        if (reportRes.status === "fulfilled" && reportRes.value.success) {
          setReport(reportRes.value.data)
        }
        if (overviewRes.status === "fulfilled" && overviewRes.value.success) {
          setOverview(overviewRes.value.data)
        }
      })
      .catch((err) => console.error("Failed to load finance data:", err))
      .finally(() => setLoading(false))
  }, [user, range])

  if (!user || user.role !== "ADMIN") return null

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finance</h1>
          <p className="text-sm text-slate-500">Revenue by currency and settlement records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="365d">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild variant="outline">
            <Link href="/admin/dashboard">Back</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <div className="mb-6">
            <FinanceSummary report={report} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                {overview && overview.ordersByStatus.length > 0 ? (
                  <div className="space-y-2">
                    {overview.ordersByStatus
                      .sort((a, b) => b.count - a.count)
                      .map((row) => (
                        <div
                          key={row.status}
                          className="flex items-center justify-between rounded-lg border px-3 py-2"
                        >
                          <Badge variant="outline" className="capitalize">
                            {row.status.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-sm font-semibold">{row.count}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No orders yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
