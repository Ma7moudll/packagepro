"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { catalogApi } from "@/lib/api/catalog"
import { useCart } from "@/providers/cart-provider"
import { useToast } from "@/hooks/use-toast"
import type {
  CatalogConfig,
  CatalogOption,
  CatalogProductDetail,
  CatalogQuote,
  CatalogQuoteRequest,
  Dimensions,
} from "@shared/types"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Edit3,
  Leaf,
  Loader2,
  Package,
  Sparkles,
  Truck,
  Info,
  ShieldCheck,
} from "lucide-react"

type Unit = "cm" | "mm" | "inch"

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  return `$${Number(n).toFixed(2)}`
}

function clampDim(
  value: number,
  min: number,
  max: number,
  fallback: number
): number {
  if (!Number.isFinite(value) || value <= 0) return fallback
  return Math.min(Math.max(value, min), max)
}

function defaultConfig(product: CatalogProductDetail): CatalogConfig {
  const config: CatalogConfig = {}
  for (const option of product.options ?? []) {
    const def = option.values.find((v) => v.isDefault)
    if (def) config[option.key] = def.value
  }
  return config
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>()
  const slug = params?.id ?? ""
  const router = useRouter()
  const { addItem } = useCart()
  const { toast } = useToast()

  const { data, isLoading, isError } = useQuery({
    queryKey: ["catalog", slug],
    queryFn: () => catalogApi.detail(slug).then((res) => res.data),
    enabled: Boolean(slug),
    retry: false,
  })

  const product = data as CatalogProductDetail | undefined

  const unit: Unit = (product?.sizeUnit as Unit) ?? "cm"
  const minD = (product?.minDimensions ?? { length: 0, width: 0, height: 0 }) as Dimensions
  const maxD = (product?.maxDimensions ?? { length: 1000, width: 1000, height: 1000 }) as Dimensions

  const [quantity, setQuantity] = useState<number>(30)
  const [sizeMode, setSizeMode] = useState<"preset" | "custom">("preset")
  const [sizeIndex, setSizeIndex] = useState<number>(0)
  const [customDims, setCustomDims] = useState({
    length: 0,
    width: 0,
    height: 0,
  })
  const [config, setConfig] = useState<CatalogConfig>({})

  useEffect(() => {
    if (!product) return
    const base = product.minDimensions as Dimensions
    setQuantity(Math.max(product.moq ?? 30, 30))
    setSizeIndex(0)
    setCustomDims({
      length: (product.defaultDimensions as Dimensions)?.length ?? base.length,
      width: (product.defaultDimensions as Dimensions)?.width ?? base.width,
      height: (product.defaultDimensions as Dimensions)?.height ?? base.height ?? 1,
    })
    setConfig(defaultConfig(product))
    setSizeMode("preset")
  }, [product?.id, product])

  const selectedPreset = product?.baseSizes?.[sizeIndex]

  const dimensions = useMemo<Dimensions>(() => {
    if (sizeMode === "preset" && selectedPreset) {
      return { length: selectedPreset.length, width: selectedPreset.width, height: selectedPreset.height, unit }
    }
    return {
      length: clampDim(customDims.length, minD.length, maxD.length, 10),
      width: clampDim(customDims.width, minD.width, maxD.width, 10),
      height: clampDim(customDims.height, minD.height || 0, maxD.height || Math.max(customDims.height, 1), customDims.height || 1),
      unit,
    }
  }, [sizeMode, selectedPreset, customDims, minD, maxD, unit])

  const sizeVariant = useMemo(() => {
    if (sizeMode !== "preset" || !selectedPreset || !product) return null
    return (
      product.variants.find(
        (v) => v.sizeCode === selectedPreset.code
      ) ?? product.variants.find((v) => v.isDefault) ?? null
    )
  }, [sizeMode, selectedPreset, product])

  const quoteRequest = useMemo<CatalogQuoteRequest | null>(() => {
    if (!product) return null
    const effectiveQty = Math.max(quantity, product.moq)
    return {
      variantId: sizeVariant?.id,
      quantity: effectiveQty,
      dimensions,
      config,
      complexity: "simple",
    }
  }, [product, quantity, sizeVariant, dimensions, config])

  const [debounced, setDebounced] = useState<CatalogQuoteRequest | null>(null)
  useEffect(() => {
    setDebounced(null)
    if (!quoteRequest) return
    const t = setTimeout(() => setDebounced(quoteRequest), 350)
    return () => clearTimeout(t)
  }, [quoteRequest])

  const quoteQuery = useQuery({
    queryKey: ["catalog-quote", slug, debounced ? JSON.stringify(debounced) : "pending"],
    queryFn: () =>
      catalogApi.quote(slug, debounced as CatalogQuoteRequest).then((res) => res.data),
    enabled: Boolean(debounced && product),
    retry: false,
  })
  const quote = quoteQuery.data as CatalogQuote | undefined
  const quoteError = quoteQuery.isError ? quoteQuery.error : null

  const optionValue = (key: string): string | undefined => config[key]

  const handleAddToCart = async () => {
    if (!product || !debounced || !quote) return
    try {
      await addItem({
        productType: product.productType as "box" | "bag" | "label",
        productId: product.id,
        variantId: quote.variant.id ?? undefined,
        sku: quote.variant.sku,
        config,
        quantity: debounced.quantity,
        dimensions: debounced.dimensions!,
        materialCode: optionValue("material"),
        finish: optionValue("finish"),
        name: product.name,
        image: product.thumbnail ?? undefined,
      })
      toast({ title: "Added to cart", description: `${quote.quantity} × ${product.name}` })
    } catch (err: any) {
      toast({
        title: "Could not add to cart",
        description: err?.message ?? "Please log in and try again.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <Skeleton className="h-8 w-48" />
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <Skeleton className="h-[420px] rounded-2xl" />
          <Skeleton className="h-[420px] rounded-2xl" />
        </div>
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-24 text-center">
        <Package className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Product not found</h1>
        <p className="text-muted-foreground">
          We couldn&apos;t find that product in the catalog.
        </p>
        <Button variant="outline" onClick={() => router.push("/products")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to products
        </Button>
      </div>
    )
  }

  const bd = quote?.breakdown
  const effectiveQty = Math.max(quantity, product.moq)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <button
        onClick={() => router.push("/products")}
        className="mb-6 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to products
      </button>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-br from-muted to-muted/40">
            {product.thumbnail ? (
              <Image
                src={product.thumbnail}
                alt={product.name}
                fill
                className="object-cover"
              />
            ) : (
              <Package className="h-24 w-24 text-muted-foreground/50" />
            )}
            {product.customisable && (
              <Badge className="absolute left-4 top-4 gap-1">
                <Icons.sparkles />
                Fully customisable
              </Badge>
            )}
            {product.ecoFlags && Object.keys(product.ecoFlags).length > 0 && (
              <Badge variant="secondary" className="absolute right-4 top-4 gap-1 bg-emerald-600 text-white">
                <Icons.leaf />
                Eco
              </Badge>
            )}
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {product.subcategory.name}
            </p>
            <h1 className="mt-1 text-3xl font-bold">{product.name}</h1>
            {product.shortDescription && (
              <p className="mt-2 text-muted-foreground">{product.shortDescription}</p>
            )}
            {product.description && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}

            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border p-3">
                <p className="text-lg font-bold">{product.moq}</p>
                <p className="text-xs text-muted-foreground">MOQ</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-lg font-bold">{fmtMoney(product.priceFrom)}</p>
                <p className="text-xs text-muted-foreground">From / unit</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-lg font-bold">{unit}</p>
                <p className="text-xs text-muted-foreground">Size unit</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <Icons.truck />
                DHL shipping
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Icons.shield />
                Made to order
              </Badge>
              {product.ecoFlags &&
                Object.entries(product.ecoFlags).map(([k, v]) => (
                  <Badge key={k} variant="outline" className="gap-1">
                    <Icons.leaf />
                    {String(v)}
                  </Badge>
                ))}
            </div>
          </div>
        </div>

        <div className="lg:pl-4">
          <div className="sticky top-6 space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Configure &amp; price</h2>

            {/* Size */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Size</Label>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={sizeMode === "preset" ? "default" : "outline"}
                    onClick={() => setSizeMode("preset")}
                  >
                    Standard
                  </Button>
                  <Button
                    size="sm"
                    variant={sizeMode === "custom" ? "default" : "outline"}
                    onClick={() => setSizeMode("custom")}
                  >
                    Custom
                  </Button>
                </div>
              </div>

              {sizeMode === "preset" && product.baseSizes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {product.baseSizes.map((s, i) => (
                    <button
                      key={s.code}
                      onClick={() => setSizeIndex(i)}
                      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                        i === sizeIndex
                          ? "border-primary bg-primary/10 font-medium text-primary"
                          : "hover:border-primary/40"
                      }`}
                    >
                      {s.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {s.length}×{s.width}×{s.height} {unit}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {(["length", "width", "height"] as const).map((k) => (
                    <div key={k}>
                      <Label className="text-xs capitalize">{k} ({unit})</Label>
                      <Input
                        type="number"
                        min={minD[k] ?? 1}
                        value={customDims[k] || ""}
                        onChange={(e) =>
                          setCustomDims((d) => ({ ...d, [k]: Number(e.target.value) }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
              {sizeMode === "custom" && (
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Icons.info />
                  Min {minD.length}×{minD.width}×{minD.height || "—"} — max {maxD.length}×
                  {maxD.width}×{maxD.height || "—"} {unit}
                </p>
              )}
            </div>

            <Separator />

            {/* Quantity */}
            <div>
              <Label>Quantity</Label>
              <div className="mt-2 flex items-center gap-3">
                <Input
                  type="number"
                  min={product.moq}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                  className="w-32"
                />
                <div className="text-sm text-muted-foreground">
                  {effectiveQty !== quantity && (
                    <span className="text-amber-600">
                      Min order is {product.moq} — quoting {effectiveQty}
                      <br />
                    </span>
                  )}
                  Tiers:{" "}
                  {product.quantityTiers.length > 0
                    ? product.quantityTiers
                        .map((t) => `${t.minQuantity}+ (−${Math.round((1 - t.factor) * 100)}%)`)
                        .join(", ")
                    : "based on quantity"}
                </div>
              </div>
            </div>

            <Separator />

            {/* Options */}
            {product.options.map((option) => (
              <OptionGroup
                key={option.key}
                option={option}
                value={optionValue(option.key) ?? ""}
                onChange={(v) =>
                  setConfig((c) => ({ ...c, [option.key]: v }))
                }
              />
            ))}

            <Separator />

            {/* Quote */}
            {(quoteQuery.isLoading || !debounced) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculating live price…
              </div>
            )}

            {quoteError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {(quoteError as any)?.message ?? "Could not price this configuration."}
              </div>
            )}

            {quote && bd && (
              <div className="space-y-3">
                <div className="rounded-xl border bg-muted/40 p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">Unit price</span>
                    <span className="text-2xl font-bold">{fmtMoney(quote.unitPrice)}</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">Total ({effectiveQty} pcs)</span>
                    <span className="text-lg font-semibold">{fmtMoney(quote.totalPrice)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    SKU: <span className="font-mono">{quote.variant.sku}</span>
                  </p>
                </div>

                <div className="space-y-1.5 text-sm">
                  <Row label={`Material · ${quote.material.name ?? quote.material.code}`} value={fmtMoney(bd.materialCost)} />
                  <Row label="Production" value={fmtMoney(bd.conversionCost)} />
                  {bd.optionsMarkup ? <Row label="Print & finish options" value={fmtMoney(bd.optionsMarkup)} /> : null}
                  {bd.discountApplied ? (
                    <Row
                      label={`Quantity discount (${bd.discountFactor ? `−${Math.round((1 - bd.discountFactor) * 100)}%` : ""})`}
                      value={`−${fmtMoney(bd.discountApplied)}`}
                      accent="text-emerald-600"
                    />
                  ) : null}
                  <Row label="Platform margin" value={fmtMoney(bd.marginAmount)} muted />
                  <Row label="VAT" value={fmtMoney(bd.tax)} muted />
                  <Row label="Shipping (expedited)" value={fmtMoney(bd.shippingEstimate)} />
                  <Separator className="my-1" />
                  <Row label="Total" value={fmtMoney(bd.total)} strong />
                </div>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={!debounced || !quote || !!quoteError}
              onClick={handleAddToCart}
            >
              <Icons.package className="mr-2 h-4 w-4" />
              Add to cart · {quote ? fmtMoney(quote.totalPrice) : "…"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                router.push(`/editor?product=${product.slug}&qty=${effectiveQty}`)
              }
            >
              <Icons.edit className="mr-2 h-4 w-4" />
              Design in the editor
              <ArrowRight className="ml-auto h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  muted,
  strong,
  accent,
}: {
  label: string
  value: string
  muted?: boolean
  strong?: boolean
  accent?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={muted && !strong ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`${strong ? "font-bold" : "font-medium"} ${accent ?? ""}`}>{value}</span>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm font-medium ${className ?? ""}`}>{children}</div>
}

function OptionGroup({
  option,
  value,
  onChange,
}: {
  option: CatalogOption
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <Label>
        {option.label}
        {option.required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {option.values.map((v) => {
          const active = v.value === value
          const delta =
            v.priceDelta !== null && v.priceDelta !== undefined && v.priceDelta !== 0
              ? `${v.priceDelta > 0 ? "+" : ""}${fmtMoney(v.priceDelta)}`
              : null
          return (
            <button
              key={v.value}
              onClick={() => onChange(v.value)}
              className={`relative rounded-lg border px-3 py-2 text-sm transition-colors ${
                active
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "hover:border-primary/40"
              }`}
            >
              {v.label}
              {delta && (
                <span className="ml-1.5 text-xs text-muted-foreground">{delta}</span>
              )}
              {active && (
                <Check className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full bg-primary p-0.5 text-primary-foreground" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const Icons = {
  leaf: Leaf,
  truck: Truck,
  shield: ShieldCheck,
  info: Info,
  sparkles: Sparkles,
  edit: Edit3,
  package: Package,
  check: Check,
}