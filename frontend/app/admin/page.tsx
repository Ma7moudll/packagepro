"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/providers/auth-provider"
import { analyticsApi, type DashboardSummary } from "@/lib/api/analytics"
import { ordersApi } from "@/lib/api/orders"
import { Package, Users, ShoppingCart, DollarSign, TrendingUp, AlertCircle, Plus, Eye, Loader2 } from "lucide-react"
import Link from "next/link"
import type { Order } from "@shared/types"

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardSummary | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      router.push("/login")
      return
    }

    const fetchData = async () => {
      try {
        const [summaryRes, ordersRes] = await Promise.allSettled([
          analyticsApi.getDashboardSummary(),
          ordersApi.list({ page: 1, limit: 4 }),
        ])

        if (summaryRes.status === "fulfilled") {
          setStats(summaryRes.value)
        }

        if (ordersRes.status === "fulfilled" && ordersRes.value.success && ordersRes.value.data) {
          setRecentOrders(ordersRes.value.data)
        }
      } catch (err) {
        console.error("Error loading admin summary:", err)
        setStats(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, router])

  if (!user || user.role !== "ADMIN") {
    return null
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: "Total Revenue",
      value: stats ? `$${(stats.revenue || 0).toLocaleString()}` : "—",
      change: stats && stats.revenueChange > 0 ? `+${stats.revenueChange}%` : undefined,
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Orders",
      value: stats ? (stats.orders || 0).toLocaleString() : "—",
      change: stats && stats.ordersChange > 0 ? `+${stats.ordersChange}%` : undefined,
      icon: ShoppingCart,
      color: "text-blue-600",
    },
    {
      title: "Customers",
      value: stats ? (stats.users || 0).toLocaleString() : "—",
      change: undefined,
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: "Products",
      value: stats ? (stats.products || 0).toLocaleString() : "—",
      change: stats && stats.productsChange > 0 ? `+${stats.productsChange}%` : undefined,
      icon: Package,
      color: "text-orange-600",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-600">Welcome back, {user.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  {stat.change && (
                    <p className={`text-sm ${stat.color} flex items-center`}>
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {stat.change}
                    </p>
                  )}
                </div>
                <div className="p-3 rounded-full bg-slate-100">
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest customer orders</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/dashboard">
                  <Eye className="h-4 w-4 mr-2" />
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">#{order.orderNumber || order.id}</p>
                      <p className="text-sm text-slate-500">{order.items?.length || 0} items</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${order.total.toLocaleString()}</p>
                      <Badge variant={order.status === "delivered" ? "default" : "outline"}>
                        {order.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-4">No orders yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col" asChild>
                <Link href="/admin/orders">
                  <ShoppingCart className="h-6 w-6 mb-2" />
                  Orders
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col" asChild>
                <Link href="/admin/samples">
                  <AlertCircle className="h-6 w-6 mb-2" />
                  QA Samples
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col" asChild>
                <Link href="/admin/vendors">
                  <Users className="h-6 w-6 mb-2" />
                  Vendors
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col" asChild>
                <Link href="/admin/customers">
                  <Users className="h-6 w-6 mb-2" />
                  Customers
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col" asChild>
                <Link href="/admin/finance">
                  <DollarSign className="h-6 w-6 mb-2" />
                  Finance
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col" asChild>
                <Link href="/admin/analytics">
                  <TrendingUp className="h-6 w-6 mb-2" />
                  Analytics
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col" asChild>
                <Link href="/admin/inventory">
                  <Package className="h-6 w-6 mb-2" />
                  Inventory
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
