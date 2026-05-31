"use client"

import { useState } from "react"
import { ExportService } from "@/lib/export/export-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Package, Download, Loader2, CheckCircle2, FileText, Scissors, Layers } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { ExportSettings, PrintReadyPackage as PrintPackage } from "@/lib/export/types"

interface PrintReadyPackageProps {
  projectId: string
  settings: ExportSettings
}

export function PrintReadyPackageGenerator({ projectId, settings }: PrintReadyPackageProps) {
  const { language } = useLanguage()
  const exportService = new ExportService()
  const [packageData, setPackageData] = useState<PrintPackage | null>(null)
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [instructions, setInstructions] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)

    try {
      const packageResult = await exportService.generatePrintPackage(projectId, {
        ...settings,
        includeBleed: true,
        includeCropMarks: true,
        includeColorBars: true,
        includeRegistrationMarks: true,
      })
      setPackageData(packageResult)
    } catch (err: any) {
      setError(err.message || (language === "ar" ? "حدث خطأ" : "An error occurred"))
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!packageData) return

    try {
      const blob = await exportService.downloadPrintPackage(packageData.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `print-package-${packageData.name}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading package:", error)
    }
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case "artwork":
        return <FileText className="h-4 w-4" />
      case "die-cut":
        return <Scissors className="h-4 w-4" />
      case "fold-lines":
        return <Layers className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {language === "ar" ? "مولد الحزمة الجاهزة للطباعة" : "Print-Ready Package Generator"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <Label>
              {language === "ar" ? "اسم جهة الاتصال" : "Contact Name"} *
            </Label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>
              {language === "ar" ? "البريد الإلكتروني" : "Email"} *
            </Label>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>
              {language === "ar" ? "الهاتف" : "Phone"} (اختياري)
            </Label>
            <Input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <div>
            <Label>
              {language === "ar" ? "تعليمات خاصة" : "Special Instructions"} (اختياري)
            </Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder={language === "ar" ? "أي تعليمات خاصة للطباعة..." : "Any special printing instructions..."}
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleGenerate}
          disabled={loading || !contactName || !contactEmail}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {language === "ar" ? "جارٍ الإنشاء..." : "Generating..."}
            </>
          ) : (
            <>
              <Package className="h-4 w-4 mr-2" />
              {language === "ar" ? "إنشاء الحزمة" : "Generate Package"}
            </>
          )}
        </Button>

        {packageData && (
          <div className="space-y-4 mt-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {language === "ar"
                  ? "تم إنشاء الحزمة بنجاح"
                  : "Package generated successfully"}
              </AlertDescription>
            </Alert>

            <div>
              <Label className="mb-2 block">
                {language === "ar" ? "الملفات" : "Files"}
              </Label>
              <div className="space-y-2">
                {packageData.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.type)}
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-slate-500">
                          {file.type} • {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{file.format.toUpperCase()}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              {language === "ar" ? "تحميل الحزمة" : "Download Package"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

