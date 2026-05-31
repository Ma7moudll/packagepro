"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/providers/language-provider"
import dynamic from "next/dynamic"
import { EditorShell } from "@/components/editor/layout/EditorShell"
import { getTemplate, loadTemplateIntoEditor } from "@/lib/editor/services/template-service"
import { useDesignStore } from "@/lib/editor/state/store"

const PackhelpEditor = dynamic(
  () => import("@/components/design-editor/PackhelpEditor").then((mod) => mod.PackhelpEditor),
  {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center">Loading Editor...</div>
  }
)

// Parse SKU string like "box--mailer-box--23--cardboard-natural--print-monochrome--foil-none"
function parseSKU(sku: string) {
  const parts = sku.split("--")
  return {
    category: parts[0] || "box", // box
    type: parts[1] || "mailer-box", // mailer-box
    size: parts[2] || "23", // 23
    material: parts[3] || "cardboard-natural", // cardboard-natural
    print: parts[4] || "print-monochrome", // print-monochrome
    foil: parts[5] || "foil-none", // foil-none
  }
}

export default function EditorPage() {
  const { language } = useLanguage()
  const searchParams = useSearchParams()

  // Parse URL parameters
  const skuParam = searchParams.get("sku")
  const sourceParam = searchParams.get("source")
  const composedProductId = searchParams.get("composed_product_id")
  const quantityParam = searchParams.get("quantity")
  const templateId = searchParams.get("templateId")

  // Parse SKU if provided - Memoized to prevent infinite loops
  const skuData = useMemo(() => (skuParam ? parseSKU(skuParam) : null), [skuParam])
  const applyCoreState = useDesignStore((s) => s.applyCoreState)

  const [productType, setProductType] = useState<"box" | "bag" | "cup" | "tube">(
    skuData?.category === "bag" ? "bag" :
      skuData?.category === "cup" ? "cup" :
        skuData?.category === "tube" ? "tube" :
          "box"
  )
  const [productConfig, setProductConfig] = useState({
    type: skuData?.type || "mailer-box",
    size: skuData?.size || "23",
    material: skuData?.material || "cardboard-natural",
    print: skuData?.print || "print-monochrome",
    foil: skuData?.foil || "foil-none",
  })

  // Create dimensions object - Memoized
  const dimensions = useMemo(() => {
    let dims = { length: 200, width: 150, height: 100 }
    if (productConfig.size && productConfig.size.includes('x')) {
      const [l, w, h] = productConfig.size.split('x').map(Number)
      if (!isNaN(l) && !isNaN(w) && !isNaN(h)) {
        dims = { length: l, width: w, height: h }
      }
    }
    return dims
  }, [productConfig.size])

  const initialDesign = useMemo(() => ({
    colors: { primary: "#d2b48c", secondary: "#1f2937" },
    dimensions: dimensions,
  }), [dimensions])

  const [activeView, setActiveView] = useState<"2d" | "3d">("3d")

  // Load template if templateId is provided
  useEffect(() => {
    if (templateId) {
      getTemplate(templateId)
        .then((template) => {
          const designState = loadTemplateIntoEditor(template)
          applyCoreState(() => designState)
        })
        .catch((error) => {
          console.error("Error loading template:", error)
        })
    }
  }, [templateId, applyCoreState])

  // Update config when URL params change
  useEffect(() => {
    if (skuData) {
      setProductType(skuData.category as any)
      setProductConfig({
        type: skuData.type,
        size: skuData.size,
        material: skuData.material,
        print: skuData.print,
        foil: skuData.foil,
      })
    }
  }, [skuParam, skuData])

  return (
    <EditorShell
      headerExtra={
        skuData && (
          <p className="hidden md:inline text-xs text-slate-500">
            {language === "ar"
              ? `نوع المنتج: ${skuData.type} • المادة: ${skuData.material} • الطباعة: ${skuData.print} • الكمية: ${quantityParam || "1"
              }`
              : `Type: ${skuData.type} • Material: ${skuData.material} • Print: ${skuData.print} • Qty: ${quantityParam || "1"
              }`}
          </p>
        )
      }
      center={
        <PackhelpEditor
          productType={productType}
          boxType={productConfig.type as any}
          material={productConfig.material}
          initialDesign={{
            colors: { primary: "#d2b48c", secondary: "#1f2937" },
            dimensions: dimensions,
          }}
          onSave={(design) => {
            console.log("Design saved:", design)
          }}
          onAddText={() => {
            // @ts-ignore
            if (window.__editorAddText) window.__editorAddText()
          }}
          onAddImage={(file) => {
            // @ts-ignore
            if (window.__editorAddImage) window.__editorAddImage(file)
          }}
        />
      }
    />
  )
}

