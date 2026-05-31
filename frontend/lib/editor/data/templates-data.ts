"use client"

import { Layer } from "../state/types"

export interface TemplateCategory {
  id: string
  name: { en: string; ar: string }
  icon: string
}

export interface Template {
  id: string
  name: { en: string; ar: string }
  category: string
  description: { en: string; ar: string }
  thumbnail: string
  tags: string[]
  style: string
  layers: Partial<Layer>[]
}

// Template categories based on Packhelp
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: "all", name: { en: "All", ar: "الكل" }, icon: "📦" },
  { id: "no_template", name: { en: "No template", ar: "بدون قالب" }, icon: "⬜" },
  { id: "christmas", name: { en: "Christmas", ar: "الكريسماس" }, icon: "🎄" },
  { id: "eco", name: { en: "Eco-friendly", ar: "صديق للبيئة" }, icon: "🌱" },
  { id: "valentine", name: { en: "Valentine's", ar: "عيد الحب" }, icon: "❤️" },
  { id: "floral", name: { en: "Floral", ar: "زهور" }, icon: "🌸" },
  { id: "abstract", name: { en: "Abstract", ar: "تجريدي" }, icon: "🎨" },
  { id: "doodle", name: { en: "Doodle", ar: "رسومات" }, icon: "✏️" },
  { id: "minimal", name: { en: "Minimal", ar: "بسيط" }, icon: "◽" },
  { id: "luxury", name: { en: "Luxury", ar: "فاخر" }, icon: "✨" },
  { id: "food", name: { en: "Food & Beverage", ar: "طعام ومشروبات" }, icon: "☕" },
  { id: "patterns", name: { en: "Patterns", ar: "أنماط" }, icon: "🔷" },
]

// Generate SVG thumbnails for templates
function generateSvgThumbnail(bgColor: string, elements: string): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'%3E%3Crect fill='${encodeURIComponent(bgColor)}' width='200' height='150'/%3E${encodeURIComponent(elements)}%3C/svg%3E`
}

