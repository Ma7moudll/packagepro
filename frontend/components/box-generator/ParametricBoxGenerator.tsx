"use client"

import { useState } from "react"
import { ParametricBoxGenerator } from "@/lib/box-generator/parametric-generator"
import { DimensionConstraints } from "@/lib/box-generator/constraints"
import { MaterialThicknessSimulator } from "@/lib/box-generator/material-simulation"
import { StructuralIntegrityValidator } from "@/lib/box-generator/structural-validator"
import { BoxDimensions, MaterialProperties, BoxStructure } from "@/lib/box-generator/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { Box3DViewer } from "./Box3DViewer"
import { FoldingAnimation } from "./FoldingAnimation"

export function ParametricBoxGeneratorComponent() {
  const { language } = useLanguage()
  const generator = new ParametricBoxGenerator()
  const constraints = new DimensionConstraints()
  const materialSimulator = new MaterialThicknessSimulator()
  const validator = new StructuralIntegrityValidator()

  const [boxType, setBoxType] = useState<"regular" | "tray" | "sleeve">("regular")
  const [dimensions, setDimensions] = useState<BoxDimensions>({
    width: 200,
    height: 150,
    depth: 100,
    unit: "mm",
  })
  const [materialType, setMaterialType] = useState<string>("cardboard")
  const [structure, setStructure] = useState<BoxStructure | null>(null)
  const [validation, setValidation] = useState<any>(null)

  const materialProperties = materialSimulator.getMaterialProperties(materialType)

  const handleGenerate = () => {
    let newStructure: BoxStructure

    // Apply constraints
    const defaultConstraints = constraints.getDefaultConstraints()
    const constrainedDimensions = constraints.applyConstraints(
      dimensions,
      defaultConstraints
    )

    // Validate dimensions
    const dimensionValidation = constraints.validateDimensions(
      constrainedDimensions,
      defaultConstraints
    )

    if (!dimensionValidation.isValid) {
      setValidation({
        isValid: false,
        errors: dimensionValidation.errors,
        warnings: dimensionValidation.warnings,
      })
      return
    }

    // Generate structure
    if (boxType === "regular") {
      newStructure = generator.generateRegularBox(
        constrainedDimensions,
        materialProperties
      )
    } else if (boxType === "tray") {
      newStructure = generator.generateTrayBox(
        constrainedDimensions,
        materialProperties
      )
    } else {
      newStructure = generator.generateSleeveBox(
        constrainedDimensions,
        materialProperties
      )
    }

    // Apply material thickness
    newStructure = materialSimulator.applyThickness(newStructure)

    // Validate structure
    const structuralValidation = validator.validate(newStructure)
    setValidation(structuralValidation)

    setStructure(newStructure)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {language === "ar" ? "مولد الصناديق البارامترية" : "Parametric Box Generator"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Box Type */}
          <div>
            <Label>
              {language === "ar" ? "نوع الصندوق" : "Box Type"}
            </Label>
            <Select value={boxType} onValueChange={(v) => setBoxType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">
                  {language === "ar" ? "صندوق عادي" : "Regular Box"}
                </SelectItem>
                <SelectItem value="tray">
                  {language === "ar" ? "صينية" : "Tray"}
                </SelectItem>
                <SelectItem value="sleeve">
                  {language === "ar" ? "غلاف" : "Sleeve"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>
                {language === "ar" ? "العرض" : "Width"} *
              </Label>
              <Input
                type="number"
                value={dimensions.width}
                onChange={(e) =>
                  setDimensions({ ...dimensions, width: parseFloat(e.target.value) || 0 })
                }
                min={0}
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "الارتفاع" : "Height"} *
              </Label>
              <Input
                type="number"
                value={dimensions.height}
                onChange={(e) =>
                  setDimensions({ ...dimensions, height: parseFloat(e.target.value) || 0 })
                }
                min={0}
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "العمق" : "Depth"} *
              </Label>
              <Input
                type="number"
                value={dimensions.depth}
                onChange={(e) =>
                  setDimensions({ ...dimensions, depth: parseFloat(e.target.value) || 0 })
                }
                min={0}
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "الوحدة" : "Unit"}
              </Label>
              <Select
                value={dimensions.unit}
                onValueChange={(v) =>
                  setDimensions({ ...dimensions, unit: v as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mm">mm</SelectItem>
                  <SelectItem value="cm">cm</SelectItem>
                  <SelectItem value="inch">inch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Material */}
          <div>
            <Label>
              {language === "ar" ? "المادة" : "Material"}
            </Label>
            <Select value={materialType} onValueChange={setMaterialType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cardboard">
                  {language === "ar" ? "كرتون" : "Cardboard"}
                </SelectItem>
                <SelectItem value="corrugated-cardboard">
                  {language === "ar" ? "كرتون مضلع" : "Corrugated Cardboard"}
                </SelectItem>
                <SelectItem value="kraft-paper">
                  {language === "ar" ? "ورق كرافت" : "Kraft Paper"}
                </SelectItem>
                <SelectItem value="white-cardboard">
                  {language === "ar" ? "كرتون أبيض" : "White Cardboard"}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              {language === "ar" ? "السماكة" : "Thickness"}: {materialProperties.thickness}mm
            </p>
          </div>

          <Button onClick={handleGenerate} className="w-full" size="lg">
            {language === "ar" ? "إنشاء الصندوق" : "Generate Box"}
          </Button>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validation.isValid ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              {language === "ar" ? "نتائج التحقق" : "Validation Results"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {validation.errors.length > 0 && (
              <div className="space-y-2">
                <Label className="text-red-600">
                  {language === "ar" ? "الأخطاء" : "Errors"}
                </Label>
                {validation.errors.map((error: any, index: number) => (
                  <Alert key={index} variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error.message}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="space-y-2">
                <Label className="text-yellow-600">
                  {language === "ar" ? "التحذيرات" : "Warnings"}
                </Label>
                {validation.warnings.map((warning: any, index: number) => (
                  <Alert key={index}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {warning.message}
                      {warning.suggestion && (
                        <p className="text-xs mt-1">{warning.suggestion}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {validation.isValid && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600">
                    {language === "ar" ? "القوة" : "Strength"}
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${validation.strength * 100}%` }}
                      />
                    </div>
                    <span className="text-sm">
                      {(validation.strength * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-600">
                    {language === "ar" ? "الاستقرار" : "Stability"}
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${validation.stability * 100}%` }}
                      />
                    </div>
                    <span className="text-sm">
                      {(validation.stability * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3D Viewer */}
      {structure && (
        <Box3DViewer structure={structure} />
      )}

      {/* Folding Animation */}
      {structure && (
        <FoldingAnimation structure={structure} />
      )}
    </div>
  )
}

