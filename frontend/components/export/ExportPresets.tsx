"use client"

import { useState, useEffect } from "react"
import { useExportStore } from "@/lib/export/export-store"
import { ExportService } from "@/lib/export/export-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Star } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { ExportPreset, ExportSettings } from "@/lib/export/types"

export function ExportPresets() {
  const { language } = useLanguage()
  const { presets, setPresets, deletePreset } = useExportStore()
  const exportService = new ExportService()
  const [editingPreset, setEditingPreset] = useState<ExportPreset | null>(null)

  useEffect(() => {
    loadPresets()
  }, [])

  const loadPresets = async () => {
    try {
      const presetsData = await exportService.getPresets()
      setPresets(presetsData)
    } catch (error) {
      console.error("Error loading presets:", error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await exportService.deletePreset(id)
      deletePreset(id)
    } catch (error) {
      console.error("Error deleting preset:", error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {language === "ar" ? "إعدادات التصدير المسبقة" : "Export Presets"}
        </h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {language === "ar" ? "إعداد جديد" : "New Preset"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {language === "ar" ? "إعدادات تصدير جديدة" : "New Export Preset"}
              </DialogTitle>
            </DialogHeader>
            <PresetForm
              preset={editingPreset}
              onSuccess={() => {
                setEditingPreset(null)
                loadPresets()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {presets.map((preset) => (
          <Card key={preset.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  {preset.name}
                  {preset.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      {language === "ar" ? "افتراضي" : "Default"}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingPreset(preset)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(preset.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {preset.description && (
                <p className="text-sm text-slate-600 mb-3">{preset.description}</p>
              )}
              <div className="space-y-1 text-xs text-slate-500">
                <p>
                  {language === "ar" ? "التنسيق" : "Format"}: {preset.settings.format.toUpperCase()}
                </p>
                <p>
                  DPI: {preset.settings.dpi}
                </p>
                <p>
                  {language === "ar" ? "جودة" : "Quality"}: {preset.settings.quality}%
                </p>
                <p>
                  {language === "ar" ? "وضع الألوان" : "Color Mode"}: {preset.settings.colorMode.toUpperCase()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {presets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">
            {language === "ar" ? "لا توجد إعدادات مسبقة" : "No presets yet"}
          </p>
        </div>
      )}

      {editingPreset && (
        <Dialog open={!!editingPreset} onOpenChange={(open) => !open && setEditingPreset(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {language === "ar" ? "تعديل الإعدادات" : "Edit Preset"}
              </DialogTitle>
            </DialogHeader>
            <PresetForm
              preset={editingPreset}
              onSuccess={() => {
                setEditingPreset(null)
                loadPresets()
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function PresetForm({
  preset,
  onSuccess,
}: {
  preset: ExportPreset | null
  onSuccess: () => void
}) {
  const { language } = useLanguage()
  const exportService = new ExportService()
  const [name, setName] = useState(preset?.name || "")
  const [description, setDescription] = useState(preset?.description || "")
  const [settings, setSettings] = useState<ExportSettings>(
    preset?.settings || {
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
  )
  const [isDefault, setIsDefault] = useState(preset?.isDefault || false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (preset) {
        await exportService.updatePreset(preset.id, {
          name,
          description,
          settings,
          isDefault,
        })
      } else {
        await exportService.createPreset({
          name,
          description,
          format: settings.format,
          settings,
          isDefault,
        })
      }
      onSuccess()
    } catch (error) {
      console.error("Error saving preset:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>
          {language === "ar" ? "الاسم" : "Name"} *
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <Label>
          {language === "ar" ? "الوصف" : "Description"}
        </Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <Label>
          {language === "ar" ? "التنسيق" : "Format"} *
        </Label>
        <Select
          value={settings.format}
          onValueChange={(value) =>
            setSettings({ ...settings, format: value as any })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="png">PNG</SelectItem>
            <SelectItem value="jpg">JPG</SelectItem>
            <SelectItem value="svg">SVG</SelectItem>
            <SelectItem value="gltf">GLTF</SelectItem>
            <SelectItem value="zip">ZIP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>
          DPI: {settings.dpi}
        </Label>
        <Slider
          value={[settings.dpi]}
          onValueChange={([value]) => setSettings({ ...settings, dpi: value })}
          min={72}
          max={600}
          step={1}
        />
      </div>

      <div>
        <Label>
          {language === "ar" ? "الجودة" : "Quality"}: {settings.quality}%
        </Label>
        <Slider
          value={[settings.quality]}
          onValueChange={([value]) => setSettings({ ...settings, quality: value })}
          min={0}
          max={100}
          step={1}
        />
      </div>

      <div>
        <Label>
          {language === "ar" ? "وضع الألوان" : "Color Mode"}
        </Label>
        <Select
          value={settings.colorMode}
          onValueChange={(value) =>
            setSettings({ ...settings, colorMode: value as any })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rgb">RGB</SelectItem>
            <SelectItem value="cmyk">CMYK</SelectItem>
            <SelectItem value="grayscale">Grayscale</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={settings.includeBleed}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, includeBleed: checked as boolean })
            }
          />
          <Label>
            {language === "ar" ? "تضمين الهامش" : "Include Bleed"}
          </Label>
        </div>

        {settings.includeBleed && (
          <div className="ml-6">
            <Label>
              {language === "ar" ? "حجم الهامش" : "Bleed Size"} (mm): {settings.bleedSize}
            </Label>
            <Slider
              value={[settings.bleedSize]}
              onValueChange={([value]) => setSettings({ ...settings, bleedSize: value })}
              min={0}
              max={10}
              step={0.5}
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Checkbox
            checked={settings.includeCropMarks}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, includeCropMarks: checked as boolean })
            }
          />
          <Label>
            {language === "ar" ? "تضمين علامات القطع" : "Include Crop Marks"}
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={settings.includeColorBars}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, includeColorBars: checked as boolean })
            }
          />
          <Label>
            {language === "ar" ? "تضمين أشرطة الألوان" : "Include Color Bars"}
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={settings.includeRegistrationMarks}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, includeRegistrationMarks: checked as boolean })
            }
          />
          <Label>
            {language === "ar" ? "تضمين علامات التسجيل" : "Include Registration Marks"}
          </Label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          checked={isDefault}
          onCheckedChange={(checked) => setIsDefault(checked as boolean)}
        />
        <Label>
          {language === "ar" ? "افتراضي" : "Set as Default"}
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? language === "ar"
            ? "جارٍ الحفظ..."
            : "Saving..."
          : language === "ar"
            ? "حفظ"
            : "Save"}
      </Button>
    </form>
  )
}

