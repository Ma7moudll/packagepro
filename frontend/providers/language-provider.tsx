"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type Language = "en" | "ar"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  isRTL: boolean
}

const translations = {
  en: {
    // Navigation
    "nav.products": "Products",
    "nav.b2b": "B2B Portal",
    "nav.about": "About Us",
    "nav.contact": "Contact",
    "nav.blog": "Blog",
    "nav.cart": "Cart",
    "nav.login": "Sign In",
    "nav.register": "Sign Up",

    // Homepage
    "hero.title": "Custom Packaging Solutions for Every Occasion",
    "hero.subtitle":
      "From bulk business orders to personalized event packaging, we deliver quality solutions that make your brand stand out.",
    "hero.cta.b2b": "Request B2B Quote",
    "hero.cta.shop": "Shop for Events",

    // Products
    "products.title": "Our Products",
    "products.search": "Search products...",
    "products.category": "Category",
    "products.material": "Material",
    "products.sort": "Sort by",
    "products.addToCart": "Add to Cart",
    "products.customize": "Customize Design",

    // Common
    "common.loading": "Loading...",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.submit": "Submit",
    "common.price": "Price",
    "common.quantity": "Quantity",
    "common.total": "Total",
  },
  ar: {
    // Navigation
    "nav.products": "المنتجات",
    "nav.b2b": "بوابة الشركات",
    "nav.about": "من نحن",
    "nav.contact": "اتصل بنا",
    "nav.blog": "المدونة",
    "nav.cart": "السلة",
    "nav.login": "تسجيل الدخول",
    "nav.register": "إنشاء حساب",

    // Homepage
    "hero.title": "حلول التغليف المخصصة لكل مناسبة",
    "hero.subtitle":
      "من طلبات الشركات بالجملة إلى تغليف المناسبات الشخصية، نقدم حلول عالية الجودة تجعل علامتك التجارية متميزة.",
    "hero.cta.b2b": "طلب عرض سعر للشركات",
    "hero.cta.shop": "تسوق للمناسبات",

    // Products
    "products.title": "منتجاتنا",
    "products.search": "البحث في المنتجات...",
    "products.category": "الفئة",
    "products.material": "المادة",
    "products.sort": "ترتيب حسب",
    "products.addToCart": "إضافة للسلة",
    "products.customize": "تخصيص التصميم",

    // Common
    "common.loading": "جاري التحميل...",
    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.submit": "إرسال",
    "common.price": "السعر",
    "common.quantity": "الكمية",
    "common.total": "المجموع",
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en")

  useEffect(() => {
    const savedLang = localStorage.getItem("language") as Language
    if (savedLang && (savedLang === "en" || savedLang === "ar")) {
      setLanguage(savedLang)
    }
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem("language", lang)
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"
    document.documentElement.lang = lang
  }

  const t = (key: string): string => {
    return translations[language][key as keyof (typeof translations)[typeof language]] || key
  }

  const isRTL = language === "ar"

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
