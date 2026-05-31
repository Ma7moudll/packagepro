"use client"

export interface ElementItem {
  id: string
  name: { en: string; ar: string }
  category: string
  subcategory?: string
  svg: string
  tags: string[]
}

export interface ElementCategory {
  id: string
  name: { en: string; ar: string }
  icon: string
  subcategories?: { id: string; name: { en: string; ar: string } }[]
}

// Element categories
export const ELEMENT_CATEGORIES: ElementCategory[] = [
  { 
    id: "eco", 
    name: { en: "Eco symbols", ar: "رموز بيئية" }, 
    icon: "🌱",
    subcategories: [
      { id: "sustainable", name: { en: "Sustainability", ar: "الاستدامة" } },
      { id: "recycling", name: { en: "Recycling", ar: "إعادة التدوير" } },
      { id: "certifications", name: { en: "Certifications", ar: "الشهادات" } },
    ]
  },
  { 
    id: "eco_properties", 
    name: { en: "Eco properties", ar: "خصائص بيئية" }, 
    icon: "♻️" 
  },
  { 
    id: "logistics", 
    name: { en: "Logistics icons", ar: "أيقونات لوجستية" }, 
    icon: "📦",
    subcategories: [
      { id: "handling", name: { en: "Handling", ar: "التعامل" } },
      { id: "storage", name: { en: "Storage", ar: "التخزين" } },
    ]
  },
  { 
    id: "geometric", 
    name: { en: "Geometric shapes", ar: "أشكال هندسية" }, 
    icon: "◯" 
  },
  { 
    id: "abstract", 
    name: { en: "Abstract shapes", ar: "أشكال تجريدية" }, 
    icon: "🎨" 
  },
  { 
    id: "social_rectangle", 
    name: { en: "Social / Rectangle", ar: "سوشيال / مستطيل" }, 
    icon: "📱" 
  },
  { 
    id: "social_rounded", 
    name: { en: "Social / Rounded", ar: "سوشيال / دائري" }, 
    icon: "⭕" 
  },
  { 
    id: "symbols", 
    name: { en: "Symbols", ar: "رموز" }, 
    icon: "❤️" 
  },
]