// All templates
export const TEMPLATES: Template[] = [
  // ===== CHRISTMAS TEMPLATES =====
  {
    id: "christmas-botanical",
    name: { en: "Christmas botanical", ar: "نباتات الكريسماس" },
    category: "christmas",
    description: { en: "Elegant botanical Christmas design", ar: "تصميم نباتي أنيق للكريسماس" },
    thumbnail: generateSvgThumbnail("#1a472a", "<circle cx='100' cy='75' r='40' fill='%2322c55e' opacity='0.3'/><path d='M80 90 L100 50 L120 90 Z' fill='%2316a34a'/><rect x='95' y='90' width='10' height='15' fill='%238b4513'/>"),
    tags: ["christmas", "botanical", "green", "elegant"],
    style: "botanical",
    layers: [
      {
        type: "text",
        name: "Merry Christmas",
        textProperties: {
          content: "Merry Christmas",
          fontFamily: "Playfair Display",
          fontSize: 28,
          fontWeight: 400,
          align: "center",
          color: "#ffffff",
          lineHeight: 1.2,
          letterSpacing: 2,
        },
        position: { x: 400, y: 200 },
      },
    ],
  },
  {
    id: "christmas-branches",
    name: { en: "Christmas branches", ar: "أغصان الكريسماس" },
    category: "christmas",
    description: { en: "Pine branches pattern", ar: "نمط أغصان الصنوبر" },
    thumbnail: generateSvgThumbnail("#0f4c3a", "<path d='M20 130 L50 80 L30 85 L60 40 L40 45 L70 10' stroke='%234ade80' fill='none' stroke-width='3'/><path d='M180 130 L150 80 L170 85 L140 40 L160 45 L130 10' stroke='%234ade80' fill='none' stroke-width='3'/>"),
    tags: ["christmas", "branches", "pine", "winter"],
    style: "nature",
    layers: [
      {
        type: "text",
        name: "Happy Holidays",
        textProperties: {
          content: "Happy Holidays",
          fontFamily: "Georgia",
          fontSize: 32,
          fontWeight: 700,
          align: "center",
          color: "#ffffff",
          lineHeight: 1.2,
          letterSpacing: 1,
        },
        position: { x: 400, y: 150 },
      },
    ],
  },
  {
    id: "christmas-cutout",
    name: { en: "Christmas cutout", ar: "قصاصات الكريسماس" },
    category: "christmas",
    description: { en: "Paper cutout style design", ar: "تصميم بأسلوب القصاصات" },
    thumbnail: generateSvgThumbnail("#dc2626", "<rect x='60' y='40' width='80' height='80' fill='%23fef2f2' rx='5'/><circle cx='100' cy='80' r='25' fill='%23b91c1c'/>"),
    tags: ["christmas", "cutout", "red", "festive"],
    style: "cutout",
    layers: [],
  },
  {
    id: "christmas-gifts",
    name: { en: "Christmas gifts", ar: "هدايا الكريسماس" },
    category: "christmas",
    description: { en: "Gift boxes pattern", ar: "نمط صناديق الهدايا" },
    thumbnail: generateSvgThumbnail("#fef3c7", "<rect x='30' y='70' width='40' height='40' fill='%23dc2626'/><rect x='130' y='50' width='50' height='60' fill='%2316a34a'/><rect x='70' y='90' width='30' height='30' fill='%23eab308'/>"),
    tags: ["christmas", "gifts", "presents", "colorful"],
    style: "festive",
    layers: [],
  },
  {
    id: "christmas-leaves",
    name: { en: "Christmas leaves", ar: "أوراق الكريسماس" },
    category: "christmas",
    description: { en: "Holly leaves pattern", ar: "نمط أوراق الهولي" },
    thumbnail: generateSvgThumbnail("#166534", "<ellipse cx='80' cy='70' rx='20' ry='10' fill='%2322c55e' transform='rotate(-30 80 70)'/><ellipse cx='120' cy='80' rx='20' ry='10' fill='%2322c55e' transform='rotate(30 120 80)'/><circle cx='100' cy='75' r='5' fill='%23dc2626'/>"),
    tags: ["christmas", "leaves", "holly", "green"],
    style: "botanical",
    layers: [],
  },
  {
    id: "christmas-ornament",
    name: { en: "Christmas ornament I", ar: "زينة الكريسماس" },
    category: "christmas",
    description: { en: "Elegant ornament design", ar: "تصميم زينة أنيقة" },
    thumbnail: generateSvgThumbnail("#1e3a5f", "<circle cx='100' cy='80' r='35' fill='%23ef4444'/><rect x='95' y='40' width='10' height='15' fill='%23fbbf24'/><line x1='100' y1='30' x2='100' y2='45' stroke='%23fbbf24' stroke-width='2'/>"),
    tags: ["christmas", "ornament", "elegant", "classic"],
    style: "classic",
    layers: [],
  },
  {
    id: "christmas-tree",
    name: { en: "Christmas tree", ar: "شجرة الكريسماس" },
    category: "christmas",
    description: { en: "Classic Christmas tree", ar: "شجرة كريسماس كلاسيكية" },
    thumbnail: generateSvgThumbnail("#ffffff", "<path d='M100 20 L140 100 L125 100 L155 130 L45 130 L75 100 L60 100 Z' fill='%2316a34a'/><rect x='90' y='130' width='20' height='15' fill='%238b4513'/><circle cx='100' cy='60' r='5' fill='%23fbbf24'/>"),
    tags: ["christmas", "tree", "classic", "green"],
    style: "classic",
    layers: [],
  },
  {
    id: "christmas-wreath",
    name: { en: "Christmas wreath", ar: "إكليل الكريسماس" },
    category: "christmas",
    description: { en: "Festive wreath design", ar: "تصميم إكليل احتفالي" },
    thumbnail: generateSvgThumbnail("#fef7ed", "<circle cx='100' cy='75' r='40' fill='none' stroke='%2316a34a' stroke-width='15'/><circle cx='100' cy='35' r='8' fill='%23dc2626'/>"),
    tags: ["christmas", "wreath", "festive", "elegant"],
    style: "elegant",
    layers: [],
  },
  {
    id: "ho-ho-ho",
    name: { en: "Ho! Ho! Ho!", ar: "هو هو هو!" },
    category: "christmas",
    description: { en: "Fun Santa theme", ar: "موضوع سانتا مرح" },
    thumbnail: generateSvgThumbnail("#dc2626", "<text x='100' y='85' font-size='24' fill='white' text-anchor='middle' font-family='sans-serif' font-weight='bold'>HO HO HO</text>"),
    tags: ["christmas", "santa", "fun", "red"],
    style: "fun",
    layers: [
      {
        type: "text",
        name: "Ho Ho Ho",
        textProperties: {
          content: "HO! HO! HO!",
          fontFamily: "Oswald",
          fontSize: 48,
          fontWeight: 700,
          align: "center",
          color: "#ffffff",
          lineHeight: 1,
          letterSpacing: 4,
        },
        position: { x: 400, y: 150 },
      },
    ],
  },
  {
    id: "snowman",
    name: { en: "Snowman", ar: "رجل الثلج" },
    category: "christmas",
    description: { en: "Cute snowman design", ar: "تصميم رجل ثلج لطيف" },
    thumbnail: generateSvgThumbnail("#e0f2fe", "<circle cx='100' cy='100' r='30' fill='white'/><circle cx='100' cy='60' r='20' fill='white'/><circle cx='95' cy='55' r='3' fill='black'/><circle cx='105' cy='55' r='3' fill='black'/><path d='M98 65 L100 70 L102 65' fill='%23f97316'/>"),
    tags: ["christmas", "snowman", "winter", "cute"],
    style: "cute",
    layers: [],
  },
  {
    id: "winter-forest",
    name: { en: "Winter forest", ar: "غابة الشتاء" },
    category: "christmas",
    description: { en: "Snowy forest scene", ar: "مشهد غابة ثلجية" },
    thumbnail: generateSvgThumbnail("#1e3a5f", "<path d='M30 130 L50 80 L70 130' fill='%23166534'/><path d='M80 130 L110 60 L140 130' fill='%2315803d'/><path d='M150 130 L170 90 L190 130' fill='%23166534'/><rect y='125' width='200' height='25' fill='white'/>"),
    tags: ["christmas", "winter", "forest", "snow"],
    style: "scenic",
    layers: [],
  },

  // ===== ECO-FRIENDLY TEMPLATES =====
  {
    id: "eco-sustainable",
    name: { en: "We use sustainable packaging I", ar: "نستخدم تغليف مستدام" },
    category: "eco",
    description: { en: "Sustainability badge design", ar: "تصميم شارة الاستدامة" },
    thumbnail: generateSvgThumbnail("#ecfdf5", "<circle cx='100' cy='75' r='40' fill='%2322c55e' opacity='0.2'/><path d='M85 75 Q100 55 115 75 Q100 95 85 75' fill='%2316a34a'/><rect x='98' y='75' width='4' height='20' fill='%2316a34a'/>"),
    tags: ["eco", "sustainable", "green", "nature"],
    style: "eco",
    layers: [
      {
        type: "text",
        name: "Eco Text",
        textProperties: {
          content: "We use sustainable packaging",
          fontFamily: "Inter",
          fontSize: 16,
          fontWeight: 500,
          align: "center",
          color: "#166534",
          lineHeight: 1.4,
          letterSpacing: 0,
        },
        position: { x: 400, y: 220 },
      },
    ],
  },
  {
    id: "sustainable-black",
    name: { en: "SUSTAINABLE is a new black", ar: "المستدام هو الأسود الجديد" },
    category: "eco",
    description: { en: "Bold sustainability statement", ar: "بيان استدامة جريء" },
    thumbnail: generateSvgThumbnail("#000000", "<text x='100' y='80' font-size='14' fill='white' text-anchor='middle' font-family='sans-serif' font-weight='bold'>SUSTAINABLE</text><text x='100' y='100' font-size='10' fill='%2322c55e' text-anchor='middle'>is the new black</text>"),
    tags: ["eco", "sustainable", "black", "bold"],
    style: "bold",
    layers: [
      {
        type: "text",
        name: "Sustainable",
        textProperties: {
          content: "SUSTAINABLE",
          fontFamily: "Oswald",
          fontSize: 36,
          fontWeight: 700,
          align: "center",
          color: "#ffffff",
          lineHeight: 1,
          letterSpacing: 4,
        },
        position: { x: 400, y: 130 },
      },
      {
        type: "text",
        name: "Subtitle",
        textProperties: {
          content: "is the new black",
          fontFamily: "Inter",
          fontSize: 14,
          fontWeight: 400,
          align: "center",
          color: "#22c55e",
          lineHeight: 1.5,
          letterSpacing: 2,
        },
        position: { x: 400, y: 180 },
      },
    ],
  },
  {
    id: "eco-future",
    name: { en: "The future is in your hands", ar: "المستقبل في يديك" },
    category: "eco",
    description: { en: "Inspirational eco message", ar: "رسالة بيئية ملهمة" },
    thumbnail: generateSvgThumbnail("#f0fdf4", "<circle cx='100' cy='70' r='30' fill='%2386efac'/><path d='M90 70 L100 55 L110 70 M100 55 L100 85' stroke='%2316a34a' fill='none' stroke-width='3'/>"),
    tags: ["eco", "future", "inspirational", "green"],
    style: "inspirational",
    layers: [],
  },
  {
    id: "eco-recycle",
    name: { en: "please, recycle me", ar: "من فضلك، أعد تدويري" },
    category: "eco",
    description: { en: "Recycling reminder", ar: "تذكير بإعادة التدوير" },
    thumbnail: generateSvgThumbnail("#dcfce7", "<path d='M80 60 L100 40 L120 60 M100 40 L100 90 M80 90 L120 90' stroke='%2316a34a' fill='none' stroke-width='4' stroke-linecap='round'/>"),
    tags: ["eco", "recycle", "green", "reminder"],
    style: "minimal",
    layers: [
      {
        type: "text",
        name: "Recycle",
        textProperties: {
          content: "please, recycle me",
          fontFamily: "Inter",
          fontSize: 18,
          fontWeight: 400,
          align: "center",
          color: "#166534",
          lineHeight: 1.4,
          letterSpacing: 1,
        },
        position: { x: 400, y: 200 },
      },
    ],
  },

  // ===== VALENTINE'S TEMPLATES =====
  {
    id: "love-cutout",
    name: { en: "Love cutout", ar: "قصاصات حب" },
    category: "valentine",
    description: { en: "Paper cutout hearts", ar: "قلوب قصاصات ورقية" },
    thumbnail: generateSvgThumbnail("#fdf2f8", "<path d='M100 90 C80 70 60 80 60 95 C60 115 100 130 100 130 C100 130 140 115 140 95 C140 80 120 70 100 90' fill='%23ec4899'/>"),
    tags: ["valentine", "love", "hearts", "pink"],
    style: "romantic",
    layers: [],
  },
  {
    id: "doodle-hearts",
    name: { en: "Doodle hearts", ar: "قلوب مرسومة" },
    category: "valentine",
    description: { en: "Hand-drawn heart doodles", ar: "رسومات قلوب يدوية" },
    thumbnail: generateSvgThumbnail("#fff1f2", "<path d='M50 70 C40 60 30 70 30 80 C30 95 50 105 50 105 C50 105 70 95 70 80 C70 70 60 60 50 70' fill='none' stroke='%23f43f5e' stroke-width='2'/><path d='M130 50 C120 40 110 50 110 60 C110 75 130 85 130 85 C130 85 150 75 150 60 C150 50 140 40 130 50' fill='none' stroke='%23f43f5e' stroke-width='2'/>"),
    tags: ["valentine", "hearts", "doodle", "hand-drawn"],
    style: "doodle",
    layers: [],
  },
  {
    id: "floral-love",
    name: { en: "Floral love", ar: "حب زهري" },
    category: "valentine",
    description: { en: "Romantic floral design", ar: "تصميم زهري رومانسي" },
    thumbnail: generateSvgThumbnail("#fce7f3", "<circle cx='80' cy='60' r='15' fill='%23f9a8d4'/><circle cx='120' cy='80' r='12' fill='%23fbcfe8'/><circle cx='70' cy='100' r='10' fill='%23f472b6'/>"),
    tags: ["valentine", "floral", "romantic", "pink"],
    style: "floral",
    layers: [],
  },
  {
    id: "valentine-doodle",
    name: { en: "Valentine's doodle", ar: "رسومات عيد الحب" },
    category: "valentine",
    description: { en: "Cute Valentine doodles", ar: "رسومات عيد حب لطيفة" },
    thumbnail: generateSvgThumbnail("#ffffff", "<path d='M60 80 Q70 60 80 80 Q70 100 60 80' fill='%23f43f5e'/><text x='110' y='85' font-size='20' fill='%23f43f5e'>♥</text><circle cx='150' cy='70' r='15' fill='none' stroke='%23f43f5e' stroke-width='2'/>"),
    tags: ["valentine", "doodle", "cute", "love"],
    style: "doodle",
    layers: [],
  },

  // ===== FLORAL TEMPLATES =====
  {
    id: "meadow-flowers",
    name: { en: "Meadow flowers", ar: "زهور المرج" },
    category: "floral",
    description: { en: "Wild meadow flowers", ar: "زهور المرج البرية" },
    thumbnail: generateSvgThumbnail("#fefce8", "<circle cx='50' cy='100' r='8' fill='%23fbbf24'/><circle cx='80' cy='80' r='10' fill='%23f97316'/><circle cx='120' cy='90' r='7' fill='%23ec4899'/><circle cx='150' cy='70' r='9' fill='%23a855f7'/><path d='M50 100 L50 130 M80 80 L80 130 M120 90 L120 130 M150 70 L150 130' stroke='%2322c55e' stroke-width='2'/>"),
    tags: ["floral", "meadow", "wildflowers", "colorful"],
    style: "nature",
    layers: [],
  },
  {
    id: "botanical-i",
    name: { en: "Botanical I", ar: "نباتي ١" },
    category: "floral",
    description: { en: "Elegant botanical illustration", ar: "رسم نباتي أنيق" },
    thumbnail: generateSvgThumbnail("#f0fdf4", "<path d='M100 130 L100 50 M80 80 Q90 70 100 80 M100 80 Q110 70 120 80 M70 100 Q85 90 100 100 M100 100 Q115 90 130 100' stroke='%2316a34a' fill='none' stroke-width='2'/>"),
    tags: ["floral", "botanical", "elegant", "green"],
    style: "botanical",
    layers: [],
  },
  {
    id: "wild-roses",
    name: { en: "Wild roses", ar: "ورود برية" },
    category: "floral",
    description: { en: "Beautiful wild roses", ar: "ورود برية جميلة" },
    thumbnail: generateSvgThumbnail("#fff1f2", "<circle cx='100' cy='75' r='25' fill='%23fda4af'/><circle cx='100' cy='75' r='8' fill='%23fecdd3'/><circle cx='60' cy='100' r='15' fill='%23fb7185'/><circle cx='140' cy='90' r='18' fill='%23f43f5e'/>"),
    tags: ["floral", "roses", "romantic", "pink"],
    style: "romantic",
    layers: [],
  },
  {
    id: "leaves-i",
    name: { en: "Leaves I", ar: "أوراق ١" },
    category: "floral",
    description: { en: "Simple leaf pattern", ar: "نمط أوراق بسيط" },
    thumbnail: generateSvgThumbnail("#ecfdf5", "<ellipse cx='60' cy='70' rx='25' ry='12' fill='%2322c55e' transform='rotate(-30 60 70)'/><ellipse cx='140' cy='80' rx='25' ry='12' fill='%2316a34a' transform='rotate(30 140 80)'/><ellipse cx='100' cy='100' rx='20' ry='10' fill='%234ade80' transform='rotate(-15 100 100)'/>"),
    tags: ["floral", "leaves", "green", "simple"],
    style: "minimal",
    layers: [],
  },

  // ===== ABSTRACT TEMPLATES =====
  {
    id: "abstract-shapes",
    name: { en: "Abstract shapes III", ar: "أشكال تجريدية ٣" },
    category: "abstract",
    description: { en: "Modern abstract shapes", ar: "أشكال تجريدية حديثة" },
    thumbnail: generateSvgThumbnail("#fef3c7", "<circle cx='60' cy='60' r='30' fill='%23f97316' opacity='0.7'/><rect x='100' y='40' width='50' height='50' fill='%23ec4899' opacity='0.6'/><path d='M80 100 L130 100 L105 140 Z' fill='%238b5cf6' opacity='0.5'/>"),
    tags: ["abstract", "shapes", "modern", "colorful"],
    style: "modern",
    layers: [],
  },
  {
    id: "abstract-liquid",
    name: { en: "Abstract liquid", ar: "سائل تجريدي" },
    category: "abstract",
    description: { en: "Fluid organic shapes", ar: "أشكال عضوية سائلة" },
    thumbnail: generateSvgThumbnail("#fdf4ff", "<path d='M40 80 Q60 40 100 70 Q140 100 160 60' fill='%23d946ef' opacity='0.4'/><path d='M30 100 Q70 130 110 90 Q150 50 180 100' fill='%23a855f7' opacity='0.3'/>"),
    tags: ["abstract", "liquid", "fluid", "organic"],
    style: "organic",
    layers: [],
  },
  {
    id: "abstract-waves",
    name: { en: "Abstract waves I", ar: "موجات تجريدية" },
    category: "abstract",
    description: { en: "Flowing wave pattern", ar: "نمط موجات متدفق" },
    thumbnail: generateSvgThumbnail("#eff6ff", "<path d='M0 80 Q50 60 100 80 Q150 100 200 80' fill='none' stroke='%233b82f6' stroke-width='4'/><path d='M0 100 Q50 80 100 100 Q150 120 200 100' fill='none' stroke='%2360a5fa' stroke-width='3'/><path d='M0 120 Q50 100 100 120 Q150 140 200 120' fill='none' stroke='%2393c5fd' stroke-width='2'/>"),
    tags: ["abstract", "waves", "blue", "flowing"],
    style: "flowing",
    layers: [],
  },
  {
    id: "geometric-i",
    name: { en: "Geometric I", ar: "هندسي ١" },
    category: "abstract",
    description: { en: "Clean geometric pattern", ar: "نمط هندسي نظيف" },
    thumbnail: generateSvgThumbnail("#f8fafc", "<rect x='30' y='30' width='40' height='40' fill='none' stroke='%231e293b' stroke-width='2'/><circle cx='130' cy='50' r='25' fill='none' stroke='%231e293b' stroke-width='2'/><path d='M70 100 L100 60 L130 100 Z' fill='none' stroke='%231e293b' stroke-width='2'/>"),
    tags: ["abstract", "geometric", "minimal", "clean"],
    style: "geometric",
    layers: [],
  },

  // ===== MINIMAL TEMPLATES =====
  {
    id: "modern-minimal",
    name: { en: "Modern Minimal", ar: "عصري بسيط" },
    category: "minimal",
    description: { en: "Clean modern design", ar: "تصميم حديث نظيف" },
    thumbnail: generateSvgThumbnail("#f8fafc", "<rect x='40' y='50' width='120' height='8' fill='%23334155' rx='2'/><rect x='60' y='70' width='80' height='4' fill='%2394a3b8' rx='1'/><rect x='70' y='90' width='60' height='30' fill='%23e2e8f0' rx='4'/>"),
    tags: ["minimal", "modern", "clean", "professional"],
    style: "modern",
    layers: [
      {
        type: "text",
        name: "Brand Name",
        textProperties: {
          content: "BRAND",
          fontFamily: "Inter",
          fontSize: 48,
          fontWeight: 700,
          align: "center",
          color: "#1e293b",
          lineHeight: 1.2,
          letterSpacing: 4,
        },
        position: { x: 400, y: 150 },
      },
    ],
  },
  {
    id: "simple-ribbon",
    name: { en: "Simple ribbon", ar: "شريط بسيط" },
    category: "minimal",
    description: { en: "Clean ribbon accent", ar: "لمسة شريط نظيفة" },
    thumbnail: generateSvgThumbnail("#ffffff", "<rect x='0' y='65' width='200' height='20' fill='%23334155'/>"),
    tags: ["minimal", "ribbon", "simple", "clean"],
    style: "minimal",
    layers: [],
  },
  {
    id: "simple-wreath",
    name: { en: "Simple wreath", ar: "إكليل بسيط" },
    category: "minimal",
    description: { en: "Minimalist wreath design", ar: "تصميم إكليل بسيط" },
    thumbnail: generateSvgThumbnail("#ffffff", "<circle cx='100' cy='75' r='35' fill='none' stroke='%23334155' stroke-width='1.5'/>"),
    tags: ["minimal", "wreath", "simple", "elegant"],
    style: "minimal",
    layers: [],
  },

  // ===== LUXURY TEMPLATES =====
  {
    id: "luxury-gold",
    name: { en: "Luxury gold", ar: "ذهبي فاخر" },
    category: "luxury",
    description: { en: "Elegant gold accent design", ar: "تصميم أنيق بلمسات ذهبية" },
    thumbnail: generateSvgThumbnail("#1e1e1e", "<rect x='30' y='30' width='140' height='90' fill='none' stroke='%23d4af37' stroke-width='2'/><rect x='60' y='60' width='80' height='6' fill='%23d4af37' rx='1'/><rect x='70' y='80' width='60' height='3' fill='%23a08029' rx='1'/>"),
    tags: ["luxury", "gold", "elegant", "premium"],
    style: "luxury",
    layers: [
      {
        type: "text",
        name: "Luxury Name",
        textProperties: {
          content: "PRESTIGE",
          fontFamily: "Playfair Display",
          fontSize: 42,
          fontWeight: 400,
          align: "center",
          color: "#d4af37",
          lineHeight: 1.2,
          letterSpacing: 8,
        },
        position: { x: 400, y: 150 },
      },
    ],
  },
  {
    id: "art-deco",
    name: { en: "Art deco", ar: "آرت ديكو" },
    category: "luxury",
    description: { en: "Classic art deco style", ar: "أسلوب آرت ديكو الكلاسيكي" },
    thumbnail: generateSvgThumbnail("#0f172a", "<path d='M100 20 L120 50 L100 80 L80 50 Z' fill='none' stroke='%23d4af37' stroke-width='2'/><line x1='40' y1='100' x2='160' y2='100' stroke='%23d4af37' stroke-width='2'/><line x1='60' y1='110' x2='140' y2='110' stroke='%23d4af37' stroke-width='1'/>"),
    tags: ["luxury", "art-deco", "classic", "gold"],
    style: "classic",
    layers: [],
  },
  {
    id: "elegant-frame",
    name: { en: "Elegant frame", ar: "إطار أنيق" },
    category: "luxury",
    description: { en: "Sophisticated frame design", ar: "تصميم إطار راقٍ" },
    thumbnail: generateSvgThumbnail("#fefce8", "<rect x='25' y='25' width='150' height='100' fill='none' stroke='%23a16207' stroke-width='3'/><rect x='35' y='35' width='130' height='80' fill='none' stroke='%23ca8a04' stroke-width='1'/>"),
    tags: ["luxury", "frame", "elegant", "classic"],
    style: "elegant",
    layers: [],
  },

  // ===== FOOD & BEVERAGE TEMPLATES =====
  {
    id: "coffee-shop",
    name: { en: "Freshly brewed coffee", ar: "قهوة طازجة" },
    category: "food",
    description: { en: "Coffee shop branding", ar: "هوية المقهى" },
    thumbnail: generateSvgThumbnail("#fef3c7", "<rect x='75' y='50' width='50' height='60' fill='%23451a03' rx='3'/><rect x='70' y='45' width='60' height='10' fill='%2378350f' rx='2'/><path d='M125 70 Q140 70 140 85 Q140 100 125 100' fill='none' stroke='%23451a03' stroke-width='3'/>"),
    tags: ["food", "coffee", "cafe", "warm"],
    style: "warm",
    layers: [
      {
        type: "text",
        name: "Coffee Brand",
        textProperties: {
          content: "COFFEE CO.",
          fontFamily: "Merriweather",
          fontSize: 32,
          fontWeight: 700,
          align: "center",
          color: "#451a03",
          lineHeight: 1.3,
          letterSpacing: 2,
        },
        position: { x: 400, y: 180 },
      },
    ],
  },
  {
    id: "take-a-bite",
    name: { en: "Take a bite", ar: "خذ قضمة" },
    category: "food",
    description: { en: "Fun food design", ar: "تصميم طعام ممتع" },
    thumbnail: generateSvgThumbnail("#fef2f2", "<circle cx='100' cy='75' r='40' fill='%23fca5a5'/><path d='M80 60 Q100 40 120 60' fill='%23fef2f2'/>"),
    tags: ["food", "fun", "playful", "bite"],
    style: "playful",
    layers: [],
  },
  {
    id: "veggie",
    name: { en: "Veggie", ar: "خضروات" },
    category: "food",
    description: { en: "Fresh vegetable theme", ar: "موضوع الخضروات الطازجة" },
    thumbnail: generateSvgThumbnail("#f0fdf4", "<ellipse cx='60' cy='80' rx='20' ry='30' fill='%2322c55e'/><circle cx='100' cy='70' r='25' fill='%23ef4444'/><ellipse cx='140' cy='85' rx='15' ry='25' fill='%23f97316'/>"),
    tags: ["food", "veggie", "healthy", "fresh"],
    style: "fresh",
    layers: [],
  },

  // ===== DOODLE TEMPLATES =====
  {
    id: "cute-doodle",
    name: { en: "Cute doodle", ar: "رسومات لطيفة" },
    category: "doodle",
    description: { en: "Playful hand-drawn style", ar: "أسلوب مرسوم يدوياً مرح" },
    thumbnail: generateSvgThumbnail("#fffbeb", "<circle cx='50' cy='60' r='15' fill='none' stroke='%23f59e0b' stroke-width='2'/><rect x='90' y='50' width='30' height='30' fill='none' stroke='%23f59e0b' stroke-width='2'/><path d='M140 80 L155 50 L170 80 Z' fill='none' stroke='%23f59e0b' stroke-width='2'/>"),
    tags: ["doodle", "cute", "hand-drawn", "playful"],
    style: "playful",
    layers: [],
  },
  {
    id: "doodle-monsters",
    name: { en: "Doodle monsters", ar: "وحوش مرسومة" },
    category: "doodle",
    description: { en: "Fun monster doodles", ar: "رسومات وحوش ممتعة" },
    thumbnail: generateSvgThumbnail("#faf5ff", "<circle cx='60' cy='70' r='25' fill='%23a855f7'/><circle cx='55' cy='65' r='5' fill='white'/><circle cx='70' cy='65' r='5' fill='white'/><circle cx='140' cy='80' r='20' fill='%23ec4899'/><circle cx='140' cy='75' r='8' fill='white'/>"),
    tags: ["doodle", "monsters", "fun", "colorful"],
    style: "fun",
    layers: [],
  },

  // ===== PATTERN TEMPLATES =====
  {
    id: "dots",
    name: { en: "Dots", ar: "نقاط" },
    category: "patterns",
    description: { en: "Simple dot pattern", ar: "نمط نقاط بسيط" },
    thumbnail: generateSvgThumbnail("#ffffff", "<circle cx='30' cy='30' r='5' fill='%23334155'/><circle cx='70' cy='30' r='5' fill='%23334155'/><circle cx='110' cy='30' r='5' fill='%23334155'/><circle cx='150' cy='30' r='5' fill='%23334155'/><circle cx='50' cy='70' r='5' fill='%23334155'/><circle cx='90' cy='70' r='5' fill='%23334155'/><circle cx='130' cy='70' r='5' fill='%23334155'/><circle cx='170' cy='70' r='5' fill='%23334155'/><circle cx='30' cy='110' r='5' fill='%23334155'/><circle cx='70' cy='110' r='5' fill='%23334155'/><circle cx='110' cy='110' r='5' fill='%23334155'/><circle cx='150' cy='110' r='5' fill='%23334155'/>"),
    tags: ["pattern", "dots", "simple", "minimal"],
    style: "minimal",
    layers: [],
  },
  {
    id: "wavy-lines",
    name: { en: "Wavy lines", ar: "خطوط متموجة" },
    category: "patterns",
    description: { en: "Flowing wavy lines", ar: "خطوط متموجة متدفقة" },
    thumbnail: generateSvgThumbnail("#f0f9ff", "<path d='M0 40 Q25 30 50 40 Q75 50 100 40 Q125 30 150 40 Q175 50 200 40' fill='none' stroke='%230ea5e9' stroke-width='2'/><path d='M0 75 Q25 65 50 75 Q75 85 100 75 Q125 65 150 75 Q175 85 200 75' fill='none' stroke='%230ea5e9' stroke-width='2'/><path d='M0 110 Q25 100 50 110 Q75 120 100 110 Q125 100 150 110 Q175 120 200 110' fill='none' stroke='%230ea5e9' stroke-width='2'/>"),
    tags: ["pattern", "waves", "lines", "flowing"],
    style: "flowing",
    layers: [],
  },
  {
    id: "dashed-lines",
    name: { en: "Dashed lines", ar: "خطوط متقطعة" },
    category: "patterns",
    description: { en: "Clean dashed line pattern", ar: "نمط خطوط متقطعة نظيف" },
    thumbnail: generateSvgThumbnail("#ffffff", "<line x1='20' y1='40' x2='180' y2='40' stroke='%23cbd5e1' stroke-width='2' stroke-dasharray='10,5'/><line x1='20' y1='75' x2='180' y2='75' stroke='%23cbd5e1' stroke-width='2' stroke-dasharray='10,5'/><line x1='20' y1='110' x2='180' y2='110' stroke='%23cbd5e1' stroke-width='2' stroke-dasharray='10,5'/>"),
    tags: ["pattern", "lines", "dashed", "clean"],
    style: "minimal",
    layers: [],
  },
]

// Get templates by category
export function getTemplatesByCategory(categoryId: string): Template[] {
  if (categoryId === "all") return TEMPLATES
  if (categoryId === "no_template") return []
  return TEMPLATES.filter(t => t.category === categoryId)
}

// Search templates
export function searchTemplates(query: string): Template[] {
  const lowerQuery = query.toLowerCase()
  return TEMPLATES.filter(t => 
    t.name.en.toLowerCase().includes(lowerQuery) ||
    t.name.ar.includes(query) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
    t.description.en.toLowerCase().includes(lowerQuery)
  )
}
