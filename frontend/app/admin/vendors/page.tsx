"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { DataTable, type Column } from "@/components/admin/data-table"
import { KPICard } from "@/components/admin/kpi-card"
import { useAuth } from "@/providers/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { adminApi, type AdminVendor, type Pagination } from "@/lib/api/admin"
import { Factory, CheckCircle2, Star, Loader2 } from "lucide-react"

export default function AdminVendorsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [vendors, setVendors] = useState<AdminVendor[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getVendors({ page, limit: 20 })
      if (res.success && res.data) {
        setVendors(res.data)
        setPagination(res.pagination ?? null)
      }
    } catch (err) {
      console.error("Failed to load vendors:", err)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    if (!user || user.role !== "ADMIN") return
    load()
  }, [user, load])

  if (!user || user.role !== "ADMIN") return null

  const activeCount = vendors.filter((v) => v.isActive).length

  const toggleVendor = async (vendor: AdminVendor) => {
    setToggling(vendor.id)
    try {
      const res = await adminApi.updateVendor(vendor.id, { isActive: !vendor.isActive })
      if (res.success) {
        setVendors((prev) =>
          prev.map((v) => (v.id === vendor.id ? { ...v, isActive: !vendor.isActive } : v))
        )
        toast({
          title: vendor.isActive ? "Vendor deactivated" : "Vendor activated",
          description: `${vendor.companyName} is now ${vendor.isActive ? "inactive" : "active"}.`,
        })
      }
    } catch (err) {
      console.error("Failed to update vendor:", err)
      toast({ title: "Update failed", variant: "destructive" })
    } finally {
      setToggling(null)
    }
  }

  const columns: Column<AdminVendor>[] = [
    {
      header: "Vendor",
      cell: (v) => (
        <div>
          <p className="font-medium text-slate-900">{v.companyName}</p>
          <p className="text-xs text-slate-400">{v.user?.email ?? "—"}</p>
        </div>
      ),
    },
    {
      header: "Location",
      cell: (v) => (
        <span className="text-sm text-slate-600">
          {v.city}, {v.country}
        </span>
      ),
    },
    {
      header: "Rating",
      cell: (v) => (
        <span className="flex items-center gap-1 text-sm">
          <Star className="h-3.5 w-3.5 text-amber-500" />
          {v.qualityRating?.toFixed(1) ?? "—"}
        </span>
      ),
    },
    {
      header: "POs",
      cell: (v) => <span className="text-sm">{v._count?.purchaseOrders ?? 0}</span>,
    },
    {
      header: "In production",
      cell: (v) => <span className="text-sm">{v._count?.productions ?? 0}</span>,
    },
    {
      header: "Status",
      cell: (v) =>
        v.isActive ? (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Active
          </Badge>
        ) : (
          <Badge variant="outline">Inactive</Badge>
        ),
    },
    {
      header: "Enabled",
      cell: (v) => (
        <Switch
          checked={v.isActive}
          disabled={toggling === v.id}
          onCheckedChange={() => toggleVendor(v)}
          aria-label={`Toggle ${v.companyName}`}
        />
      ),
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
          <p className="text-sm text-slate-500">Approve, monitor and manage manufacturing partners</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KPICard title="Vendors (page)" value={vendors.length} icon={Factory} loading={loading} />
        <KPICard
          title="Active (page)"
          value={activeCount}
          icon={CheckCircle2}
          tone="positive"
          loading={loading}
        />
        <KPICard
          title="Total (platform)"
          value={pagination?.total ?? "—"}
          icon={Star}
          loading={!pagination}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vendor directory</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && vendors.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={vendors}
              rowKey={(v) => v.id}
              loading={loading}
              emptyMessage="No vendors registered yet"
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