// Generate inline SVG for elements
function createSvg(content: string, viewBox = "0 0 100 100"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${content}</svg>`
}

// ECO SYMBOLS
export const ECO_SYMBOLS: ElementItem[] = [
  {
    id: "eco-sustainable-1",
    name: { en: "We use sustainable packaging I", ar: "نستخدم تغليف مستدام ١" },
    category: "eco",
    subcategory: "sustainable",
    svg: createSvg(`
      <circle cx="50" cy="50" r="45" fill="none" stroke="#16a34a" stroke-width="3"/>
      <path d="M35 50 Q50 30 65 50 Q50 70 35 50" fill="#22c55e"/>
      <line x1="50" y1="50" x2="50" y2="75" stroke="#22c55e" stroke-width="4"/>
      <text x="50" y="92" text-anchor="middle" font-size="8" fill="#16a34a">SUSTAINABLE</text>
    `),
    tags: ["eco", "sustainable", "packaging", "green"],
  },
  {
    id: "eco-sustainable-2",
    name: { en: "We use sustainable packaging II", ar: "نستخدم تغليف مستدام ٢" },
    category: "eco",
    subcategory: "sustainable",
    svg: createSvg(`
      <rect x="10" y="20" width="80" height="60" rx="5" fill="none" stroke="#16a34a" stroke-width="2"/>
      <path d="M30 50 Q50 30 70 50 Q50 70 30 50" fill="#22c55e"/>
      <line x1="50" y1="50" x2="50" y2="70" stroke="#22c55e" stroke-width="3"/>
      <text x="50" y="15" text-anchor="middle" font-size="7" fill="#16a34a">ECO-FRIENDLY</text>
    `),
    tags: ["eco", "sustainable", "friendly", "badge"],
  },
  {
    id: "eco-qr-vertical",
    name: { en: "QR Code Vertical", ar: "كود QR عمودي" },
    category: "eco",
    subcategory: "sustainable",
    svg: createSvg(`
      <rect x="25" y="10" width="50" height="50" fill="#1e293b"/>
      <rect x="30" y="15" width="15" height="15" fill="white"/>
      <rect x="55" y="15" width="15" height="15" fill="white"/>
      <rect x="30" y="40" width="15" height="15" fill="white"/>
      <text x="50" y="75" text-anchor="middle" font-size="8" fill="#1e293b">SCAN ME</text>
      <text x="50" y="85" text-anchor="middle" font-size="6" fill="#64748b">Learn more</text>
    `),
    tags: ["qr", "scan", "digital", "vertical"],
  },
  {
    id: "recycle-symbol",
    name: { en: "Recycling Symbol", ar: "رمز إعادة التدوير" },
    category: "eco",
    subcategory: "recycling",
    svg: createSvg(`
      <path d="M50 15 L65 40 L55 40 L55 55 L45 55 L45 40 L35 40 Z" fill="#16a34a"/>
      <path d="M25 55 L50 55 L50 65 L35 85 L25 70 L35 70 Z" fill="#16a34a" transform="rotate(120 50 50)"/>
      <path d="M25 55 L50 55 L50 65 L35 85 L25 70 L35 70 Z" fill="#16a34a" transform="rotate(240 50 50)"/>
    `),
    tags: ["recycle", "recycling", "green", "symbol"],
  },
  {
    id: "recyclable-badge",
    name: { en: "Recyclable Badge", ar: "شارة قابل للتدوير" },
    category: "eco",
    subcategory: "recycling",
    svg: createSvg(`
      <circle cx="50" cy="50" r="40" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
      <path d="M50 25 L60 40 L55 40 L55 50 L45 50 L45 40 L40 40 Z" fill="#16a34a"/>
      <path d="M30 50 L50 50 L50 55 L40 70 L30 60 L40 60 Z" fill="#16a34a" transform="rotate(120 50 50)"/>
      <path d="M30 50 L50 50 L50 55 L40 70 L30 60 L40 60 Z" fill="#16a34a" transform="rotate(240 50 50)"/>
      <text x="50" y="88" text-anchor="middle" font-size="7" fill="#16a34a">RECYCLABLE</text>
    `),
    tags: ["recyclable", "badge", "green", "certified"],
  },
]

// ECO PROPERTIES
export const ECO_PROPERTIES: ElementItem[] = [
  {
    id: "biodegradable",
    name: { en: "Biodegradable Material", ar: "مادة قابلة للتحلل" },
    category: "eco_properties",
    svg: createSvg(`
      <circle cx="50" cy="50" r="40" fill="#ecfdf5" stroke="#059669" stroke-width="2"/>
      <path d="M35 55 Q50 35 65 55 Q50 75 35 55" fill="#10b981"/>
      <line x1="50" y1="55" x2="50" y2="75" stroke="#10b981" stroke-width="3"/>
      <text x="50" y="92" text-anchor="middle" font-size="6" fill="#059669">BIODEGRADABLE</text>
    `),
    tags: ["biodegradable", "eco", "compostable", "natural"],
  },
  {
    id: "made-in-europe",
    name: { en: "Made in Europe", ar: "صنع في أوروبا" },
    category: "eco_properties",
    svg: createSvg(`
      <circle cx="50" cy="50" r="40" fill="#1e40af" stroke="#1e3a8a" stroke-width="2"/>
      <circle cx="50" cy="40" r="3" fill="#fbbf24"/>
      <circle cx="42" cy="45" r="3" fill="#fbbf24"/>
      <circle cx="58" cy="45" r="3" fill="#fbbf24"/>
      <circle cx="40" cy="55" r="3" fill="#fbbf24"/>
      <circle cx="60" cy="55" r="3" fill="#fbbf24"/>
      <circle cx="45" cy="62" r="3" fill="#fbbf24"/>
      <circle cx="55" cy="62" r="3" fill="#fbbf24"/>
      <text x="50" y="85" text-anchor="middle" font-size="6" fill="white">MADE IN EUROPE</text>
    `),
    tags: ["europe", "made", "eu", "origin"],
  },
  {
    id: "plastic-free",
    name: { en: "Plastic-free", ar: "خالي من البلاستيك" },
    category: "eco_properties",
    svg: createSvg(`
      <circle cx="50" cy="50" r="40" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
      <rect x="35" y="30" width="30" height="40" rx="3" fill="none" stroke="#92400e" stroke-width="2"/>
      <line x1="30" y1="25" x2="70" y2="75" stroke="#dc2626" stroke-width="4"/>
      <text x="50" y="90" text-anchor="middle" font-size="6" fill="#92400e">PLASTIC FREE</text>
    `),
    tags: ["plastic", "free", "eco", "sustainable"],
  },
  {
    id: "fsc-certified",
    name: { en: "FSC Certified", ar: "معتمد FSC" },
    category: "eco_properties",
    svg: createSvg(`
      <rect x="15" y="25" width="70" height="50" rx="5" fill="#166534" stroke="#14532d" stroke-width="2"/>
      <text x="50" y="45" text-anchor="middle" font-size="12" fill="white" font-weight="bold">FSC</text>
      <text x="50" y="60" text-anchor="middle" font-size="6" fill="white">CERTIFIED</text>
    `),
    tags: ["fsc", "certified", "forest", "sustainable"],
  },
  {
    id: "carbon-neutral",
    name: { en: "Carbon Neutral", ar: "محايد للكربون" },
    category: "eco_properties",
    svg: createSvg(`
      <circle cx="50" cy="50" r="40" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
      <text x="50" y="40" text-anchor="middle" font-size="14" fill="#16a34a">CO₂</text>
      <text x="50" y="55" text-anchor="middle" font-size="10" fill="#16a34a">NEUTRAL</text>
      <path d="M30 65 L50 75 L70 65" fill="none" stroke="#16a34a" stroke-width="2"/>
    `),
    tags: ["carbon", "neutral", "climate", "eco"],
  },
]

// LOGISTICS ICONS
export const LOGISTICS_ICONS: ElementItem[] = [
  {
    id: "fragile-01",
    name: { en: "Fragile 01", ar: "قابل للكسر ٠١" },
    category: "logistics",
    subcategory: "handling",
    svg: createSvg(`
      <rect x="20" y="10" width="60" height="80" fill="none" stroke="#1e293b" stroke-width="2"/>
      <path d="M35 35 L50 20 L65 35 L50 70 Z" fill="none" stroke="#1e293b" stroke-width="2"/>
      <line x1="45" y1="45" x2="55" y2="45" stroke="#1e293b" stroke-width="2"/>
      <text x="50" y="85" text-anchor="middle" font-size="8" fill="#1e293b">FRAGILE</text>
    `),
    tags: ["fragile", "glass", "breakable", "handle"],
  },
  {
    id: "handle-with-care-01",
    name: { en: "Handle with Care 01", ar: "تعامل بحرص ٠١" },
    category: "logistics",
    subcategory: "handling",
    svg: createSvg(`
      <rect x="20" y="15" width="60" height="70" fill="none" stroke="#1e293b" stroke-width="2"/>
      <path d="M40 35 Q50 25 60 35 Q65 45 60 55 Q50 65 40 55 Q35 45 40 35" fill="none" stroke="#1e293b" stroke-width="2"/>
      <circle cx="50" cy="45" r="5" fill="#1e293b"/>
      <text x="50" y="80" text-anchor="middle" font-size="6" fill="#1e293b">HANDLE WITH CARE</text>
    `),
    tags: ["handle", "care", "careful", "hands"],
  },
  {
    id: "keep-cool-01",
    name: { en: "Keep Cool 01", ar: "ابق بارداً ٠١" },
    category: "logistics",
    subcategory: "storage",
    svg: createSvg(`
      <rect x="20" y="15" width="60" height="70" fill="none" stroke="#0ea5e9" stroke-width="2"/>
      <path d="M50 25 L50 65 M35 35 L65 55 M65 35 L35 55" stroke="#0ea5e9" stroke-width="2"/>
      <circle cx="50" cy="45" r="3" fill="#0ea5e9"/>
      <text x="50" y="80" text-anchor="middle" font-size="8" fill="#0ea5e9">KEEP COOL</text>
    `),
    tags: ["cool", "cold", "temperature", "refrigerate"],
  },
  {
    id: "this-side-up",
    name: { en: "This Side Up", ar: "هذا الجانب للأعلى" },
    category: "logistics",
    subcategory: "handling",
    svg: createSvg(`
      <rect x="20" y="15" width="60" height="70" fill="none" stroke="#1e293b" stroke-width="2"/>
      <path d="M35 55 L50 30 L65 55" fill="none" stroke="#1e293b" stroke-width="3"/>
      <path d="M35 65 L50 40 L65 65" fill="none" stroke="#1e293b" stroke-width="3"/>
      <text x="50" y="80" text-anchor="middle" font-size="6" fill="#1e293b">THIS SIDE UP</text>
    `),
    tags: ["up", "side", "orientation", "arrow"],
  },
  {
    id: "keep-dry",
    name: { en: "Keep Dry", ar: "ابق جافاً" },
    category: "logistics",
    subcategory: "storage",
    svg: createSvg(`
      <rect x="20" y="15" width="60" height="70" fill="none" stroke="#1e293b" stroke-width="2"/>
      <path d="M40 40 Q50 20 60 40 Q60 55 50 60 Q40 55 40 40" fill="none" stroke="#1e293b" stroke-width="2"/>
      <line x1="30" y1="30" x2="70" y2="70" stroke="#dc2626" stroke-width="3"/>
      <text x="50" y="80" text-anchor="middle" font-size="8" fill="#1e293b">KEEP DRY</text>
    `),
    tags: ["dry", "water", "moisture", "protect"],
  },
  {
    id: "do-not-stack",
    name: { en: "Do Not Stack", ar: "لا ترص فوقه" },
    category: "logistics",
    subcategory: "handling",
    svg: createSvg(`
      <rect x="20" y="15" width="60" height="70" fill="none" stroke="#1e293b" stroke-width="2"/>
      <rect x="35" y="50" width="30" height="20" fill="none" stroke="#1e293b" stroke-width="2"/>
      <rect x="35" y="30" width="30" height="20" fill="none" stroke="#1e293b" stroke-width="2"/>
      <line x1="30" y1="25" x2="70" y2="75" stroke="#dc2626" stroke-width="3"/>
      <text x="50" y="80" text-anchor="middle" font-size="6" fill="#1e293b">DO NOT STACK</text>
    `),
    tags: ["stack", "weight", "boxes", "limit"],
  },
]

// GEOMETRIC SHAPES
export const GEOMETRIC_SHAPES: ElementItem[] = [
  {
    id: "circle",
    name: { en: "Circle", ar: "دائرة" },
    category: "geometric",
    svg: createSvg(`<circle cx="50" cy="50" r="40" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>`),
    tags: ["circle", "round", "shape", "basic"],
  },
  {
    id: "square",
    name: { en: "Square", ar: "مربع" },
    category: "geometric",
    svg: createSvg(`<rect x="15" y="15" width="70" height="70" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>`),
    tags: ["square", "rectangle", "shape", "basic"],
  },
  {
    id: "triangle",
    name: { en: "Triangle", ar: "مثلث" },
    category: "geometric",
    svg: createSvg(`<polygon points="50,10 90,90 10,90" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>`),
    tags: ["triangle", "shape", "basic", "polygon"],
  },
  {
    id: "hexagon",
    name: { en: "Hexagon", ar: "سداسي" },
    category: "geometric",
    svg: createSvg(`<polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>`),
    tags: ["hexagon", "shape", "polygon", "six"],
  },
  {
    id: "star",
    name: { en: "Star", ar: "نجمة" },
    category: "geometric",
    svg: createSvg(`<polygon points="50,5 61,40 98,40 68,62 79,97 50,75 21,97 32,62 2,40 39,40" fill="#fbbf24" stroke="#d97706" stroke-width="2"/>`),
    tags: ["star", "shape", "rating", "favorite"],
  },
]

// ABSTRACT SHAPES
export const ABSTRACT_SHAPES: ElementItem[] = [
  {
    id: "abstract-001",
    name: { en: "Abstract 001", ar: "تجريدي ٠٠١" },
    category: "abstract",
    svg: createSvg(`
      <circle cx="35" cy="35" r="25" fill="#f97316" opacity="0.7"/>
      <circle cx="65" cy="65" r="25" fill="#8b5cf6" opacity="0.7"/>
    `),
    tags: ["abstract", "circles", "overlap", "colorful"],
  },
  {
    id: "abstract-002",
    name: { en: "Abstract 002", ar: "تجريدي ٠٠٢" },
    category: "abstract",
    svg: createSvg(`
      <rect x="20" y="20" width="40" height="40" fill="#ec4899" opacity="0.6" transform="rotate(15 40 40)"/>
      <rect x="40" y="40" width="40" height="40" fill="#3b82f6" opacity="0.6" transform="rotate(-15 60 60)"/>
    `),
    tags: ["abstract", "squares", "rotate", "colorful"],
  },
  {
    id: "abstract-003",
    name: { en: "Abstract 003", ar: "تجريدي ٠٠٣" },
    category: "abstract",
    svg: createSvg(`
      <path d="M10 80 Q30 20 50 50 Q70 80 90 30" fill="none" stroke="#10b981" stroke-width="4"/>
      <path d="M10 60 Q40 90 70 40 Q85 10 90 60" fill="none" stroke="#f59e0b" stroke-width="4"/>
    `),
    tags: ["abstract", "waves", "lines", "flowing"],
  },
  {
    id: "blob-1",
    name: { en: "Blob Shape", ar: "شكل فقاعي" },
    category: "abstract",
    svg: createSvg(`
      <path d="M50 10 Q90 20 85 50 Q80 85 50 90 Q15 85 15 50 Q15 15 50 10" fill="#ddd6fe" stroke="#8b5cf6" stroke-width="2"/>
    `),
    tags: ["blob", "organic", "soft", "abstract"],
  },
]

// SOCIAL ICONS - RECTANGLE
export const SOCIAL_RECTANGLE: ElementItem[] = [
  {
    id: "facebook-rectangle",
    name: { en: "Facebook rectangle", ar: "فيسبوك مستطيل" },
    category: "social_rectangle",
    svg: createSvg(`
      <rect x="10" y="20" width="80" height="60" rx="5" fill="#1877f2"/>
      <text x="50" y="58" text-anchor="middle" font-size="28" fill="white" font-weight="bold">f</text>
    `),
    tags: ["facebook", "social", "rectangle", "blue"],
  },
  {
    id: "instagram-rectangle",
    name: { en: "Instagram rectangle", ar: "انستغرام مستطيل" },
    category: "social_rectangle",
    svg: createSvg(`
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#feda75"/>
          <stop offset="25%" style="stop-color:#fa7e1e"/>
          <stop offset="50%" style="stop-color:#d62976"/>
          <stop offset="75%" style="stop-color:#962fbf"/>
          <stop offset="100%" style="stop-color:#4f5bd5"/>
        </linearGradient>
      </defs>
      <rect x="10" y="20" width="80" height="60" rx="5" fill="url(#ig-grad)"/>
      <rect x="30" y="35" width="40" height="30" rx="8" fill="none" stroke="white" stroke-width="3"/>
      <circle cx="50" cy="50" r="8" fill="none" stroke="white" stroke-width="3"/>
      <circle cx="65" cy="38" r="3" fill="white"/>
    `),
    tags: ["instagram", "social", "rectangle", "gradient"],
  },
  {
    id: "pinterest-rectangle",
    name: { en: "Pinterest rectangle", ar: "بينترست مستطيل" },
    category: "social_rectangle",
    svg: createSvg(`
      <rect x="10" y="20" width="80" height="60" rx="5" fill="#e60023"/>
      <text x="50" y="60" text-anchor="middle" font-size="32" fill="white" font-weight="bold">P</text>
    `),
    tags: ["pinterest", "social", "rectangle", "red"],
  },
  {
    id: "twitter-rectangle",
    name: { en: "Twitter/X rectangle", ar: "تويتر/إكس مستطيل" },
    category: "social_rectangle",
    svg: createSvg(`
      <rect x="10" y="20" width="80" height="60" rx="5" fill="#000000"/>
      <text x="50" y="60" text-anchor="middle" font-size="32" fill="white" font-weight="bold">X</text>
    `),
    tags: ["twitter", "x", "social", "rectangle", "black"],
  },
  {
    id: "tiktok-rectangle",
    name: { en: "TikTok rectangle", ar: "تيك توك مستطيل" },
    category: "social_rectangle",
    svg: createSvg(`
      <rect x="10" y="20" width="80" height="60" rx="5" fill="#000000"/>
      <text x="50" y="58" text-anchor="middle" font-size="20" fill="#00f2ea" font-weight="bold">Tik</text>
      <text x="50" y="58" text-anchor="middle" font-size="20" fill="#ff0050" font-weight="bold" dx="1" dy="1">Tik</text>
      <text x="50" y="58" text-anchor="middle" font-size="20" fill="white" font-weight="bold">Tik</text>
    `),
    tags: ["tiktok", "social", "rectangle", "video"],
  },
]

// SOCIAL ICONS - ROUNDED
export const SOCIAL_ROUNDED: ElementItem[] = [
  {
    id: "facebook-rounded",
    name: { en: "Facebook rounded", ar: "فيسبوك دائري" },
    category: "social_rounded",
    svg: createSvg(`
      <circle cx="50" cy="50" r="40" fill="#1877f2"/>
      <text x="50" y="62" text-anchor="middle" font-size="36" fill="white" font-weight="bold">f</text>
    `),
    tags: ["facebook", "social", "rounded", "circle"],
  },
  {
    id: "instagram-rounded",
    name: { en: "Instagram rounded", ar: "انستغرام دائري" },
    category: "social_rounded",
    svg: createSvg(`
      <defs>
        <linearGradient id="ig-grad-round" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#feda75"/>
          <stop offset="25%" style="stop-color:#fa7e1e"/>
          <stop offset="50%" style="stop-color:#d62976"/>
          <stop offset="75%" style="stop-color:#962fbf"/>
          <stop offset="100%" style="stop-color:#4f5bd5"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="40" fill="url(#ig-grad-round)"/>
      <rect x="30" y="30" width="40" height="40" rx="10" fill="none" stroke="white" stroke-width="3"/>
      <circle cx="50" cy="50" r="10" fill="none" stroke="white" stroke-width="3"/>
      <circle cx="65" cy="35" r="3" fill="white"/>
    `),
    tags: ["instagram", "social", "rounded", "circle"],
  },
  {
    id: "pinterest-rounded",
    name: { en: "Pinterest rounded", ar: "بينترست دائري" },
    category: "social_rounded",
    svg: createSvg(`
      <circle cx="50" cy="50" r="40" fill="#e60023"/>
      <text x="50" y="64" text-anchor="middle" font-size="40" fill="white" font-weight="bold">P</text>
    `),
    tags: ["pinterest", "social", "rounded", "circle"],
  },
  {
    id: "twitter-rounded",
    name: { en: "Twitter/X rounded", ar: "تويتر/إكس دائري" },
    category: "social_rounded",
    svg: createSvg(`
      <circle cx="50" cy="50" r="40" fill="#000000"/>
      <text x="50" y="64" text-anchor="middle" font-size="40" fill="white" font-weight="bold">X</text>
    `),
    tags: ["twitter", "x", "social", "rounded", "circle"],
  },
  {
    id: "youtube-rounded",
    name: { en: "YouTube rounded", ar: "يوتيوب دائري" },
    category: "social_rounded",
    svg: createSvg(`
      <circle cx="50" cy="50" r="40" fill="#ff0000"/>
      <polygon points="40,35 40,65 65,50" fill="white"/>
    `),
    tags: ["youtube", "social", "rounded", "video"],
  },
]

// SYMBOLS
export const SYMBOLS: ElementItem[] = [
  {
    id: "heart-01",
    name: { en: "Heart 01", ar: "قلب ٠١" },
    category: "symbols",
    svg: createSvg(`
      <path d="M50 85 C20 55 20 25 50 35 C80 25 80 55 50 85" fill="#ef4444"/>
    `),
    tags: ["heart", "love", "symbol", "red"],
  },
  {
    id: "heart-02",
    name: { en: "Heart 02", ar: "قلب ٠٢" },
    category: "symbols",
    svg: createSvg(`
      <path d="M50 85 C20 55 20 25 50 35 C80 25 80 55 50 85" fill="none" stroke="#ef4444" stroke-width="4"/>
    `),
    tags: ["heart", "love", "symbol", "outline"],
  },
  {
    id: "star-filled",
    name: { en: "Star Filled", ar: "نجمة ممتلئة" },
    category: "symbols",
    svg: createSvg(`
      <polygon points="50,5 61,40 98,40 68,62 79,97 50,75 21,97 32,62 2,40 39,40" fill="#fbbf24"/>
    `),
    tags: ["star", "rating", "symbol", "gold"],
  },
  {
    id: "checkmark",
    name: { en: "Checkmark", ar: "علامة صح" },
    category: "symbols",
    svg: createSvg(`
      <circle cx="50" cy="50" r="40" fill="#22c55e"/>
      <path d="M30 50 L45 65 L70 35" fill="none" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    `),
    tags: ["check", "verified", "approved", "green"],
  },
  {
    id: "love-badge",
    name: { en: "Love me", ar: "أحبني" },
    category: "symbols",
    svg: createSvg(`
      <circle cx="50" cy="50" r="40" fill="#fecdd3" stroke="#f43f5e" stroke-width="2"/>
      <path d="M50 70 C30 50 30 30 50 38 C70 30 70 50 50 70" fill="#f43f5e"/>
      <text x="50" y="88" text-anchor="middle" font-size="8" fill="#f43f5e">LOVE ME</text>
    `),
    tags: ["love", "heart", "badge", "pink"],
  },
  {
    id: "love-doodle",
    name: { en: "Love doodle", ar: "رسمة حب" },
    category: "symbols",
    svg: createSvg(`
      <path d="M30 50 C30 30 50 20 50 40 C50 20 70 30 70 50 C70 70 50 85 50 85 C50 85 30 70 30 50" fill="none" stroke="#f43f5e" stroke-width="3"/>
    `),
    tags: ["love", "doodle", "heart", "hand-drawn"],
  },
]

// Combine all elements
export const ALL_ELEMENTS: ElementItem[] = [
  ...ECO_SYMBOLS,
  ...ECO_PROPERTIES,
  ...LOGISTICS_ICONS,
  ...GEOMETRIC_SHAPES,
  ...ABSTRACT_SHAPES,
  ...SOCIAL_RECTANGLE,
  ...SOCIAL_ROUNDED,
  ...SYMBOLS,
]

// Get elements by category
export function getElementsByCategory(categoryId: string): ElementItem[] {
  return ALL_ELEMENTS.filter(e => e.category === categoryId)
}

// Search elements
export function searchElements(query: string): ElementItem[] {
  const lowerQuery = query.toLowerCase()
  return ALL_ELEMENTS.filter(e => 
    e.name.en.toLowerCase().includes(lowerQuery) ||
    e.name.ar.includes(query) ||
    e.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  )
}
