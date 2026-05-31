"use client"

import { useState, useEffect } from "react"
import { useAssetStore } from "@/lib/assets/asset-store"
import { AssetService } from "@/lib/assets/asset-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Upload, Grid, List, Trash2, Tag, Folder, Share2 } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { MediaLibrary } from "@/components/assets/MediaLibrary"
import { BrandAssetManager } from "@/components/assets/BrandAssetManager"
import { BulkOperations } from "@/components/assets/BulkOperations"

export default function AssetsPage() {
  const { language } = useLanguage()
  const { setAssets, loading, setFilter, filter } = useAssetStore()
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const assetService = new AssetService()

  useEffect(() => {
    loadAssets()
  }, [])

  useEffect(() => {
    setFilter({ search: searchQuery || undefined })
  }, [searchQuery, setFilter])

  const loadAssets = async () => {
    try {
      const assets = await assetService.listAssets()
      setAssets(assets)
    } catch (error) {
      console.error("Error loading assets:", error)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">
            {language === "ar" ? "مكتبة الوسائط" : "Media Library"}
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
              {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              {language === "ar" ? "رفع" : "Upload"}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={language === "ar" ? "ابحث في الأصول..." : "Search assets..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="library" className="space-y-4">
          <TabsList>
            <TabsTrigger value="library">
              {language === "ar" ? "المكتبة" : "Library"}
            </TabsTrigger>
            <TabsTrigger value="brand">
              {language === "ar" ? "العلامة التجارية" : "Brand Assets"}
            </TabsTrigger>
            <TabsTrigger value="shared">
              {language === "ar" ? "مشترك" : "Shared"}
            </TabsTrigger>
            <TabsTrigger value="bulk">
              {language === "ar" ? "عمليات مجمعة" : "Bulk Operations"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library">
            <MediaLibrary viewMode={viewMode} />
          </TabsContent>

          <TabsContent value="brand">
            <BrandAssetManager />
          </TabsContent>

          <TabsContent value="shared">
            <MediaLibrary viewMode={viewMode} showSharedOnly />
          </TabsContent>

          <TabsContent value="bulk">
            <BulkOperations />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

