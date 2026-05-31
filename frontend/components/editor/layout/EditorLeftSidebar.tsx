"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LayersPanel } from "@/components/editor/panels/LayersPanel"
import { UploadPanel } from "@/components/editor/panels/UploadPanel"
import { AIToolsPanel } from "@/components/editor/panels/AIToolsPanel"
import { useLanguage } from "@/providers/language-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Upload,
  Type,
  Shapes,
  Image as ImageIcon,
  QrCode,
  Layers,
  Wand2,
  LayoutTemplate,
  Sparkles,
} from "lucide-react"
import { PatternsPanel } from "@/components/editor/panels/PatternsPanel"
import { CodeGenerators } from "@/components/editor/panels/CodeGenerators"
import { IconLibrary } from "@/components/editor/panels/IconLibrary"
import { TemplateLibrary } from "@/components/editor/panels/TemplateLibrary"
import { StockImagesPanel } from "@/components/editor/panels/StockImagesPanel"
import { ElementsLibraryPanel } from "@/components/editor/panels/ElementsLibraryPanel"
import { TextTemplatesPanel } from "@/components/editor/panels/TextTemplatesPanel"
import { useDesignStore } from "@/lib/editor/state/store"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Main sidebar sections
const MAIN_SECTIONS = [
  { id: "add", icon: Upload, label: { en: "Add", ar: "إضافة" } },
  { id: "assets", icon: ImageIcon, label: { en: "Assets", ar: "مصادر" } },
  { id: "tools", icon: Wand2, label: { en: "Tools", ar: "أدوات" } },
  { id: "layers", icon: Layers, label: { en: "Layers", ar: "طبقات" } },
] as const

type MainSection = (typeof MAIN_SECTIONS)[number]["id"]

