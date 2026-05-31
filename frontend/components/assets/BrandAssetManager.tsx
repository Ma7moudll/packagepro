"use client"

import { useState, useEffect } from "react"
import { useAssetStore } from "@/lib/assets/asset-store"
import { AssetService } from "@/lib/assets/asset-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Palette, Type, Image as ImageIcon, Layers } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { Asset } from "@/lib/assets/types"

export function BrandAssetManager() {
  const { language } = useLanguage()
  const { assets, filter, setFilter } = useAssetStore()
  const [selectedBrand, setSelectedBrand] = useState<string>("")
  const brandAssets = assets.filter((asset) => asset.brandId === selectedBrand)

  const brandAssetRoles = [
    { value: "logo", label: language === "ar" ? "شعار" : "Logo", icon: ImageIcon },
    { value: "primary-color", label: language === "ar" ? "لون أساسي" : "Primary Color", icon: Palette },
    { value: "secondary-color", label: language === "ar" ? "لون ثانوي" : "Secondary Color", icon: Palette },
    { value: "font", label: language === "ar" ? "خط" : "Font", icon: Type },
    { value: "pattern", label: language === "ar" ? "نمط" : "Pattern", icon: Layers },
    { value: "icon", label: language === "ar" ? "أيقونة" : "Icon", icon: ImageIcon },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {language === "ar" ? "مدير أصول العلامة التجارية" : "Brand Asset Manager"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>
              {language === "ar" ? "العلامة التجارية" : "Brand"}
            </Label>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger>
                <SelectValue placeholder={language === "ar" ? "اختر علامة تجارية" : "Select brand"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brand-1">Brand 1</SelectItem>
                <SelectItem value="brand-2">Brand 2</SelectItem>
                <SelectItem value="brand-3">Brand 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedBrand && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {brandAssetRoles.map((role) => {
                const roleAssets = brandAssets.filter((asset) =>
                  asset.metadata.title?.toLowerCase().includes(role.value)
                )

                return (
                  <Card key={role.value}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <role.icon className="h-4 w-4" />
                        {role.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {roleAssets.length > 0 ? (
                        <div className="space-y-2">
                          {roleAssets.map((asset) => (
                            <div
                              key={asset.id}
                              className="flex items-center gap-2 p-2 bg-slate-50 rounded"
                            >
                              {asset.thumbnailUrl ? (
                                <img
                                  src={asset.thumbnailUrl}
                                  alt={asset.name}
                                  className="w-12 h-12 rounded object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center">
                                  <ImageIcon className="h-6 w-6 text-slate-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{asset.name}</p>
                                <p className="text-xs text-slate-500">
                                  v{asset.version}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-4">
                          {language === "ar" ? "لا توجد أصول" : "No assets"}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

