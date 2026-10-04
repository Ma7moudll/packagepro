"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable, type Column } from "@/components/admin/data-table"
import { useAuth } from "@/providers/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { adminApi, type AdminSample, type Pagination } from "@/lib/api/admin"
import { samplesApi } from "@/lib/api/samples"
import { CheckCircle2, XCircle, Loader2, ImageIcon } from "lucide-react"

/**
 * QA sample review queue — the human gate between sample production and
 * full production run (SPEC-029 success criteria: "QA reviews sample photos,
 * approves production").
 */
export default function AdminSamplesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [samples, setSamples] = useState<AdminSample[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>("pending")
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getSamples({
        page,
        limit: 20,
        status: status === "all" ? undefined : status,
      })
      if (res.success && res.data) {
        setSamples(res.data)
        setPagination(res.pagination ?? null)
      }
    } catch (err) {
      console.error("Failed to load samples:", err)
    } finally {
      setLoading(false)
    }
  }, [page, status])

  useEffect(() => {
    if (!user || user.role !== "ADMIN") return
    load()
  }, [user, load])

  if (!user || user.role !== "ADMIN") return null

  const review = async (sample: AdminSample, action: "approve" | "reject") => {
    let revisionNotes: string | undefined
    if (action === "reject") {
      const answer = window.prompt("Revision notes for the vendor:")
      if (!answer) return
      revisionNotes = answer
    }

    setActing(sample.id)
    try {
      if (action === "approve") {
        await samplesApi.approve(sample.id)
      } else {
        await samplesApi.reject(sample.id, revisionNotes!)
      }
      toast({
        title: action === "approve" ? "Sample approved" : "Revision requested",
        description: `${sample.production?.purchaseOrder?.poNumber ?? "Sample"} — ${
          action === "approve" ? "production continues" : "vendor notified"
        }.`,
      })
      load()
    } catch (err) {
      console.error("Sample review failed:", err)
      toast({ title: "Review action failed", variant: "destructive" })
    } finally {
      setActing(null)
    }
  }

  const columns: Column<AdminSample>[] = [
    {
      header: "Photos",
      cell: (s) => (
        <div className="flex gap-1.5">
          {s.photoUrls.slice(0, 3).map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="block">
              <div className="relative h-12 w-12 rounded-md overflow-hidden bg-slate-100">
                <Image src={url} alt="Sample photo" fill className="object-cover" unoptimized />
              </div>
            </a>
          ))}
          {s.photoUrls.length === 0 && (
            <ImageIcon className="h-6 w-6 text-slate-300" />
          )}
        </div>
      ),
    },
    {
      header: "PO / Order",
      cell: (s) => (
        <div>
          <p className="font-medium text-slate-900 text-sm">
            {s.production?.purchaseOrder?.poNumber ?? "—"}
          </p>
          <p className="text-xs text-slate-400">
            {s.production?.purchaseOrder?.order?.orderNumber ?? ""}
          </p>
        </div>
      ),
    },
    {
      header: "Vendor",
      cell: (s) => (
        <span className="text-sm text-slate-600">
          {s.production?.vendor?.companyName ?? "—"}
        </span>
      ),
    },
    {
      header: "Notes",
      cell: (s) => (
        <p className="text-xs text-slate-500 max-w-40 truncate">
          {s.notes || s.revisionNotes || "—"}
        </p>
      ),
    },
    {
      header: "Status",
      cell: (s) => (
        <Badge
          variant={
            s.status === "approved"
              ? "secondary"
              : s.status === "rejected"
                ? "destructive"
                : "outline"
          }
        >
          {s.status}
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: (s) =>
        s.status === "pending" ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              disabled={acting === s.id}
              onClick={() => review(s, "approve")}
            >
              {acting === s.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-rose-700 border-rose-200 hover:bg-rose-50"
              disabled={acting === s.id}
              onClick={() => review(s, "reject")}
            >
              <XCircle className="h-4 w-4" />
              Revise
            </Button>
          </div>
        ) : (
          <span className="text-xs text-slate-400">
            {s.reviewedAt ? new Date(s.reviewedAt).toLocaleDateString() : "—"}
          </span>
        ),
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">QA Samples</h1>
          <p className="text-sm text-slate-500">
            Review production samples before full-run approval
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sample queue</CardTitle>
          <div className="mt-3 w-52">
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            rows={samples}
            rowKey={(s) => s.id}
            loading={loading}
            emptyMessage={status === "pending" ? "No samples waiting for review" : "No samples found"}
            page={pagination?.page}
            totalPages={pagination?.totalPages}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  )
}
