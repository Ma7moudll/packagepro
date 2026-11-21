"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/providers/language-provider"
import dynamic from "next/dynamic"
import { EditorShell } from "@/components/editor/layout/EditorShell"
import { getTemplate, loadTemplateIntoEditor } from "@/lib/editor/services/template-service"
import { templateProductSlug } from "@/lib/editor/services/template-mapping"
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
  const sessionIdParam = searchParams.get("sessionId")
  // M7: catalog-driven entry
  const productParam = searchParams.get("product")
  const qtyParam = searchParams.get("qty")

  // Parse SKU if provided - Memoized to prevent infinite loops
  const skuData = useMemo(() => (skuParam ? parseSKU(skuParam) : null), [skuParam])
  const applyCoreState = useDesignStore((s) => s.applyCoreState)
  const initFromEditorConfig = useDesignStore((s) => s.initFromEditorConfig)
  const [edConfig, setEdConfig] = useState<{ type: string; material: string } | null>(null)

  // E2E harness: expose view-mode switch before canvas mounts
  useEffect(() => {
    if (typeof window === "undefined") return
    ;(window as any).__editorSetViewMode = (mode: "2d" | "3d" | "dieline" | "wall") => {
      useDesignStore.getState().setViewMode(mode)
    }
  }, [])

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

  // Load template if templateId is provided. A template is artwork for one
  // specific product: first init the editor from that product's catalog
  // config so the die-cut blueprint, the 2D faces and the 3D model are the
  // template's own, then apply the template's defaults on top.
  useEffect(() => {
    if (!templateId) return
    let cancelled = false
    ;(async () => {
      try {
        const template = await getTemplate(templateId)
        if (cancelled) return
        const slug = templateProductSlug(template)
        if (slug) {
          const { catalogApi } = await import("@/lib/api/catalog")
          // MOQ differs per product (bags start at 50); try the requested
          // quantity, then step up until the product accepts it.
          let config: any = null
          for (const qty of [Number(qtyParam) || 30, 100, 500]) {
            try {
              const res = await catalogApi.getEditorConfig(slug, qty)
              if (res.success && res.data) {
                config = res.data
                break
              }
            } catch {
              // try the next quantity
            }
          }
          if (cancelled || !config) return
          initFromEditorConfig(config as any)
          const type = config.product.boxType ?? config.product.type?.replace(/_/g, "-") ?? "mailer-box"
          setEdConfig({ type, material: config.material.code })
          setProductType(
            (config.product.type === "bag"
              ? "bag"
              : config.product.type === "cup"
                ? "cup"
                : config.product.type === "tube"
                  ? "tube"
                  : "box") as any
          )
          setProductConfig((prev) => ({ ...prev, type, material: config.material.code }))
        }
        applyCoreState(loadTemplateIntoEditor(template))
      } catch (error) {
        console.error("Error loading template:", error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [templateId, applyCoreState, initFromEditorConfig, qtyParam])

  // Load a previously saved design session from the backend
  const sessionRestoreRef = useRef<Promise<unknown> | null>(null)
  useEffect(() => {
    if (!sessionIdParam) return
    let cancelled = false
    // Keep the restore promise so a simultaneous catalog init can await it
    // instead of racing it and clobbering the restored layers (M7-C).
    sessionRestoreRef.current = import("@/lib/editor/services/storage")
      .then(({ loadDesignFromCloud }) => loadDesignFromCloud(sessionIdParam))
      .then((designState) => {
        if (cancelled || !designState) return designState
        applyCoreState(() => designState)
        const model = (designState as any)?.model
        if (model) {
          setProductConfig((prev) => ({
            ...prev,
            type: model.type?.replace(/_/g, "-") ?? prev.type,
            material: model.material ?? prev.material,
          }))
        }
        return designState
      })
      .catch((error) => {
        console.error("Error loading design session:", error)
        return null
      })
    return () => {
      cancelled = true
    }
  }, [sessionIdParam, applyCoreState])

  // M7: Catalog-driven entry — fetch canonical EditorConfig and init the store
  useEffect(() => {
    if (!productParam) return
    let cancelled = false
    const qty = Number(qtyParam) || 30
    import("@/lib/api/catalog")
      .then(({ catalogApi }) => catalogApi.getEditorConfig(productParam, qty).then((res) => res.data))
      .then(async (config) => {
        if (cancelled) return
        const type = config.product.boxType ?? config.product.type?.replace(/_/g, "-") ?? "mailer-box"
        const material = config.material.code
        const productType = (config.product.type === "bag" ? "bag" : config.product.type === "cup" ? "cup" : config.product.type === "tube" ? "tube" : "box") as any
        // When a design session is being restored it is the single source of truth
        // for the editor store (designData carries product identity + artwork). Await
        // the restore and never clobber its layers with a catalog re-init (M7-C).
        if (sessionIdParam && sessionRestoreRef.current) {
          const restored = await sessionRestoreRef.current
          if (cancelled) return
          if (restored) {
            setEdConfig({ type: config.product.boxType ?? config.product.type, material })
            setProductType(productType)
            setProductConfig((prev) => ({ ...prev, type, material }))
            return
          }
        }
        initFromEditorConfig(config as any)
        setEdConfig({ type: config.product.boxType ?? config.product.type, material: config.material.code })
        setProductType(productType)
        setProductConfig((prev) => ({
          ...prev,
          type,
          material,
        }))
      })
      .catch((error) => {
        console.error("Error loading editor config:", error)
      })
    return () => {
      cancelled = true
    }
  }, [productParam, qtyParam, initFromEditorConfig])

  // Update config when URL params change
  useEffect(() => {
    if (skuData && !productParam) {
      setProductType(skuData.category as any)
      setProductConfig({
        type: skuData.type,
        size: skuData.size,
        material: skuData.material,
        print: skuData.print,
        foil: skuData.foil,
      })
    }
  }, [skuParam, skuData, productParam])

  const displayType = edConfig?.type ?? (skuData?.type ?? "mailer-box")
  const independentStock = useDesignStore(s => !!s.model.boardSpecification)
  const displayMaterial = independentStock ? (language === "ar" ? "خامة داخل وخارج مخصصة" : "Custom inside/outside stock") : edConfig?.material ?? (skuData?.material ?? "cardboard-natural")

  return (
    <EditorShell
      headerExtra={
        (skuData || productParam) && (
          <p className="hidden md:inline text-xs text-slate-500">
            {language === "ar"
              ? `نوع المنتج: ${displayType} • المادة: ${displayMaterial} • الكمية: ${quantityParam || qtyParam || "30"
              }`
              : `Type: ${displayType} • Material: ${displayMaterial} • Qty: ${quantityParam || qtyParam || "30"
              }`}
          </p>
        )
      }
      center={
        <PackhelpEditor
          productType={productType}
          boxType={displayType as any}
          material={displayMaterial}
          initialDesign={{
            colors: { primary: "#d2b48c", secondary: "#1f2937" },
            dimensions: dimensions,
            quantity: Number(quantityParam || qtyParam) || 30,
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

