"use client"

import { useState, useEffect } from "react"
import { AssetService } from "@/lib/assets/asset-service"
import { Asset, AssetVersion } from "@/lib/assets/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { History, RotateCcw, Upload, Download } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { formatFileSize } from "@/lib/utils"

interface AssetVersionControlProps {
  asset: Asset
  onVersionChange?: (asset: Asset) => void
}

export function AssetVersionControl({ asset, onVersionChange }: AssetVersionControlProps) {
  const { language } = useLanguage()
  const assetService = new AssetService()
  const [versions, setVersions] = useState<AssetVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadVersions()
  }, [asset.id])

  const loadVersions = async () => {
    try {
      setLoading(true)
      const vers = await assetService.getVersions(asset.id)
      setVersions(vers)
    } catch (error) {
      console.error("Error loading versions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const version = await assetService.createVersion(asset.id, file)
      await loadVersions()
      if (onVersionChange) {
        const updatedAsset = await assetService.getAsset(asset.id)
        onVersionChange(updatedAsset)
      }
    } catch (error) {
      console.error("Error uploading version:", error)
    } finally {
      setUploading(false)
    }
  }

  const handleRestoreVersion = async (versionId: string) => {
    try {
      setLoading(true)
      const restoredAsset = await assetService.restoreVersion(asset.id, versionId)
      await loadVersions()
      if (onVersionChange) {
        onVersionChange(restoredAsset)
      }
    } catch (error) {
      console.error("Error restoring version:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          {language === "ar" ? "التحكم بالإصدارات" : "Version Control"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>
            {language === "ar" ? "رفع إصدار جديد" : "Upload New Version"}
          </Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="file"
              onChange={handleUploadVersion}
              disabled={uploading}
              className="flex-1"
            />
            {uploading && (
              <p className="text-sm text-slate-500">
                {language === "ar" ? "جارٍ الرفع..." : "Uploading..."}
              </p>
            )}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">
            {language === "ar" ? "سجل الإصدارات" : "Version History"}
          </Label>
          {loading ? (
            <p className="text-sm text-slate-500">
              {language === "ar" ? "جارٍ التحميل..." : "Loading..."}
            </p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-slate-500">
              {language === "ar" ? "لا توجد إصدارات" : "No versions"}
            </p>
          ) : (
            <div className="space-y-2">
              {versions
                .sort((a, b) => b.version - a.version)
                .map((version) => (
                  <div
                    key={version.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      version.isCurrent ? "bg-emerald-50 border-emerald-200" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">v{version.version}</span>
                          {version.isCurrent && (
                            <Badge variant="secondary" className="text-xs">
                              {language === "ar" ? "الحالي" : "Current"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(version.createdAt).toLocaleString()}
                        </p>
                        {version.changeLog && (
                          <p className="text-xs text-slate-600 mt-1">{version.changeLog}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          {formatFileSize(version.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!version.isCurrent && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreVersion(version.id)}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          {language === "ar" ? "استعادة" : "Restore"}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <a href={version.url} download>
                          <Download className="h-4 w-4 mr-2" />
                          {language === "ar" ? "تحميل" : "Download"}
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

