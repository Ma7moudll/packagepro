"use client"

import Link from "next/link"
import { useLanguage } from "@/providers/language-provider"
import { PRODUCT_TEMPLATES, ProductTemplate } from "@/lib/data/product-templates"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Package, ShoppingBag, Coffee, Box } from "lucide-react"

// Product categories the online editor can actually render. Everything else
// (pouch, envelope, tissue, ...) falls back to a quote request.
const EDITOR_SUPPORTED_CATEGORIES = new Set(["box", "carton", "cup", "bag", "tube"])

export default function TemplatesPage() {
  const { language, isRTL } = useLanguage()

  // Helper to format currency. These catalog starting prices are USD rate
  // cards (same as the seeded materials); label them as such until the Egypt
  // price list lands.
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency: "USD",
    }).format(price)
  }

  const TemplateCard = ({ template }: { template: ProductTemplate }) => (
    <Card className="group h-full flex flex-col border-none bg-white shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 rounded-2xl overflow-hidden ring-1 ring-slate-100">
      <div className="aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 relative flex items-center justify-center p-8 overflow-hidden">
        {/* Animated background element */}
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-slate-900/5 rounded-full blur-3xl group-hover:bg-slate-900/10 transition-colors" />

        <div className="text-slate-300 group-hover:scale-110 group-hover:text-slate-900/20 transition-all duration-500 transform">
          {template.type.includes('box') && <Box className="w-16 h-16 md:w-20 md:h-20" />}
          {template.type === 'pouch' && <ShoppingBag className="w-16 h-16 md:w-20 md:h-20" />}
          {template.type === 'cup' && <Coffee className="w-16 h-16 md:w-20 md:h-20" />}
          {template.type === 'bag' && <Package className="w-16 h-16 md:w-20 md:h-20" />}
          {template.type === 'tube' && <Package className="w-16 h-16 md:w-20 md:h-20 rotate-90" />}
          {template.type === 'envelope' && <Package className="w-16 h-16 md:w-20 md:h-20 scale-y-50" />}
        </div>

        <div className="absolute top-4 left-4">
          <Badge className="bg-white/80 backdrop-blur-sm text-slate-900 border-none shadow-sm font-bold text-[10px] px-2 py-0.5">
            {template.dimensions.length}x{template.dimensions.width}x{template.dimensions.height}
          </Badge>
        </div>

        {template.price < 0.5 && (
          <div className="absolute top-4 right-4 bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-slate-900/20 uppercase">
            {language === 'ar' ? 'الأكثر توفيراً' : 'Best Value'}
          </div>
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="flex justify-between items-start mb-1">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {template.category}
          </span>
        </div>
        <CardTitle className="text-lg font-black text-slate-900 group-hover:text-slate-600 transition-colors uppercase tracking-tight">
          {template.name}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 pb-4">
        <CardDescription className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
          {template.description}
        </CardDescription>

        <div className={`flex gap-4 pt-4 border-t border-slate-50 ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className="flex-1">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
              {language === 'ar' ? 'أقل طلب' : 'Min. Order'}
            </p>
            <p className="text-sm font-black text-slate-900">
              {template.minQuantity} <span className="text-[10px] font-medium text-slate-500">{language === 'ar' ? 'قطعة' : 'pcs'}</span>
            </p>
          </div>
          <div className={`flex-1 ${isRTL ? "text-left" : "text-right"}`}>
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
              {language === 'ar' ? 'يبدأ من' : 'Starting at'}
            </p>
            <p className="text-sm font-black text-slate-900">
              {formatPrice(template.price)}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 p-4">
        <Link
          href={`/editor?type=${template.type}&sku=box--${template.type}--${template.dimensions.length}x${template.dimensions.width}x${template.dimensions.height}--cardboard-kraft--print-monochrome--foil-none`}
          className="w-full"
        >
          <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black h-11 rounded-xl transition-all shadow-lg shadow-slate-200 group-hover:shadow-slate-300">
            {language === 'ar' ? 'ابدأ التصميم' : 'Customize Now'}
            <span className={`${isRTL ? 'mr-2 group-hover:-translate-x-1' : 'ml-2 group-hover:translate-x-1'} transition-transform`}>{isRTL ? '←' : '→'}</span>
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )

  return (
    <div className="container mx-auto px-4 py-20 max-w-7xl">
      <div className="text-center mb-20">
        <div className="inline-block px-4 py-1.5 bg-slate-50 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-full mb-6 ring-1 ring-slate-200">
          {language === 'ar' ? 'الكتالوج الكامل' : 'Full Catalog'}
        </div>
        <h1 className="text-5xl md:text-6xl font-black mb-6 text-slate-900 tracking-tighter">
          {language === 'ar' ? 'قوالب جاهزة للتصميم' : 'Premium Packaging'}
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">
          {language === 'ar'
            ? 'مجموعة مختارة بعناية من حلول التغليف الفاخرة التي تدعم علامتك التجارية.'
            : 'Select from our curated collection of professional packaging solutions designed to elevate your brand.'}
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex justify-center mb-16">
          <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl h-14 border border-slate-200/50 backdrop-blur-sm shadow-inner">
            <TabsTrigger value="all" className="px-8 rounded-xl font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:text-slate-900 transition-all">{language === 'ar' ? 'الكل' : 'All'}</TabsTrigger>
            <TabsTrigger value="box" className="px-8 rounded-xl font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:text-slate-900 transition-all">{language === 'ar' ? 'علب' : 'Boxes'}</TabsTrigger>
            <TabsTrigger value="pouch" className="px-8 rounded-xl font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:text-slate-900 transition-all">{language === 'ar' ? 'أكياس' : 'Pouches'}</TabsTrigger>
            <TabsTrigger value="tube" className="px-8 rounded-xl font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-xl data-[state=active]:text-slate-900 transition-all">{language === 'ar' ? 'أنابيب' : 'Tubes'}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="animate-in fade-in slide-in-from-bottom-5 duration-700 m-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {PRODUCT_TEMPLATES.map(t => <TemplateCard key={t.id} template={t} />)}
          </div>
        </TabsContent>
        {["box", "pouch", "tube"].map(cat => {
          const filtered = PRODUCT_TEMPLATES.filter(t => t.category === cat)
          return (
            <TabsContent key={cat} value={cat} className="animate-in fade-in slide-in-from-bottom-5 duration-700 m-0">
              {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {filtered.map(t => <TemplateCard key={t.id} template={t} />)}
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-slate-400 text-lg font-medium">
                    {language === "ar" ? "لا توجد قوالب في هذه الفئة" : "No templates in this category"}
                  </p>
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
