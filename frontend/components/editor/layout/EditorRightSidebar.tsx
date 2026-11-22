"use client"

import { BoardSpecificationPanel } from "@/components/editor/panels/BoardSpecificationPanel"
import { RaisedPrintControl } from "@/components/editor/panels/RaisedPrintControl"
import { useState, useEffect, useRef } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { pricingApi } from "@/lib/api/pricing"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  Settings2,
  MessageSquare,
  CheckCircle,
  Download,
  DollarSign,
  Type,
  Image as ImageIcon,
  Box,
  Trash2,
  Undo2,
} from "lucide-react"
import { COLOR_VARIANTS, FINISHING_OPTIONS, LAMINATION_OPTIONS, MATERIAL_TYPES, getProductById } from "@/lib/editor/data/products-data"
import {CATALOGUE_PRODUCTS,CATALOGUE_CATEGORIES,CATALOGUE_CANDIDATE_MATERIALS,canonicalEditorType} from "../../../../shared/catalog/products"
import {catalogApi} from "@/lib/api/catalog"
import {productConfiguration,productDimensionChange,materialCandidateLabel,readinessLabel,requestProductMaterial} from "@/lib/editor/product-configuration"
import {editorRequiresQuote} from "@/lib/editor/quote-policy"
import { useLanguage } from "@/providers/language-provider"
import { ValidationPanel } from "@/components/editor/panels/ValidationPanel"
import { ColorPicker } from "@/components/editor/panels/ColorPicker"
import { PriceCalculator } from "@/components/editor/panels/PriceCalculator"
import { ExportDialog } from "@/components/editor/export/ExportDialog"
import { TextStylesPanel } from "@/components/editor/panels/TextStylesPanel"
import { ImageEditPanel } from "@/components/editor/panels/ImageEditPanel"
import { CommentsPanel } from "@/components/editor/collaboration/CommentsPanel"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

// Sidebar tabs
const SIDEBAR_TABS = [
  { id: "design", icon: Settings2, label: { en: "Design", ar: "تصميم" } },
  { id: "comments", icon: MessageSquare, label: { en: "Comments", ar: "تعليقات" } },
  { id: "price", icon: DollarSign, label: { en: "Price", ar: "السعر" } },
  { id: "check", icon: CheckCircle, label: { en: "Check", ar: "فحص" } },
  { id: "export", icon: Download, label: { en: "Export", ar: "تصدير" } },
] as const

type TabId = (typeof SIDEBAR_TABS)[number]["id"]

