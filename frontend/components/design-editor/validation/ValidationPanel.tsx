"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, XCircle, Zap, AlertTriangle } from "lucide-react"
import { fabric } from "fabric"
import { DesignValidator, ValidationResult, ValidationIssue } from "./DesignValidator"
import { useLanguage } from "@/providers/language-provider"

interface ValidationPanelProps {
  canvas: fabric.Canvas | null
  onValidate?: (result: ValidationResult) => void
}

export function ValidationPanel({ canvas, onValidate }: ValidationPanelProps) {
  const { language } = useLanguage()
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const runValidation = () => {
    if (!canvas) return

    setIsValidating(true)
    try {
      const validationResult = DesignValidator.validate(canvas)
      setResult(validationResult)
      if (onValidate) onValidate(validationResult)
    } catch (error) {
      console.error("Validation error:", error)
    } finally {
      setIsValidating(false)
    }
  }

  const autoFixAll = () => {
    if (!canvas || !result) return

    const fixed = DesignValidator.autoFix(canvas, result.issues)
    // Re-run validation after fixes
    setTimeout(() => {
      runValidation()
    }, 100)
  }

  useEffect(() => {
    if (canvas) {
      // Auto-validate on canvas changes
      const validateOnChange = () => {
        runValidation()
      }

      canvas.on("object:added", validateOnChange)
      canvas.on("object:removed", validateOnChange)
      canvas.on("object:modified", validateOnChange)

      // Initial validation
      runValidation()

      return () => {
        canvas.off("object:added", validateOnChange)
        canvas.off("object:removed", validateOnChange)
        canvas.off("object:modified", validateOnChange)
      }
    }
  }, [canvas])

  if (!result) {
    return (
      <div className="p-4 text-center text-slate-500">
        {language === "ar" ? "جاري التحقق..." : "Validating..."}
      </div>
    )
  }

  const hasAutoFixable = result.issues.some((issue) => issue.autoFixable)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              {language === "ar" ? "نتائج التحقق" : "Validation Results"}
            </CardTitle>
            {result.passed ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{language === "ar" ? "الأخطاء" : "Errors"}</span>
            <Badge variant={result.summary.errors > 0 ? "destructive" : "secondary"}>
              {result.summary.errors}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>{language === "ar" ? "التحذيرات" : "Warnings"}</span>
            <Badge variant={result.summary.warnings > 0 ? "default" : "secondary"}>
              {result.summary.warnings}
            </Badge>
          </div>
          {hasAutoFixable && (
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-2"
              onClick={autoFixAll}
            >
              <Zap className="h-4 w-4 mr-2" />
              {language === "ar" ? "إصلاح تلقائي" : "Auto-Fix"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Issues List */}
      {result.issues.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">
            {language === "ar" ? "المشاكل" : "Issues"}
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {result.issues.map((issue, idx) => (
              <Card key={idx} className="p-3">
                <div className="flex items-start gap-2">
                  {issue.type === "error" ? (
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm">{issue.message}</p>
                    {issue.autoFixable && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 h-6 text-xs"
                        onClick={() => {
                          if (issue.autoFix) {
                            issue.autoFix()
                            runValidation()
                          }
                        }}
                      >
                        {language === "ar" ? "إصلاح" : "Fix"}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {result.issues.length === 0 && (
        <div className="text-center py-8 text-green-600">
          <CheckCircle className="h-12 w-12 mx-auto mb-2" />
          <p className="text-sm font-semibold">
            {language === "ar" ? "التحقق ناجح!" : "Validation passed!"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {language === "ar" ? "التصميم جاهز للطباعة" : "Design is print-ready"}
          </p>
        </div>
      )}
    </div>
  )
}

