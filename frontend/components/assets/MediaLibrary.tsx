"use client"

import { useState, useEffect } from "react"
import { useAssetStore } from "@/lib/assets/asset-store"
import { Asset } from "@/lib/assets/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Image, File, Video, Music, Download, Eye, MoreVertical, Tag, Folder } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { formatFileSize } from "@/lib/utils"

interface MediaLibraryProps {
  viewMode: "grid" | "list"
  showSharedOnly?: boolean
}

export function MediaLibrary({ viewMode, showSharedOnly = false }: MediaLibraryProps) {
  const { language } = useLanguage()
  const {
    getFilteredAssets,
    selectedAssets,
    toggleSelection,
    selectAll,
    deselectAll,
    filter,
    setFilter,
    sort,
    setSort,
  } = useAssetStore()

  const assets = getFilteredAssets().filter((asset) => {
    if (showSharedOnly) {
      return asset.isShared
    }
    return true
  })

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="h-8 w-8 text-blue-500" />
      case "video":
        return <Video className="h-8 w-8 text-purple-500" />
      case "document":
        return <File className="h-8 w-8 text-green-500" />
      case "font":
        return <Music className="h-8 w-8 text-orange-500" />
      default:
        return <File className="h-8 w-8 text-slate-400" />
    }
  }

  if (viewMode === "grid") {
    return (
      <div className="space-y-4">
        {/* Filters and Sort */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select
              value={filter.category?.[0] || "all"}
              onValueChange={(value) =>
                setFilter({ category: value === "all" ? undefined : [value] })
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder={language === "ar" ? "الفئة" : "Category"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {language === "ar" ? "الكل" : "All Categories"}
                </SelectItem>
                <SelectItem value="logos">Logos</SelectItem>
                <SelectItem value="images">Images</SelectItem>
                <SelectItem value="icons">Icons</SelectItem>
                <SelectItem value="templates">Templates</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sort.field}
              onValueChange={(value) =>
                setSort({ ...sort, field: value as any })
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uploadedAt">
                  {language === "ar" ? "تاريخ الرفع" : "Upload Date"}
                </SelectItem>
                <SelectItem value="name">
                  {language === "ar" ? "الاسم" : "Name"}
                </SelectItem>
                <SelectItem value="size">
                  {language === "ar" ? "الحجم" : "Size"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              {language === "ar" ? "تحديد الكل" : "Select All"}
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              {language === "ar" ? "إلغاء التحديد" : "Deselect All"}
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              isSelected={selectedAssets.has(asset.id)}
              onSelect={() => toggleSelection(asset.id)}
              getIcon={getAssetIcon}
            />
          ))}
        </div>

        {assets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">
              {language === "ar" ? "لا توجد أصول" : "No assets found"}
            </p>
          </div>
        )}
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
        <div className="flex items-center gap-4 flex-1">
          <Checkbox
            checked={selectedAssets.size === assets.length && assets.length > 0}
            onCheckedChange={(checked) => (checked ? selectAll() : deselectAll())}
          />
          <span className="text-sm font-medium w-32">
            {language === "ar" ? "الاسم" : "Name"}
          </span>
          <span className="text-sm font-medium w-24">
            {language === "ar" ? "النوع" : "Type"}
          </span>
          <span className="text-sm font-medium w-24">
            {language === "ar" ? "الحجم" : "Size"}
          </span>
          <span className="text-sm font-medium w-32">
            {language === "ar" ? "التاريخ" : "Date"}
          </span>
        </div>
      </div>

      {assets.map((asset) => (
        <div
          key={asset.id}
          className="flex items-center justify-between p-4 bg-white rounded-lg border hover:bg-slate-50"
        >
          <div className="flex items-center gap-4 flex-1">
            <Checkbox
              checked={selectedAssets.has(asset.id)}
              onCheckedChange={() => toggleSelection(asset.id)}
            />
            <div className="flex items-center gap-3">
              {getAssetIcon(asset.type)}
              <div>
                <p className="font-medium">{asset.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {asset.category && (
                    <Badge variant="outline" className="text-xs">
                      <Folder className="h-3 w-3 mr-1" />
                      {asset.category}
                    </Badge>
                  )}
                  {asset.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <span className="text-sm text-slate-600 w-24">{asset.type}</span>
            <span className="text-sm text-slate-600 w-24">
              {formatFileSize(asset.size)}
            </span>
            <span className="text-sm text-slate-600 w-32">
              {new Date(asset.uploadedAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function AssetCard({
  asset,
  isSelected,
  onSelect,
  getIcon,
}: {
  asset: Asset
  isSelected: boolean
  onSelect: () => void
  getIcon: (type: string) => React.ReactNode
}) {
  const { language } = useLanguage()

  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-emerald-500" : ""
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-0">
        <div className="relative aspect-square bg-slate-100 rounded-t-lg overflow-hidden">
          {asset.thumbnailUrl ? (
            <img
              src={asset.thumbnailUrl}
              alt={asset.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {getIcon(asset.type)}
            </div>
          )}
          {isSelected && (
            <div className="absolute top-2 right-2">
              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
          )}
          {asset.version > 1 && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-xs">
                v{asset.version}
              </Badge>
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="font-medium text-sm truncate">{asset.name}</p>
          <p className="text-xs text-slate-500 mt-1">
            {formatFileSize(asset.size)}
          </p>
          {asset.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {asset.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

