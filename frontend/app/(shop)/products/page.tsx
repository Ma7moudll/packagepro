"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { catalogApi } from "@/lib/api/catalog"
import type { CatalogProductSummary } from "@shared/types"
import {
  Search,
  Package,
  ShoppingBag,
  Sticker,
  Loader2,
  Leaf,
  Sparkles,
  ArrowRight,
  Boxes,
  AlertCircle,
} from "lucide-react"

type FlattenedProduct = CatalogProductSummary & {
  categorySlug: string
  categoryName: string
  subcategorySlug: string
  subcategoryName: string
}

const typeIcon: Record<string, typeof Package> = {
  box: Boxes,
  bag: ShoppingBag,
  label: Sticker,
}

// Format with the API-verified currency (EGP, enforced by the pricing
// engine). Never assume another currency and never convert rates.
function formatMoney(value: number | null | undefined, currency: string = "EGP"): string | null {
  if (value === null || value === undefined) return null
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

export default function ProductsPage() {
  const router = useRouter()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => catalogApi.list().then((res) => res.data),
  })

  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [onlyCustom, setOnlyCustom] = useState(false)
  const [sort, setSort] = useState<"price-asc" | "price-desc" | "name">("price-asc")

  const categories = useMemo(() => data ?? [], [data])

  const products = useMemo<FlattenedProduct[]>(() => {
    const flat: FlattenedProduct[] = []
    for (const cat of categories) {
      for (const sub of cat.subcategories) {
        for (const p of sub.products) {
          flat.push({
            ...p,
            categorySlug: cat.slug,
            categoryName: cat.name,
            subcategorySlug: sub.slug,
            subcategoryName: sub.name,
          })
        }
      }
    }

    const q = search.trim().toLowerCase()
    const filtered = flat.filter((p) => {
      if (category !== "all" && p.categorySlug !== category) return false
      if (onlyCustom && !p.customisable) return false
      if (q) {
        const haystack = `${p.name} ${p.shortDescription ?? ""} ${p.subcategoryName} ${p.categoryName}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })

    return filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name)
      const pa = a.priceFrom ?? Number.MAX_SAFE_INTEGER
      const pb = b.priceFrom ?? Number.MAX_SAFE_INTEGER
      return sort === "price-asc" ? pa - pb : pb - pa
    })
  }, [categories, search, category, onlyCustom, sort])

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { slug: string; name: string }[] = []
    for (const cat of categories) {
      if (!seen.has(cat.slug)) {
        seen.add(cat.slug)
        opts.push({ slug: cat.slug, name: cat.name })
      }
    }
    return opts
  }, [categories])

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b bg-gradient-to-b from-muted/60 to-background">
        <div className="mx-auto max-w-7xl px-4 py-14 text-center">
          <Badge variant="secondary" className="mb-4 gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            Unified catalogue · live prices on verified products
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Custom Packaging for Your Brand
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Choose a product, configure material, printing and finishing options, and get
            live prices across quantity tiers on production-ready products. Products still
            under preparation are priced on request.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="product-search"
              aria-label="Search packaging"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={category === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory("all")}
            >
              All
            </Button>
            {categoryOptions.map((c) => (
              <Button
                key={c.slug}
                variant={category === c.slug ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(category === c.slug ? "all" : c.slug)}
              >
                {c.name}
              </Button>
            ))}
            <Button
              variant={onlyCustom ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyCustom((v) => !v)}
            >
              Customisable
            </Button>
            <select
              aria-label="Sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>

        <Separator className="my-6" />

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading products…
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-muted-foreground">Could not load the product catalog.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : products.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">
            No products match your filters.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const Icon = typeIcon[p.productType] ?? Package
              const quoteRequired = p.readiness?.pricing === "quote_required"
              return (
                <div
                  key={p.id}
                  className="group overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg"
                >
                  <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-muted to-muted/40">
                    {p.thumbnail ? (
                      <Image
                        src={p.thumbnail}
                        alt={p.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <Icon className="h-16 w-16 text-muted-foreground/60" />
                    )}
                    {p.customisable && !quoteRequired && (
                      <Badge className="absolute left-3 top-3 gap-1 bg-primary text-primary-foreground">
                        <Sparkles className="h-3 w-3" />
                        Customisable
                      </Badge>
                    )}
                    {p.ecoFlags && Object.keys(p.ecoFlags).length > 0 && (
                      <Badge
                        variant="secondary"
                        className="absolute right-3 top-3 gap-1 bg-emerald-600 text-white"
                      >
                        <Leaf className="h-3 w-3" />
                        Eco
                      </Badge>
                    )}
                  </div>

                  <div className="p-5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {p.subcategoryName}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">{p.name}</h3>
                    {p.shortDescription && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {p.shortDescription}
                      </p>
                    )}

                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        {quoteRequired ? (
                          <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
                            Under preparation
                          </Badge>
                        ) : (
                          formatMoney(p.priceFrom, p.currency ?? "EGP") && (
                            <p className="text-xl font-bold">
                              {formatMoney(p.priceFrom, p.currency ?? "EGP")}
                              <span className="text-sm font-normal text-muted-foreground"> from</span>
                            </p>
                          )
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">MOQ {p.moq} units</p>
                      </div>
                      <Button
                        size="sm"
                        variant={quoteRequired ? "outline" : "default"}
                        onClick={() => router.push(`/products/${p.slug}`)}
                      >
                        {quoteRequired ? "Request quote" : "Configure"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="mt-12 text-center text-sm text-muted-foreground">
          Packaging products include mailer boxes, shipping boxes, product boxes, mailing
          bags, carrier bags and label stickers with material and printing options.
        </p>
      </div>
    </div>
  )
}