export function EditorLeftSidebar() {
  const { language } = useLanguage()
  const addLayer = useDesignStore((s) => s.addLayer)
  const [activeSection, setActiveSection] = useState<MainSection>("add")

  // Text Panel
  const renderTextPanel = () => (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="w-full justify-start h-12 hover:border-slate-400"
        onClick={() => {
          addLayer({
            type: "text",
            name: "Heading",
            textProperties: {
              content: language === "ar" ? "عنوان رئيسي" : "Heading",
              fontFamily: "Inter",
              fontSize: 36,
              fontWeight: 700,
              align: "center",
              color: "#000000",
              lineHeight: 1.2,
              letterSpacing: -1,
            },
          })
        }}
      >
        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center mr-3">
          <span className="text-lg font-black">H</span>
        </div>
        <div className="text-left">
          <div className="text-sm font-semibold">{language === "ar" ? "عنوان" : "Heading"}</div>
          <div className="text-[10px] text-slate-400">{language === "ar" ? "نص كبير" : "Large bold"}</div>
        </div>
      </Button>
      
      <Button
        variant="outline"
        className="w-full justify-start h-10 hover:border-slate-400"
        onClick={() => {
          addLayer({
            type: "text",
            name: "Subheading",
            textProperties: {
              content: language === "ar" ? "عنوان فرعي" : "Subheading",
              fontFamily: "Inter",
              fontSize: 20,
              fontWeight: 500,
              align: "center",
              color: "#374151",
              lineHeight: 1.3,
              letterSpacing: 0,
            },
          })
        }}
      >
        <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center mr-3">
          <span className="text-sm font-semibold">S</span>
        </div>
        <span className="text-sm">{language === "ar" ? "عنوان فرعي" : "Subheading"}</span>
      </Button>
      
      <Button
        variant="outline"
        className="w-full justify-start h-9 hover:border-slate-400"
        onClick={() => {
          addLayer({
            type: "text",
            name: "Body",
            textProperties: {
              content: language === "ar" ? "نص فقرة" : "Body text",
              fontFamily: "Inter",
              fontSize: 14,
              fontWeight: 400,
              align: "left",
              color: "#6b7280",
              lineHeight: 1.5,
              letterSpacing: 0,
            },
          })
        }}
      >
        <div className="w-5 h-5 rounded bg-slate-50 flex items-center justify-center mr-3">
          <span className="text-xs">Aa</span>
        </div>
        <span className="text-xs">{language === "ar" ? "نص عادي" : "Body text"}</span>
      </Button>
    </div>
  )

  // Shapes Panel
  const renderShapesPanel = () => (
    <div className="grid grid-cols-2 gap-2">
      {[
        { name: language === "ar" ? "مستطيل" : "Rectangle", shape: "rect", radius: 8, className: "w-12 h-8 rounded" },
        { name: language === "ar" ? "دائرة" : "Circle", shape: "circle", radius: 0, className: "w-10 h-10 rounded-full" },
        { name: language === "ar" ? "خط" : "Line", shape: "line", radius: 0, className: "w-12 h-0.5 rounded-full" },
        { name: language === "ar" ? "دائري" : "Rounded", shape: "rect", radius: 24, className: "w-12 h-8 rounded-2xl" },
      ].map((item) => (
        <Button
          key={item.shape + item.radius}
          variant="outline"
          className="flex flex-col items-center justify-center h-20 gap-2 hover:border-slate-400"
          onClick={() => {
            addLayer({
              type: "shape",
              name: item.name,
              shapeProperties: {
                shape: item.shape as any,
                fill: "#e2e8f0",
                stroke: "#94a3b8",
                strokeWidth: 2,
                cornerRadius: item.radius,
              },
            })
          }}
        >
          <div className={cn(item.className, "bg-slate-200 border-2 border-slate-300")} />
          <span className="text-[10px]">{item.name}</span>
        </Button>
      ))}
    </div>
  )

  // Add Section Content
  const renderAddSection = () => (
    <ScrollArea className="flex-1">
      <div className="p-3 space-y-1">
        <Accordion type="multiple" defaultValue={["upload", "text"]} className="space-y-1">
          {/* Upload */}
          <AccordionItem value="upload" className="border rounded-lg px-3">
            <AccordionTrigger className="text-xs font-semibold py-2 hover:no-underline">
              <span className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {language === "ar" ? "رفع ملفات" : "Upload"}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <UploadPanel />
            </AccordionContent>
          </AccordionItem>

          {/* Text */}
          <AccordionItem value="text" className="border rounded-lg px-3">
            <AccordionTrigger className="text-xs font-semibold py-2 hover:no-underline">
              <span className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                {language === "ar" ? "نص" : "Text"}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="w-full h-8 mb-2">
                  <TabsTrigger value="basic" className="flex-1 text-[10px]">
                    {language === "ar" ? "أساسي" : "Basic"}
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="flex-1 text-[10px]">
                    {language === "ar" ? "قوالب" : "Templates"}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="mt-0">
                  {renderTextPanel()}
                </TabsContent>
                <TabsContent value="templates" className="mt-0">
                  <TextTemplatesPanel />
                </TabsContent>
              </Tabs>
            </AccordionContent>
          </AccordionItem>

          {/* Shapes */}
          <AccordionItem value="shapes" className="border rounded-lg px-3">
            <AccordionTrigger className="text-xs font-semibold py-2 hover:no-underline">
              <span className="flex items-center gap-2">
                <Shapes className="h-4 w-4" />
                {language === "ar" ? "أشكال" : "Shapes"}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="w-full h-8 mb-2">
                  <TabsTrigger value="basic" className="flex-1 text-[10px]">
                    {language === "ar" ? "أساسي" : "Basic"}
                  </TabsTrigger>
                  <TabsTrigger value="library" className="flex-1 text-[10px]">
                    {language === "ar" ? "مكتبة" : "Library"}
                  </TabsTrigger>
                  <TabsTrigger value="icons" className="flex-1 text-[10px]">
                    {language === "ar" ? "أيقونات" : "Icons"}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="mt-0">
                  {renderShapesPanel()}
                </TabsContent>
                <TabsContent value="library" className="mt-0">
                  <ElementsLibraryPanel />
                </TabsContent>
                <TabsContent value="icons" className="mt-0">
                  <IconLibrary />
                </TabsContent>
              </Tabs>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </ScrollArea>
  )

  // Assets Section Content
  const renderAssetsSection = () => (
    <ScrollArea className="flex-1">
      <div className="p-3 space-y-1">
        <Accordion type="multiple" defaultValue={["patterns"]} className="space-y-1">
          {/* Patterns */}
          <AccordionItem value="patterns" className="border rounded-lg px-3">
            <AccordionTrigger className="text-xs font-semibold py-2 hover:no-underline">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {language === "ar" ? "أنماط" : "Patterns"}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <PatternsPanel />
            </AccordionContent>
          </AccordionItem>

          {/* Stock Images */}
          <AccordionItem value="stock" className="border rounded-lg px-3">
            <AccordionTrigger className="text-xs font-semibold py-2 hover:no-underline">
              <span className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                {language === "ar" ? "صور مجانية" : "Stock Images"}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <StockImagesPanel />
            </AccordionContent>
          </AccordionItem>

          {/* Templates */}
          <AccordionItem value="templates" className="border rounded-lg px-3">
            <AccordionTrigger className="text-xs font-semibold py-2 hover:no-underline">
              <span className="flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4" />
                {language === "ar" ? "قوالب" : "Templates"}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <TemplateLibrary />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </ScrollArea>
  )

  // Tools Section Content
  const renderToolsSection = () => (
    <ScrollArea className="flex-1">
      <div className="p-3 space-y-1">
        <Accordion type="multiple" defaultValue={["codes"]} className="space-y-1">
          {/* QR/Barcode */}
          <AccordionItem value="codes" className="border rounded-lg px-3">
            <AccordionTrigger className="text-xs font-semibold py-2 hover:no-underline">
              <span className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                {language === "ar" ? "QR / باركود" : "QR / Barcode"}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <CodeGenerators />
            </AccordionContent>
          </AccordionItem>

          {/* AI Tools */}
          <AccordionItem value="ai" className="border rounded-lg px-3">
            <AccordionTrigger className="text-xs font-semibold py-2 hover:no-underline">
              <span className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                {language === "ar" ? "أدوات AI" : "AI Tools"}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <AIToolsPanel />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </ScrollArea>
  )

  // Layers Section Content
  const renderLayersSection = () => (
    <ScrollArea className="flex-1">
      <div className="p-3">
        <LayersPanel />
      </div>
    </ScrollArea>
  )

  // Render content based on section
  const renderContent = () => {
    switch (activeSection) {
      case "add": return renderAddSection()
      case "assets": return renderAssetsSection()
      case "tools": return renderToolsSection()
      case "layers": return renderLayersSection()
      default: return null
    }
  }

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-100 bg-slate-50/50">
        {MAIN_SECTIONS.map((section) => {
          const Icon = section.icon
          const isActive = activeSection === section.id
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "flex-1 py-2.5 flex flex-col items-center gap-1 transition-all text-xs border-b-2",
                isActive
                  ? "text-slate-900 bg-white border-slate-900"
                  : "text-slate-400 hover:text-slate-600 border-transparent"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[10px] font-medium">
                {language === "ar" ? section.label.ar : section.label.en}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      {renderContent()}
    </aside>
  )
}
