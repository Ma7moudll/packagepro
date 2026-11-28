"use client"
import {
  Money,
  MoneySummary,
  mergeMoneyGroups,
} from "@/components/admin/money";

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/admin/data-table"
import { KPICard } from "@/components/admin/kpi-card"
import { useLanguage } from "@/providers/language-provider"
import { useAuth } from "@/providers/auth-provider"
import { useDebounce } from "@/hooks/use-debounce"
import { adminApi, type AdminCustomer, type Pagination } from "@/lib/api/admin"
import { Search, Users, Banknote, Loader2 } from "lucide-react"

export default function AdminCustomersPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { language } = useLanguage()
  const router = useRouter()

  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
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
      const res = await adminApi.getCustomers({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
      })
      if (seq !== loadSeq.current) return
      if (res.success && res.data) {
        setCustomers(res.data)
        setPagination(res.pagination ?? null)
        setError(null)
      } else {
        setCustomers([])
        setPagination(null)
        setError("Failed to load customers. Please try again.")
      }
    } catch (err) {
      if (seq !== loadSeq.current) return
      console.error("Failed to load customers:", err)
      setCustomers([])
      setPagination(null)
      setError("Failed to load customers. Please try again.")
    } finally {
      if (seq === loadSeq.current) setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    if (!user || user.role !== "ADMIN") return
    load()
    return () => { loadSeq.current++ }
  }, [user, load])

  if (!user || user.role !== "ADMIN") return null

  const totalLtv = customers.every((c) => c.lifetimeValueByCurrency)
    ? mergeMoneyGroups(customers.flatMap((c) => c.lifetimeValueByCurrency!))
    : undefined;
  const repeatBuyers = customers.filter((c) => c.ordersCount > 1).length

  const columns: Column<AdminCustomer>[] = [
    {
      header: "Customer",
      cell: (c) => (
        <div>
          <p className="font-medium text-slate-900">
            {[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}
          </p>
          <p className="text-xs text-slate-400">{c.email ?? "—"}</p>
        </div>
      ),
    },
    {
      header: "Member since",
      cell: (c) => (
        <span className="text-sm text-slate-600">
          {c.memberSince ? new Date(c.memberSince).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      header: "Orders",
      cell: (c) => <span className="text-sm font-medium">{c.ordersCount}</span>,
    },
    {
      header: "Order value (not cancelled)",
      cell: (c) => (
        <span className="font-medium text-emerald-700">
          <MoneySummary groups={c.lifetimeValueByCurrency} unclassifiedCount={c.unclassifiedOrderCount} />
        </span>
      ),
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">Customer list with lifetime value metrics</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KPICard title="Customers (page)" value={customers.length} icon={Users} loading={loading} />
        <KPICard title="Repeat buyers (page)" value={repeatBuyers} icon={Users} loading={loading} />
        <KPICard
          title="Order value on page"
          value={<MoneySummary groups={totalLtv} unclassifiedCount={customers.reduce((n,c)=>n+(c.unclassifiedOrderCount??0),0)} />}
          icon={Banknote}
          tone="positive"
          loading={loading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All customers</CardTitle>
          <div className="relative mt-3 max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or email…"
              className="ps-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {language === "ar" ? "تعذر تحميل العملاء. حاول مرة أخرى." : error}
            </div>
          )}
          {loading && customers.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={customers}
              rowKey={(c) => c.id}
              loading={loading}
              emptyMessage="No customers match the search"
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