export function EditorRightSidebar() {
  const { language, isRTL } = useLanguage()
  const layers = useDesignStore((s) => s.layers)
  const selectedIds = useDesignStore((s) => s.selectedLayerIds)
  const model = useDesignStore((s) => s.model)
  const updateLayer = useDesignStore((s) => s.updateLayer)
  const removeLayer = useDesignStore((s) => s.removeLayer)
  const applyCoreState = useDesignStore((s) => s.applyCoreState)
  const customQuote = editorRequiresQuote({model,layers})
  const initProduct=useDesignStore(s=>s.initFromEditorConfig)
  const selected = layers.find((l) => l.id === selectedIds[0])

  const [activeTab, setActiveTab] = useState<TabId>("design")
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [productCategory, setProductCategory] = useState("all")
  const [productLoading,setProductLoading]=useState(false)
  const [productError,setProductError]=useState("")
  const productRequest=useRef(0)

  // Live pricing from the backend pricing engine. The previous hardcoded
  // getBasePrice switch invented prices (and a quantity discount) unrelated
  // to any rate card, then displayed them as SAR while the seeded materials
  // price in EGP.
  const [quote, setQuote] = useState<{ total: number; unit: number; currency: string } | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (customQuote) { setQuote(null); setQuoteLoading(false); return }
    setQuoteLoading(true)
    const timer = setTimeout(() => {
      const t = (model.type || "").toLowerCase()
      const productType = t.includes("bag") || t.includes("pouch") ? "bag" : t.includes("label") ? "label" : "box"
      pricingApi
        .calculate({
          productType,
          quantity: model.quantity,
          dimensions: { ...model.dimensions, unit: "mm" },
          materialCode: model.material,
        })
        .then((res) => {
          if (cancelled) return
          const data = res.data
          if (res.success && data) {
            setQuote({
              total: data.totalPrice,
              unit: (data as any).unitPrice ?? data.totalPrice / model.quantity,
              currency: data.material?.currency ?? "EGP",
            })
          } else {
            setQuote(null)
          }
        })
        .catch(() => {
          if (!cancelled) setQuote(null)
        })
        .finally(() => {
          if (!cancelled) setQuoteLoading(false)
        })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [customQuote, model.type, model.material, model.dimensions.length, model.dimensions.width, model.dimensions.height, model.quantity])

  const canonicalType=canonicalEditorType(model.type)
  const currentProduct = getProductById(canonicalType as any)
  const currentCatalogue=CATALOGUE_PRODUCTS.find(p=>p.id===canonicalType)
  const candidates=CATALOGUE_CANDIDATE_MATERIALS[canonicalType]??[]
  const configuration=productConfiguration(model.type,candidates)
  const filteredProducts=CATALOGUE_PRODUCTS.filter(p=>productCategory==="all"||p.category===productCategory)
  const changeProduct=async(id:string)=>{
   const entry=CATALOGUE_PRODUCTS.find(p=>p.id===id);if(!entry)return
   const request=++productRequest.current;setProductLoading(true);setProductError("")
   try{
    const response=await catalogApi.getEditorConfig(entry.slug,Math.max(model.quantity,entry.moq))
    if(request!==productRequest.current)return
    if(!response.success||!response.data)throw new Error('No editor configuration')
    const config=response.data,policy=productConfiguration(entry.id,CATALOGUE_CANDIDATE_MATERIALS[entry.id])
    const native=policy.materials.includes(config.material.code)?config.material.code:policy.materials[0]
    initProduct(config as any,{preserveHistory:true,transform:core=>({...core,model:{...core.model,boardSpecification:policy.boardStock?core.model.boardSpecification:undefined,material:policy.boardStock?core.model.material:(native??core.model.material),materialSpecification:policy.boardStock?undefined:native?{version:1,productType:entry.id,code:native,status:'requested',supplierConfirmed:false}:undefined,printCoverage:getProductById(entry.id as any)?.supportsPrintCoverage[0]??'outside'},selectedLayerIds:[]})})
   }catch{if(request===productRequest.current)setProductError(language==='ar'?'تعذر تحميل إعدادات المنتج. لم يتغير التصميم.':'Could not load this product. Your design is unchanged.')}
   finally{if(request===productRequest.current)setProductLoading(false)}
  }

  // Layer Properties Panel
  const renderLayerProperties = () => {
    if (!selected) return null

  return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-600">
            {language === "ar" ? "خصائص العنصر" : "Element Properties"}
          </h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title={language === "ar" ? "رجوع لإعدادات المنتج" : "Back to product settings"}
              aria-label={language === "ar" ? "رجوع لإعدادات المنتج" : "Back to product settings"}
              onClick={() => applyCoreState((core) => ({ ...core, selectedLayerIds: [] }))}
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500 hover:bg-red-50"
              onClick={() => removeLayer(selected.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Name */}
        <div>
          <Label className="text-[10px] text-slate-400 mb-1 block">
            {language === "ar" ? "الاسم" : "Name"}
          </Label>
          <Input
            value={selected.name}
            onChange={(e) => updateLayer(selected.id, (l) => ({ ...l, name: e.target.value }))}
            className="h-8 text-xs"
          />
        </div>

        {/* Position */}
        <div className="grid grid-cols-2 gap-2">
                <div>
            <Label className="text-[10px] text-slate-400 mb-1 block">X</Label>
            <Input
              type="number"
              value={Math.round(selected.position.x)}
              onChange={(e) =>
                updateLayer(selected.id, (l) => ({
                  ...l,
                  position: { ...l.position, x: parseFloat(e.target.value) || 0 },
                }))
              }
              className="h-8 text-xs"
            />
                </div>
                <div>
            <Label className="text-[10px] text-slate-400 mb-1 block">Y</Label>
            <Input
              type="number"
              value={Math.round(selected.position.y)}
              onChange={(e) =>
                updateLayer(selected.id, (l) => ({
                  ...l,
                  position: { ...l.position, y: parseFloat(e.target.value) || 0 },
                }))
              }
              className="h-8 text-xs"
            />
                      </div>
                    </div>

        {/* Scale */}
        <div>
          <div className="flex justify-between mb-1">
            <Label className="text-[10px] text-slate-400">{language === "ar" ? "الحجم" : "Scale"}</Label>
            <span className="text-[10px] font-medium">{Math.round(selected.scale.x * 100)}%</span>
                      </div>
                      <Slider
                        value={[selected.scale.x * 100]}
            min={10}
            max={500}
                        step={1}
            onValueChange={([v]) =>
              updateLayer(selected.id, (l) => ({ ...l, scale: { x: v / 100, y: v / 100 } }))
            }
                      />
                    </div>

        {/* Rotation */}
        <div>
          <div className="flex justify-between mb-1">
            <Label className="text-[10px] text-slate-400">{language === "ar" ? "الدوران" : "Rotation"}</Label>
            <span className="text-[10px] font-medium">{Math.round((selected.rotation * 180) / Math.PI)}°</span>
                      </div>
                      <Slider
                        value={[(selected.rotation * 180) / Math.PI]}
                        min={0}
                        max={360}
                        step={1}
            onValueChange={([v]) =>
              updateLayer(selected.id, (l) => ({ ...l, rotation: (v * Math.PI) / 180 }))
            }
                      />
                    </div>

        {/* Opacity */}
        <div>
          <div className="flex justify-between mb-1">
            <Label className="text-[10px] text-slate-400">{language === "ar" ? "الشفافية" : "Opacity"}</Label>
            <span className="text-[10px] font-medium">{Math.round(selected.opacity * 100)}%</span>
                      </div>
                      <Slider
                        value={[selected.opacity * 100]}
                        min={0}
                        max={100}
                        step={1}
            onValueChange={([v]) => updateLayer(selected.id, (l) => ({ ...l, opacity: v / 100 }))}
                      />
                </div>

        {/* Text Properties */}
                {selected.type === "text" && selected.textProperties && (
          <div className="pt-3 border-t space-y-3">
            <h4 className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
              <Type className="h-3 w-3" />
              {language === "ar" ? "خصائص النص" : "Text"}
            </h4>
            <Input
              value={selected.textProperties.content}
              onChange={(e) =>
                updateLayer(selected.id, (l) => ({
                  ...l,
                  textProperties: { ...l.textProperties!, content: e.target.value },
                }))
              }
              className="h-8 text-xs"
              placeholder={language === "ar" ? "النص" : "Content"}
            />
                      <div className="flex items-center gap-2">
                <ColorPicker
                  value={selected.textProperties.color}
                  onChange={(color) =>
                    updateLayer(selected.id, (l) => ({
                      ...l,
                      textProperties: { ...l.textProperties!, color },
                    }))
                  }
                  size="sm"
                />
              <Input
                value={selected.textProperties.color}
                onChange={(e) =>
                  updateLayer(selected.id, (l) => ({
                    ...l,
                    textProperties: { ...l.textProperties!, color: e.target.value },
                  }))
                }
                className="h-8 text-xs font-mono flex-1"
              />
                      </div>
            <TextStylesPanel />
            <RaisedPrintControl layer={selected} arabic={language === "ar"} update={updateLayer} />
                    </div>
        )}

        {/* Image Properties */}
        {selected.type === "image" && (
          <div className="pt-3 border-t">
            <h4 className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mb-3">
              <ImageIcon className="h-3 w-3" />
              {language === "ar" ? "تعديل الصورة" : "Image Edit"}
            </h4>
            <ImageEditPanel />
                  </div>
                )}

        {/* Shape Properties */}
                {selected.type === "shape" && selected.shapeProperties && (
          <div className="pt-3 border-t space-y-3">
            <h4 className="text-[10px] font-bold text-slate-500">
              {language === "ar" ? "خصائص الشكل" : "Shape"}
            </h4>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-slate-400 w-10">{language === "ar" ? "تعبئة" : "Fill"}</Label>
              <ColorPicker
                value={selected.shapeProperties.fill}
                onChange={(color) =>
                  updateLayer(selected.id, (l) => ({
                    ...l,
                    shapeProperties: { ...l.shapeProperties!, fill: color },
                  }))
                }
                size="sm"
              />
              <Input
                value={selected.shapeProperties.fill}
                onChange={(e) =>
                  updateLayer(selected.id, (l) => ({
                    ...l,
                    shapeProperties: { ...l.shapeProperties!, fill: e.target.value },
                  }))
                }
                className="h-7 text-xs font-mono flex-1"
              />
                      </div>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-slate-400 w-10">{language === "ar" ? "حدود" : "Stroke"}</Label>
              <ColorPicker
                value={selected.shapeProperties.stroke}
                onChange={(color) =>
                  updateLayer(selected.id, (l) => ({
                    ...l,
                    shapeProperties: { ...l.shapeProperties!, stroke: color },
                  }))
                }
                size="sm"
              />
              <Input
                value={selected.shapeProperties.stroke}
                onChange={(e) =>
                  updateLayer(selected.id, (l) => ({
                    ...l,
                    shapeProperties: { ...l.shapeProperties!, stroke: e.target.value },
                  }))
                }
                className="h-7 text-xs font-mono flex-1"
              />
                    </div>
                  </div>
                )}
              </div>
    )
  }

  // Product Settings Panel
  const renderProductSettings = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Box className="h-4 w-4 text-slate-600" />
        <h3 className="text-xs font-bold text-slate-600">
                    {language === "ar" ? "إعدادات المنتج" : "Product Settings"}
                  </h3>
      </div>

      <Accordion type="single" collapsible defaultValue="product" className="space-y-1">
        {/* Product Type */}
        <AccordionItem value="product" className="border rounded-lg px-3">
          <AccordionTrigger className="text-[11px] font-semibold py-2 hover:no-underline">
            {language === "ar" ? "نوع المنتج" : "Product Type"}
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-3">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-1">
              {[{slug:"all",name:"All"},...CATALOGUE_CATEGORIES].map((cat) => (
                <Button
                  key={cat.slug}
                  variant={productCategory === cat.slug ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-6 text-[9px] px-2",
                    productCategory === cat.slug && "bg-slate-900 text-white"
                  )}
                  onClick={() => setProductCategory(cat.slug)}
                >
                  {cat.name}
                </Button>
              ))}
                    </div>

            <Select
              value={canonicalType}
              disabled={productLoading}
              onValueChange={changeProduct}
            >
              <SelectTrigger aria-label="Product type" className="h-9 text-xs min-w-0 overflow-hidden">
                <SelectValue>
                  {currentProduct && (
                    <span className="flex min-w-0 items-center gap-2">
                      <span>{currentProduct.icon}</span>
                      <span className="truncate">{language === "ar" ? (currentCatalogue?.name.ar??currentProduct.name.ar) : (currentCatalogue?.name.en??currentProduct.name.en)}</span>
                    </span>
                  )}
                </SelectValue>
                        </SelectTrigger>
              <SelectContent className="max-h-60">
                {filteredProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id} className="text-xs">
                    <span className="flex items-center gap-2">
                      <span>{getProductById(product.id as any)?.icon??"□"}</span>
                      {language === "ar" ? product.name.ar : product.name.en}
                    </span>
                  </SelectItem>
                ))}
                        </SelectContent>
                      </Select>
            {productLoading&&<p role="status" className="text-xs">{language==='ar'?'تحميل إعدادات المنتج...':'Loading product settings...'}</p>}
            {productError&&<p role="alert" className="text-xs text-red-700">{productError}</p>}
            {currentCatalogue&&<p className="text-[10px] text-slate-600">{language==='ar'?'المعاينة':'Preview'}: {readinessLabel(currentCatalogue.readiness.preview,language)} · {language==='ar'?'مخطط الإنتاج':'Production dieline'}: {readinessLabel(currentCatalogue.readiness.dieline,language)} · {language==='ar'?'التسعير':'Pricing'}: {readinessLabel(currentCatalogue.readiness.pricing,language)}</p>}
          </AccordionContent>
        </AccordionItem>

        {/* Material */}
        <AccordionItem value="material" className="border rounded-lg px-3">
          <AccordionTrigger className="text-[11px] font-semibold py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <span 
                className="w-5 h-5 rounded-full border-2 border-slate-200 shadow-sm" 
                style={{ backgroundColor: configuration.boardStock?(MATERIAL_TYPES.find(m => m.id === model.material)?.color || '#C4A574'):model.material.includes("black")?"#242424":"#eeeeec" }}
              />
              {language === "ar" ? "المادة" : "Material"}
                        </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-3">
            <BoardSpecificationPanel arabic={language === "ar"} />
            {!configuration.boardStock&&<div className="space-y-2">
             <Label htmlFor="product-material-candidate" className="text-[11px]">{language==='ar'?'الخامة المقترحة لهذا المنتج':'Candidate material for this product'}</Label>
             <select id="product-material-candidate" className="w-full border rounded-md p-2 text-xs" value={candidates.includes(model.material)?model.material:''} onChange={e=>{const code=e.target.value;if(!candidates.includes(code))return;applyCoreState(core=>requestProductMaterial(core,code,candidates))}}>
              <option value="" disabled>{language==='ar'?'اختر خامة خاصة بالمنتج':'Choose a product-listed material'}</option>
              {candidates.map(code=><option key={code} value={code}>{materialCandidateLabel(code,language)}</option>)}
             </select>
             <p role="status" className="text-[10px] text-amber-800">{language==='ar'?'اختيارات مقترحة وليست اعتماد مورد. السُمك والعزل وملامسة الطعام والطباعة تحتاج تأكيدا وعرض سعر.':'Catalogue candidates, not supplier approval. Thickness, barrier, food-contact and print suitability need confirmation and a quote.'}</p>
            </div>}
            {/* Print Coverage */}
            {currentProduct?.supportsPrintCoverage && currentProduct.supportsPrintCoverage.length > 1 && (
              <div className="space-y-1 pt-2 border-t">
                <Label className="text-[10px] text-slate-400">
                  {language === "ar" ? "تغطية الطباعة" : "Print Coverage"}
                </Label>
                <div className="flex gap-1">
                  {currentProduct.supportsPrintCoverage.map((coverage) => (
                    <Button
                      key={coverage}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1 h-7 text-[10px]",
                        model.printCoverage === coverage && "bg-slate-900 text-white"
                      )}
                      onClick={() =>
                        applyCoreState((s) => ({ ...s, model: { ...s.model, printCoverage: coverage } }))
                      }
                    >
                      {coverage === "outside" ? (language === "ar" ? "خارجي" : "Outside") :
                       coverage === "inside" ? (language === "ar" ? "داخلي" : "Inside") :
                       (language === "ar" ? "الكل" : "Both")}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Dimensions */}
        <AccordionItem value="dimensions" className="border rounded-lg px-3">
          <AccordionTrigger className="text-[11px] font-semibold py-2 hover:no-underline">
            {language === "ar" ? "الأبعاد (ملم)" : "Dimensions (mm)"}
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="grid grid-cols-3 gap-2">
              {configuration.dimensions.map(({key:dim,en,ar}) => (
                <div key={dim}>
                  <Label className="text-[9px] text-slate-400 mb-1 block uppercase">{language==="ar"?ar:en}</Label>
                  <Input
                    type="number"
                    value={model.dimensions[dim]}
                    onChange={(e) =>
                      applyCoreState((s) => ({
                        ...s,
                        model: {
                          ...s.model,
                          dimensions: productDimensionChange(model.type,s.model.dimensions,dim,parseFloat(e.target.value)),
                        },
                      }))
                    }
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Advanced Options */}
        {configuration.boardStock&&<AccordionItem value="advanced" className="border rounded-lg px-3">
          <AccordionTrigger className="text-[11px] font-semibold py-2 hover:no-underline">
            {language === "ar" ? "خيارات متقدمة" : "Advanced Options"}
          </AccordionTrigger>
          <AccordionContent className="pb-3 space-y-3">
            {/* Color Variant */}
            <div>
              <Label className="text-[10px] text-slate-400 mb-1 block">
                {language === "ar" ? "نوع اللون" : "Color Variant"}
              </Label>
              <Select
                value={model.colorVariant}
                onValueChange={(v: any) =>
                  applyCoreState((s) => ({ ...s, model: { ...s.model, colorVariant: v } }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_VARIANTS.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      {language === "ar" ? v.name.ar : v.name.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Finishing */}
            <div>
              <Label className="text-[10px] text-slate-400 mb-1 block">
                {language === "ar" ? "التشطيب" : "Finishing"}
              </Label>
              <Select
                value={model.finishing}
                onValueChange={(v: any) =>
                  applyCoreState((s) => ({ ...s, model: { ...s.model, finishing: v } }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINISHING_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id} className="text-xs">
                      {language === "ar" ? opt.name.ar : opt.name.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lamination */}
            <div>
              <Label className="text-[10px] text-slate-400 mb-1 block">
                {language === "ar" ? "التغليف" : "Lamination"}
              </Label>
              <Select
                value={model.lamination}
                onValueChange={(v: any) =>
                  applyCoreState((s) => ({ ...s, model: { ...s.model, lamination: v } }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAMINATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id} className="text-xs">
                      {language === "ar" ? opt.name.ar : opt.name.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>}
      </Accordion>
    </div>
  )

  // Design Tab Content
  const renderDesignContent = () => (
    <ScrollArea className="flex-1 min-h-0">
      <div className="p-3">
        {selected ? renderLayerProperties() : renderProductSettings()}
      </div>
    </ScrollArea>
  )

  return (
    <aside className={`w-full bg-white ${isRTL ? "border-r" : "border-l"} border-slate-200 flex flex-col h-full min-h-0`}>
      {/* Tab Navigation */}
      <div className="flex border-b bg-slate-50/50 overflow-x-auto" role="tablist">
        {SIDEBAR_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-2.5 flex flex-col items-center gap-1 transition-all border-b-2 min-w-0",
                isActive
                  ? "border-slate-900 bg-white text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-slate-900" : ""}`} aria-hidden="true" />
              <span className={`text-[10px] font-medium ${isActive ? "text-slate-900" : ""}`}>
                {language === "ar" ? tab.label.ar : tab.label.en}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {activeTab === "design" && renderDesignContent()}
        {activeTab === "comments" && (
          <ScrollArea className="flex-1 min-h-0">
            <CommentsPanel />
          </ScrollArea>
        )}
        {activeTab === "price" && (
          <ScrollArea className="flex-1 min-h-0">
            <PriceCalculator />
          </ScrollArea>
        )}
        {activeTab === "check" && (
          <ScrollArea className="flex-1 min-h-0">
            <ValidationPanel />
          </ScrollArea>
        )}
        {activeTab === "export" && (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4">
              <div className="text-center py-4">
                <Download className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-700 mb-1">
                  {language === "ar" ? "جاهز للتصدير؟" : "Ready to Export?"}
              </h3>
                <p className="text-xs text-slate-500 mb-4">
                  {language === "ar" ? "تأكد من فحص التصميم أولاً" : "Validate your design first"}
                </p>
              </div>
              <ExportDialog />
            </div>
          </ScrollArea>
        )}
        </div>

      {/* Order Summary Footer */}
      <div className="border-t p-3 bg-slate-50">
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className="text-[9px] text-slate-400 block">{language === "ar" ? "الكمية" : "Quantity"}</span>
            <Select
              value={model.quantity.toString()}
              onValueChange={(v) =>
                applyCoreState((core) => ({ ...core, model: { ...core.model, quantity: parseInt(v) } }))
              }
            >
              <SelectTrigger className="h-auto border-none bg-transparent p-0 text-sm font-bold w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[30, 50, 100, 250, 500, 1000, 2500].map((q) => (
                  <SelectItem key={q} value={q.toString()} className="text-xs">
                    {q} {language === "ar" ? "قطعة" : "pcs"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-slate-900">
              {customQuote ? (<span className="text-sm font-normal text-amber-700">{language === "ar" ? "يتطلب عرض سعر" : "Quote required"}</span>) : quoteLoading && !quote ? (
                <span className="text-sm font-normal text-slate-400">…</span>
              ) : quote ? (
                <>
                  {quote.total.toFixed(2)}{" "}
                  <span className="text-xs font-normal">{quote.currency}</span>
                </>
              ) : (
                <span className="text-sm font-normal text-slate-400">
                  {customQuote ? (language === "ar" ? "يتطلب عرض سعر" : "Quote required") : (language === "ar" ? "السعر غير متاح" : "Price unavailable")}
                </span>
              )}
            </div>
            {quote && !customQuote && (
              <div className="text-[10px] text-slate-400">
                {quote.unit.toFixed(2)} {quote.currency}/{language === "ar" ? "قطعة" : "pc"}
                {language === "ar" ? " (شامل الشحن)" : " (incl. shipping)"}
                <span className="text-amber-600"> · {language === "ar" ? "تقديري" : "est."}</span>
              </div>
            )}
          </div>
        </div>
        <Button disabled={customQuote} className="w-full bg-slate-900 hover:bg-slate-800 text-white h-10">
          {customQuote?(language === "ar" ? "يتطلب عرض سعر" : "Quote required"):(language === "ar" ? "متابعة الطلب" : "Continue")}
        </Button>
      </div>
    </aside>
  )
}
