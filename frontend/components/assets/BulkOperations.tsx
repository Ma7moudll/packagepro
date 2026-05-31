"use client"

import { useState } from "react"
import { useAssetStore } from "@/lib/assets/asset-store"
import { AssetService } from "@/lib/assets/asset-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, Tag, Folder, Share2, X, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { BulkOperation } from "@/lib/assets/types"

export function BulkOperations() {
  const { language } = useLanguage()
  const { selectedAssets, getFilteredAssets, deselectAll } = useAssetStore()
  const [operation, setOperation] = useState<BulkOperation["type"] | "">("")
  const [operationData, setOperationData] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const selectedCount = selectedAssets.size
  const assetService = new AssetService()

  const handleExecute = async () => {
    if (!operation || selectedCount === 0) return

    setLoading(true)
    setSuccess(false)

    try {
      const bulkOp: BulkOperation = {
        type: operation as any,
        assetIds: Array.from(selectedAssets),
        data: operationData,
      }

      await assetService.bulkOperation(bulkOp)
      setSuccess(true)
      deselectAll()
      setTimeout(() => {
        setSuccess(false)
        setOperation("")
        setOperationData({})
      }, 3000)
    } catch (error) {
      console.error("Error executing bulk operation:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {language === "ar" ? "عمليات الأصول المجمعة" : "Bulk Asset Operations"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedCount > 0 ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {selectedCount}{" "}
                {language === "ar" ? "أصل محدد" : "asset(s) selected"}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertDescription>
                {language === "ar"
                  ? "لم يتم تحديد أي أصول. حدد الأصول من المكتبة أولاً."
                  : "No assets selected. Select assets from the library first."}
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label>
              {language === "ar" ? "العملية" : "Operation"}
            </Label>
            <Select value={operation} onValueChange={(v) => setOperation(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder={language === "ar" ? "اختر العملية" : "Select operation"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="delete">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    {language === "ar" ? "حذف" : "Delete"}
                  </div>
                </SelectItem>
                <SelectItem value="tag">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    {language === "ar" ? "إضافة علامات" : "Add Tags"}
                  </div>
                </SelectItem>
                <SelectItem value="untag">
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4" />
                    {language === "ar" ? "إزالة علامات" : "Remove Tags"}
                  </div>
                </SelectItem>
                <SelectItem value="category">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    {language === "ar" ? "تغيير الفئة" : "Change Category"}
                  </div>
                </SelectItem>
                <SelectItem value="share">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    {language === "ar" ? "مشاركة" : "Share"}
                  </div>
                </SelectItem>
                <SelectItem value="unshare">
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4" />
                    {language === "ar" ? "إلغاء المشاركة" : "Unshare"}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Operation-specific inputs */}
          {operation === "tag" && (
            <div>
              <Label>
                {language === "ar" ? "العلامات" : "Tags"} (مفصولة بفواصل)
              </Label>
              <Input
                value={operationData.tags || ""}
                onChange={(e) =>
                  setOperationData({
                    ...operationData,
                    tags: e.target.value.split(",").map((t) => t.trim()),
                  })
                }
                placeholder={language === "ar" ? "tag1, tag2, tag3" : "tag1, tag2, tag3"}
              />
            </div>
          )}

          {operation === "untag" && (
            <div>
              <Label>
                {language === "ar" ? "العلامات" : "Tags"} (مفصولة بفواصل)
              </Label>
              <Input
                value={operationData.tags || ""}
                onChange={(e) =>
                  setOperationData({
                    ...operationData,
                    tags: e.target.value.split(",").map((t) => t.trim()),
                  })
                }
                placeholder={language === "ar" ? "tag1, tag2, tag3" : "tag1, tag2, tag3"}
              />
            </div>
          )}

          {operation === "category" && (
            <div>
              <Label>
                {language === "ar" ? "الفئة" : "Category"}
              </Label>
              <Select
                value={operationData.category || ""}
                onValueChange={(value) =>
                  setOperationData({ ...operationData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="logos">Logos</SelectItem>
                  <SelectItem value="images">Images</SelectItem>
                  <SelectItem value="icons">Icons</SelectItem>
                  <SelectItem value="templates">Templates</SelectItem>
                  <SelectItem value="fonts">Fonts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {operation === "share" && (
            <div>
              <Label>
                {language === "ar" ? "معرّف المشروع" : "Project ID"}
              </Label>
              <Input
                value={operationData.projectId || ""}
                onChange={(e) =>
                  setOperationData({ ...operationData, projectId: e.target.value })
                }
                placeholder="project-123"
              />
            </div>
          )}

          {success && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {language === "ar"
                  ? "تم تنفيذ العملية بنجاح"
                  : "Operation completed successfully"}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleExecute}
            disabled={!operation || selectedCount === 0 || loading}
            className="w-full"
          >
            {loading
              ? language === "ar"
                ? "جارٍ التنفيذ..."
                : "Executing..."
              : language === "ar"
                ? "تنفيذ"
                : "Execute"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

