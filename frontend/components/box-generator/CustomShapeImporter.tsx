"use client"

import { useState } from "react"
import { CustomShapeImporter } from "@/lib/box-generator/model-importer"
import { MaterialProperties } from "@/lib/box-generator/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, File, AlertCircle, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { MaterialThicknessSimulator } from "@/lib/box-generator/material-simulation"

interface CustomShapeImporterProps {
  onImport: (structure: any) => void
}

export function CustomShapeImporterComponent({ onImport }: CustomShapeImporterProps) {
  const { language } = useLanguage()
  const importer = new CustomShapeImporter()
  const materialSimulator = new MaterialThicknessSimulator()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validation, setValidation] = useState<any>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)
    setValidation(null)

    // Validate file
    const validationResult = importer.validateModel(selectedFile)
    setValidation(validationResult)

    if (!validationResult.isValid) {
      setError(validationResult.errors.join(", "))
      return
    }

    // Import model
    setLoading(true)
    try {
      const material = materialSimulator.getMaterialProperties("cardboard")
      let structure = null

      const extension = selectedFile.name
        .substring(selectedFile.name.lastIndexOf("."))
        .toLowerCase()

      if (extension === ".gltf" || extension === ".glb") {
        structure = await importer.importGLTFModel(selectedFile, material)
      } else if (extension === ".obj") {
        structure = await importer.importOBJModel(selectedFile, material)
      } else if (extension === ".stl") {
        structure = await importer.importSTLModel(selectedFile, material)
      }

      if (structure) {
        onImport(structure)
      } else {
        setError(language === "ar" ? "فشل استيراد النموذج" : "Failed to import model")
      }
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
          {language === "ar" ? "استيراد شكل مخصص" : "Import Custom Shape"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>
            {language === "ar" ? "ملف النموذج 3D" : "3D Model File"}
          </Label>
          <div className="mt-2">
            <Input
              type="file"
              accept=".gltf,.glb,.obj,.stl,.fbx"
              onChange={handleFileSelect}
              disabled={loading}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {language === "ar"
              ? "الصيغ المدعومة: GLTF, GLB, OBJ, STL, FBX"
              : "Supported formats: GLTF, GLB, OBJ, STL, FBX"}
          </p>
        </div>

        {file && (
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
            <File className="h-5 w-5 text-slate-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-slate-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        )}

        {validation && (
          <div>
            {validation.isValid ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {language === "ar"
                    ? "الملف صالح للاستيراد"
                    : "File is valid for import"}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {validation.errors.map((err: string, index: number) => (
                    <p key={index}>{err}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="text-center py-4">
            <p className="text-sm text-slate-500">
              {language === "ar" ? "جارٍ الاستيراد..." : "Importing..."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

