"use client"

import { useState } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Save, Loader2 } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { createTemplate } from "@/lib/editor/services/template-service"
import { TemplateCategory, TemplateStyle } from "@/lib/editor/types/template"

export function TemplateCreator() {
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "box" as TemplateCategory,
    style: "modern" as TemplateStyle,
    tags: "",
  })

  const handleSave = async () => {
    if (!formData.name || !formData.description) {
      alert(language === "ar" ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields")
      return
    }

    setSaving(true)
    try {
      const designState = useDesignStore.getState().history.present

      // Generate thumbnail from current canvas (simplified)
      const thumbnailDataUrl = "" // TODO: Capture canvas screenshot

      await createTemplate({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        style: formData.style,
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
        designState,
        thumbnailDataUrl,
      })

      alert(language === "ar" ? "تم حفظ القالب بنجاح!" : "Template saved successfully!")
      setOpen(false)
      setFormData({
        name: "",
        description: "",
        category: "box",
        style: "modern",
        tags: "",
      })
    } catch (error: any) {
      console.error("Error saving template:", error)
      alert(language === "ar" ? `خطأ في حفظ القالب: ${error.message}` : `Error saving template: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {language === "ar" ? "حفظ كقالب" : "Save as Template"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === "ar" ? "إنشاء قالب جديد" : "Create New Template"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">
              {language === "ar" ? "الاسم" : "Name"} *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={language === "ar" ? "اسم القالب" : "Template name"}
            />
          </div>

          <div>
            <Label htmlFor="description">
              {language === "ar" ? "الوصف" : "Description"} *
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={language === "ar" ? "وصف القالب" : "Template description"}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="category">
              {language === "ar" ? "الفئة" : "Category"}
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({ ...formData, category: value as TemplateCategory })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="box">Box</SelectItem>
                <SelectItem value="ecommerce">E-commerce</SelectItem>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="cosmetics">Cosmetics</SelectItem>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="fashion">Fashion</SelectItem>
                <SelectItem value="healthcare">Healthcare</SelectItem>
                <SelectItem value="luxury">Luxury</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="style">
              {language === "ar" ? "النمط" : "Style"}
            </Label>
            <Select
              value={formData.style}
              onValueChange={(value) =>
                setFormData({ ...formData, style: value as TemplateStyle })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
                <SelectItem value="eco">Eco</SelectItem>
                <SelectItem value="luxury">Luxury</SelectItem>
                <SelectItem value="playful">Playful</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="vintage">Vintage</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="tags">
              {language === "ar" ? "العلامات" : "Tags"} (مفصولة بفواصل)
            </Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder={language === "ar" ? "tag1, tag2, tag3" : "tag1, tag2, tag3"}
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === "ar" ? "جارٍ الحفظ..." : "Saving..."}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {language === "ar" ? "حفظ القالب" : "Save Template"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

