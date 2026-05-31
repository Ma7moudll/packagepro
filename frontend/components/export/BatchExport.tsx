"use client"

import { useState } from "react"
import { useProjectStore } from "@/lib/projects/project-store"
import { useExportStore } from "@/lib/export/export-store"
import { ExportService } from "@/lib/export/export-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Cloud, FileArchive, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { BatchExportRequest, ExportSettings } from "@/lib/export/types"

export function BatchExport() {
  const { language } = useLanguage()
  const { getFilteredProjects, selectedProjects } = useProjectStore()
  const { presets, addJob } = useExportStore()
  const exportService = new ExportService()
  const [presetId, setPresetId] = useState<string>("")
  const [outputFormat, setOutputFormat] = useState<"individual" | "zip" | "cloud">("zip")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const selectedCount = selectedProjects.size
  const projects = getFilteredProjects().filter((p) => selectedProjects.has(p.id))

  const handleExport = async () => {
    if (selectedCount === 0) {
      setError(language === "ar" ? "لم يتم تحديد أي مشاريع" : "No projects selected")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const preset = presets.find((p) => p.id === presetId)
      const settings: ExportSettings = preset
        ? preset.settings
        : {
            dpi: 300,
            quality: 100,
            colorMode: "cmyk",
            format: "pdf",
            includeBleed: true,
            bleedSize: 3,
            includeCropMarks: true,
            includeColorBars: false,
            includeRegistrationMarks: false,
          }

      const request: BatchExportRequest = {
        projectIds: Array.from(selectedProjects),
        presetId: presetId || undefined,
        settings,
        outputFormat,
      }

      const job = await exportService.batchExport(request)
      addJob(job)
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
        <CardTitle>
          {language === "ar" ? "التصدير المجمع" : "Batch Export"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedCount > 0 ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              {selectedCount}{" "}
              {language === "ar" ? "مشروع محدد" : "project(s) selected"}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {language === "ar"
                ? "لم يتم تحديد أي مشاريع. حدد المشاريع من قائمة المشاريع أولاً."
                : "No projects selected. Select projects from the projects list first."}
            </AlertDescription>
          </Alert>
        )}

        <div>
          <Label>
            {language === "ar" ? "إعدادات التصدير" : "Export Preset"}
          </Label>
          <Select value={presetId} onValueChange={setPresetId}>
            <SelectTrigger>
              <SelectValue placeholder={language === "ar" ? "اختر الإعدادات" : "Select preset"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">
                {language === "ar" ? "إعدادات مخصصة" : "Custom Settings"}
              </SelectItem>
              {presets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>
            {language === "ar" ? "تنسيق الإخراج" : "Output Format"}
          </Label>
          <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  {language === "ar" ? "ملفات منفصلة" : "Individual Files"}
                </div>
              </SelectItem>
              <SelectItem value="zip">
                <div className="flex items-center gap-2">
                  <FileArchive className="h-4 w-4" />
                  ZIP {language === "ar" ? "ملف" : "File"}
                </div>
              </SelectItem>
              <SelectItem value="cloud">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  {language === "ar" ? "التخزين السحابي" : "Cloud Storage"}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {success && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              {language === "ar"
                ? "تم بدء التصدير بنجاح"
                : "Export started successfully"}
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
          disabled={selectedCount === 0 || loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {language === "ar" ? "جارٍ التصدير..." : "Exporting..."}
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              {language === "ar" ? "تصدير" : "Export"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

