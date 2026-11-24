"use client"
import {
  Money,
  MoneySummary,
} from "@/components/admin/money";

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable, type Column } from "@/components/admin/data-table"
import { KPICard } from "@/components/admin/kpi-card"
import { useLanguage } from "@/providers/language-provider"
import { useAuth } from "@/providers/auth-provider"
import { useDebounce } from "@/hooks/use-debounce"
import { adminApi, type AdminOrder, type AdminOverview, type Pagination } from "@/lib/api/admin"
import { Search, ShoppingCart,
  Banknote, Clock, Truck, Loader2 } from "lucide-react"

const ORDER_STATUSES = [
  "pending_review",
  "awaiting_approval",
  "ready_for_routing",
  "vendor_confirmed",
  "in_production",
  "quality_check",
  "ready_to_ship",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
] as const

function statusTone(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "cancelled") return "destructive"
  if (status === "delivered" || status === "completed") return "secondary"
  if (status === "shipped" || status === "in_production") return "default"
  return "outline"
}

export default function AdminOrdersPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { language } = useLanguage()
  const router = useRouter()

  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>("all")
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 350)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Request ownership: only the latest load may commit rows, pagination,
  // error and loading state. A slower older response (or its failure)
  // must never overwrite the result of a newer request.
  const loadSeq = useRef(0)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  const load = useCallback(async () => {
    const seq = ++loadSeq.current
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.getOrders({
        page,
        limit: 20,
        status: status === "all" ? undefined : status,
        search: debouncedSearch || undefined,
      })
      if (seq !== loadSeq.current) return
      if (res.success && res.data) {
        setOrders(res.data)
        setPagination(res.pagination ?? null)
        setError(null)
      } else {
        setOrders([])
        setPagination(null)
        setError("Failed to load orders. Please try again.")
      }
    } catch (err) {
      if (seq !== loadSeq.current) return
      console.error("Failed to load admin orders:", err)
      setOrders([])
      setPagination(null)
      setError("Failed to load orders. Please try again.")
    } finally {
      if (seq === loadSeq.current) setLoading(false)
    }
  }, [page, status, debouncedSearch])

  useEffect(() => {
    if (!user || user.role !== "ADMIN") return
    load()
    return () => { loadSeq.current++ }
  }, [user, load])

  useEffect(() => {
    if (!user || user.role !== "ADMIN") return
    adminApi
      .getOverview()
      .then((res) => setOverview(res.success ? res.data : null))
      .catch(() => setOverview(null))
  }, [user])

  if (!user || user.role !== "ADMIN") return null

  const columns: Column<AdminOrder>[] = [
    {
      header: "Order",
      cell: (o) => (
        <div>
          <p className="font-medium text-slate-900">{o.orderNumber}</p>
          <p className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      header: "Customer",
      cell: (o) => (
        <p className="text-sm text-slate-600 truncate max-w-48">
          {o.customer?.user?.email ?? "—"}
        </p>
      ),
    },
    {
      header: "Items",
      cell: (o) => <span className="text-sm text-slate-600">{o.items?.length ?? 0}</span>,
    },
    {
      header: "Total",
      cell: (o) => (
        <span className="font-medium">
          <Money amount={o.total} currency={o.currency} />
        </span>
      ),
    },
    {
      header: "Status",
      cell: (o) => <Badge variant={statusTone(o.status)}>{o.status.replace(/_/g, " ")}</Badge>,
    },
    {
      header: "PO",
      cell: (o) =>
        o.purchaseOrder ? (
          <Badge variant="outline">{o.purchaseOrder.poNumber}</Badge>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      header: "Tracking",
      cell: (o) =>
        o.shipment?.dhlTrackingNumber ? (
          <span className="text-xs font-mono">{o.shipment.dhlTrackingNumber}</span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      header: "",
      cell: (o) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/orders/${o.id}/approval`}>Review approval</Link>
        </Button>
      ),
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500">All platform orders with production and shipping status</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title="Orders Today" value={overview?.ordersToday ?? "—"} icon={ShoppingCart} loading={!overview} />
        <KPICard
          title="Order value today (not cancelled)"
          value={overview ? (
              <MoneySummary groups={overview.revenueTodayByCurrency} unclassifiedCount={overview.unclassifiedTodayOrderCount} />
            ) : (
              "—"
            )
          }
          icon={Banknote}
          tone="positive"
          loading={!overview}
        />
        <KPICard
          title="Pending Handshakes"
          value={overview?.pendingHandshakes ?? "—"}
          icon={Clock}
          tone={(overview?.pendingHandshakes ?? 0) > 0 ? "warning" : "default"}
          loading={!overview}
        />
        <KPICard
          title="Pending Settlements"
          value={overview?.pendingSettlements ?? "—"}
          icon={Truck}
          tone={(overview?.pendingSettlements ?? 0) > 0 ? "warning" : "default"}
          loading={!overview}
        />
      </div>

      <p role="note" data-admin-release-note className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        {language === "ar" ? "حالات الطلبات أدناه مسجلة للعرض وليست تصريحًا بالشحن. لا يمكن تغيير فحص الجودة أو جاهز للشحن أو تم الشحن يدويًا، حتى بواسطة الإدارة. إجراءات السماح بالشحن وتصحيح هذه الحالات لم تُفعّل بعد." : "The order statuses below are recorded values, not permission to ship. Quality Check, Ready to Ship and Shipped cannot be set manually, including by admins. Shipping release and correction of these statuses are not enabled yet."}
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Orders</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by order number or customer email…"
                className="ps-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {language === "ar" ? "تعذر تحميل الطلبات. حاول مرة أخرى." : error}
            </div>
          )}
          {loading && orders.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={orders}
              rowKey={(o) => o.id}
              loading={loading}
              emptyMessage="No orders match the current filters"
              page={pagination?.page}
              totalPages={pagination?.totalPages}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
