"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, Package, Edit, Trash2, Search, Filter, BarChart3 } from "lucide-react"

interface InventoryItem {
  id: string
  name: string
  sku: string
  category: string
  currentStock: number
  minStock: number
  maxStock: number
  unitCost: number
  supplier: string
  lastRestocked: string
  status: "in-stock" | "low-stock" | "out-of-stock"
}

const inventoryData: InventoryItem[] = []

export function InventoryManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const filteredInventory = inventoryData.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in-stock":
        return <Badge className="bg-green-100 text-green-800">In Stock</Badge>
      case "low-stock":
        return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>
      case "out-of-stock":
        return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const lowStockItems = inventoryData.filter((item) => item.status === "low-stock" || item.status === "out-of-stock")
  const totalValue = inventoryData.reduce((sum, item) => sum + item.currentStock * item.unitCost, 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Items</p>
                <p className="text-2xl font-bold">{inventoryData.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Inventory Value</p>
                <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Categories</p>
                <p className="text-2xl font-bold">{new Set(inventoryData.map((item) => item.category)).size}</p>
              </div>
              <Package className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Inventory List</TabsTrigger>
          <TabsTrigger value="alerts">Stock Alerts</TabsTrigger>
          <TabsTrigger value="add">Add Product</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder="Search by name or SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="w-full md:w-48">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="all">All Categories</option>
                    <option value="Corrugated">Corrugated</option>
                    <option value="Paper Cups">Paper Cups</option>
                    <option value="Gift Boxes">Gift Boxes</option>
                    <option value="Shopping Bags">Shopping Bags</option>
                  </select>
                </div>
                <Button>
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Table */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items</CardTitle>
              <CardDescription>Manage your product inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Min/Max</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                        Inventory tracking is not connected to the backend yet. Stock levels will appear here once the
                        inventory module is available.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredInventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.currentStock}</TableCell>
                      <TableCell>
                        {item.minStock}/{item.maxStock}
                      </TableCell>
                      <TableCell>${item.unitCost}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                Stock Alerts
              </CardTitle>
              <CardDescription>Items that need immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockItems.length === 0 && (
                  <p className="text-center text-slate-500 py-10">
                    Inventory tracking is not connected to the backend yet. Low-stock alerts will appear here once the
                    inventory module is available.
                  </p>
                )}
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-slate-600">
                        Current: {item.currentStock} | Minimum: {item.minStock}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(item.status)}
                      <Button size="sm">Restock</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Product</CardTitle>
              <CardDescription>Add a new item to your inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-slate-500 py-10">
                Adding inventory items is not available yet. The inventory module is not connected to the backend.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
