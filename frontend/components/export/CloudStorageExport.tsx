"use client"

import { useState } from "react"
import { ExportService } from "@/lib/export/export-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Cloud, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { CloudStorageConfig, ExportSettings } from "@/lib/export/types"

interface CloudStorageExportProps {
  projectId: string
  settings: ExportSettings
}

export function CloudStorageExport({ projectId, settings }: CloudStorageExportProps) {
  const { language } = useLanguage()
  const exportService = new ExportService()
  const [provider, setProvider] = useState<CloudStorageConfig["provider"]>("google-drive")
  const [folderId, setFolderId] = useState("")
  const [folderPath, setFolderPath] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const cloudConfig: CloudStorageConfig = {
        provider,
        ...(folderId && { folderId }),
        ...(folderPath && { folderPath }),
      }

      await exportService.exportToCloud(projectId, settings, cloudConfig)
      setSuccess(true)

      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err: any) {
      setError(err.message || (language === "ar" ? "حدث خطأ" : "An error occurred"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          {language === "ar" ? "التصدير إلى التخزين السحابي" : "Export to Cloud Storage"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>
            {language === "ar" ? "مزود التخزين" : "Storage Provider"}
          </Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="google-drive">Google Drive</SelectItem>
              <SelectItem value="dropbox">Dropbox</SelectItem>
              <SelectItem value="onedrive">OneDrive</SelectItem>
              <SelectItem value="s3">AWS S3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {provider === "google-drive" && (
          <div>
            <Label>
              {language === "ar" ? "معرّف المجلد" : "Folder ID"} (اختياري)
            </Label>
            <Input
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
            />
          </div>
        )}

        {(provider === "dropbox" || provider === "onedrive" || provider === "s3") && (
          <div>
            <Label>
              {language === "ar" ? "مسار المجلد" : "Folder Path"} (اختياري)
            </Label>
            <Input
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="/exports/project-name"
            />
          </div>
        )}

        {success && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              {language === "ar"
                ? "تم التصدير بنجاح إلى التخزين السحابي"
                : "Successfully exported to cloud storage"}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleExport}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {language === "ar" ? "جارٍ التصدير..." : "Exporting..."}
            </>
          ) : (
            <>
              <Cloud className="h-4 w-4 mr-2" />
              {language === "ar" ? "تصدير" : "Export"}
            </>
          )}
        </Button>

        <p className="text-xs text-slate-500">
          {language === "ar"
            ? "ملاحظة: يجب ربط حساب التخزين السحابي أولاً من إعدادات الحساب"
            : "Note: Cloud storage account must be connected first from account settings"}
        </p>
      </CardContent>
    </Card>
  )
}

