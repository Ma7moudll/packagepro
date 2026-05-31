"use client"

import { useEffect, useState } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { validateDesign, ValidationResult } from "@/lib/editor/services/validation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

export function ValidationPanel() {
  const { language } = useLanguage()
  const layers = useDesignStore((s) => s.layers)
  const model = useDesignStore((s) => s.model)
  const [result, setResult] = useState<ValidationResult | null>(null)

  useEffect(() => {
    const validation = validateDesign(layers, model.faces, model.dimensions)
    setResult(validation)
  }, [layers, model])

  if (!result) return null

  const getIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case "info":
        return <Info className="h-4 w-4 text-blue-600" />
      default:
        return null
    }
  }

  const getSeverityLabel = (severity: string) => {
    if (language === "ar") {
      switch (severity) {
        case "error":
          return "خطأ"
        case "warning":
          return "تحذير"
        case "info":
          return "معلومة"
        default:
          return ""
      }
    } else {
      return severity.charAt(0).toUpperCase() + severity.slice(1)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {result.passed ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          {language === "ar" ? "فحص التصميم" : "Design Validation"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-4 text-xs">
          <div>
            <span className="font-semibold">{result.summary.errors}</span>{" "}
            {language === "ar" ? "أخطاء" : "errors"}
          </div>
          <div>
            <span className="font-semibold">{result.summary.warnings}</span>{" "}
            {language === "ar" ? "تحذيرات" : "warnings"}
          </div>
          <div>
            <span className="font-semibold">{result.summary.info}</span>{" "}
            {language === "ar" ? "معلومات" : "info"}
          </div>
        </div>

        {result.issues.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {result.issues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-start gap-2 p-2 rounded border border-slate-200 text-xs"
              >
                {getIcon(issue.severity)}
                <div className="flex-1">
                  <div className="font-medium">
                    {getSeverityLabel(issue.severity)}: {issue.message}
                  </div>
                  {issue.suggestion && (
                    <div className="text-slate-500 mt-1">{issue.suggestion}</div>
                  )}
                  {issue.layerId && (
                    <div className="text-slate-400 mt-1">
                      {language === "ar" ? "الطبقة" : "Layer"}: {issue.layerId} •{" "}
                      {language === "ar" ? "الوجه" : "Face"}: {issue.faceId}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {result.issues.length === 0 && (
          <div className="text-center py-4 text-sm text-emerald-600">
            {language === "ar"
              ? "✓ التصميم جاهز للطباعة"
              : "✓ Design is print-ready"}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

