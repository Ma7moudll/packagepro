"use client"

import { v4 as uuidv4 } from "uuid"
import { Layer } from "../state/types"
import { ClosureType, CardboardColor } from "../types/template"

export interface RawLayer {
  type?: string
  name?: string
  opacity?: number
  position?: { x: number; y: number }
  scale?: { x: number; y: number }
  textProperties?: Layer["textProperties"]
  imageProperties?: Layer["imageProperties"]
  shapeProperties?: Layer["shapeProperties"]
}

export interface TemplateCategory {
  id: string
  name: { en: string; ar: string }
  icon: string
}

export interface RawTemplate {
  id: string
  name: { en: string; ar: string }
  category: string
  description: { en: string; ar: string }
  thumbnail: string
  tags: string[]
  style: string
  material: string
  finish: string
  dimensions: { length: number; width: number; height: number }
  closureType?: ClosureType
  cardboardColor?: CardboardColor
  realisticPreview?: string
  layers: RawLayer[]
}

export interface PresetTemplate extends Omit<RawTemplate, "name" | "description"> {
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  productTypes: string[]
  isPremium: boolean
  layers: Layer[]
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: "all", name: { en: "All", ar: "الكل" }, icon: "📦" },
  { id: "box", name: { en: "Boxes", ar: "صناديق" }, icon: "📋" },
  { id: "pouch", name: { en: "Pouches & Mailers", ar: "أكياس وملفات" }, icon: "🛍️" },
  { id: "bag", name: { en: "Bags", ar: "حقائب" }, icon: "👜" },
  { id: "label", name: { en: "Labels", ar: "ملصقات" }, icon: "🏷️" },
  { id: "tube", name: { en: "Tubes", ar: "أنابيب" }, icon: "🧴" },
  { id: "other", name: { en: "Other", ar: "أخرى" }, icon: "📄" },
]

function generateSvgThumbnail(bgColor: string, elements: string): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'%3E%3Crect fill='${encodeURIComponent(bgColor)}' width='200' height='150'/%3E${encodeURIComponent(elements)}%3C/svg%3E`
}

export const TEMPLATES: RawTemplate[] = [
  {
    id: "corrugated-mailer",
    name: { en: "Corrugated Mailer Box", ar: "صندوق بريد مموج" },
    category: "box",
    description: { en: "20×15×5 cm brown kraft mailer with simple brand print", ar: "صندوق بريد كرافت بني 20×15×5 سم بطباعة بسيطة" },
    thumbnail: generateSvgThumbnail("#c4a574", "<rect x='25' y='35' width='150' height='80' fill='#d4b896' stroke='#8B7355' stroke-width='2' rx='2'/><line x1='25' y1='115' x2='175' y2='115' stroke='#8B7355' stroke-width='1' stroke-dasharray='4,3'/><polygon points='25,35 55,20 145,20 175,35' fill='#e0c9a6' stroke='#8B7355' stroke-width='1.5'/><line x1='55' y1='20' x2='145' y2='20' stroke='#8B7355' stroke-width='1' stroke-dasharray='3,3'/><text x='100' y='70' font-size='14' fill='#5c3d2e' text-anchor='middle' font-weight='bold'>CORRUGATED</text><text x='100' y='88' font-size='9' fill='#8B7355' text-anchor='middle'>MAILER BOX</text><rect x='60' y='100' width='80' height='5' fill='#8B7355' rx='1' opacity='0.3'/>"),
    closureType: "self-locking",
    cardboardColor: "kraft-brown",
    tags: ["corrugated", "kraft", "mailer", "eco", "brown"],
    style: "eco",
    material: "corrugated-kraft",
    finish: "uncoated",
    dimensions: { length: 20, width: 15, height: 5 },
    layers: [
      {
        type: "shape",
        name: "Border Frame",
        shapeProperties: { shape: "rect", fill: "transparent", stroke: "#9c7c5b", strokeWidth: 4, cornerRadius: 6 },
        position: { x: 400, y: 110 },
        scale: { x: 0.55, y: 0.45 },
      },
      {
        type: "text",
        name: "Brand Name",
        textProperties: { content: "PACKAGE", fontFamily: "Oswald", fontSize: 48, fontWeight: 700, align: "center", color: "#5c3d2e", lineHeight: 1, letterSpacing: 6 },
        position: { x: 400, y: 100 },
      },
      {
        type: "shape",
        name: "Divider",
        shapeProperties: { shape: "rect", fill: "#9c7c5b", stroke: "transparent", strokeWidth: 0 },
        position: { x: 400, y: 145 },
        scale: { x: 0.35, y: 0.015 },
      },
      {
        type: "text",
        name: "Subtitle",
        textProperties: { content: "CORRUGATED MAILER", fontFamily: "Inter", fontSize: 14, fontWeight: 500, align: "center", color: "#7c5c3b", lineHeight: 1.5, letterSpacing: 4 },
        position: { x: 400, y: 175 },
      },
    ],
  },
  {
    id: "rigid-gift-box",
    name: { en: "Rigid Gift Box", ar: "صندوق هدايا صلب" },
    category: "box",
    description: { en: "15×15×5 cm rigid board box with soft-touch coating and ribbon", ar: "صندوق هدايا صلب 15×15×5 سم بطبقة ناعمة الملمس وشريط" },
    thumbnail: generateSvgThumbnail("#1e1e2f", "<rect x='35' y='45' width='130' height='65' fill='#2a2a3e' stroke='#d4af37' stroke-width='2' rx='4'/><rect x='30' y='25' width='140' height='22' fill='#333350' stroke='#d4af37' stroke-width='2' rx='4'/><line x1='30' y1='47' x2='170' y2='47' stroke='#d4af37' stroke-width='1' stroke-dasharray='3,3'/><text x='100' y='80' font-size='18' fill='#d4af37' text-anchor='middle' font-weight='bold'>GIFT</text><line x1='60' y1='95' x2='140' y2='95' stroke='#d4af37' stroke-width='1'/><rect x='70' y='102' width='60' height='3' fill='#d4af37' rx='1'/>"),
    closureType: "snap",
    cardboardColor: "white",
    tags: ["rigid", "gift", "luxury", "soft-touch", "ribbon"],
    style: "luxury",
    material: "rigid-board",
    finish: "soft-touch",
    dimensions: { length: 15, width: 15, height: 5 },
    layers: [
      {
        type: "shape",
        name: "Gold Border",
        shapeProperties: { shape: "rect", fill: "transparent", stroke: "#d4af37", strokeWidth: 3, cornerRadius: 8 },
        position: { x: 400, y: 110 },
        scale: { x: 0.5, y: 0.4 },
      },
      {
        type: "text",
        name: "Gift Title",
        textProperties: { content: "GIFT", fontFamily: "Playfair Display", fontSize: 52, fontWeight: 400, align: "center", color: "#d4af37", lineHeight: 1, letterSpacing: 8 },
        position: { x: 400, y: 105 },
      },
      {
        type: "shape",
        name: "Ribbon",
        shapeProperties: { shape: "rect", fill: "#d4af37", stroke: "transparent", strokeWidth: 0 },
        position: { x: 400, y: 155 },
        scale: { x: 0.2, y: 0.02 },
      },
      {
        type: "text",
        name: "Subtitle",
        textProperties: { content: "LUXURY COLLECTION", fontFamily: "Inter", fontSize: 11, fontWeight: 500, align: "center", color: "#a08029", lineHeight: 1.5, letterSpacing: 5 },
        position: { x: 400, y: 185 },
      },
    ],
  },
  {
    id: "jewelry-box",
    name: { en: "Jewelry Box", ar: "صندوق مجوهرات" },
    category: "box",
    description: { en: "8×8×3 cm white glossy box with velvet insert for rings or earrings", ar: "صندوق أبيض لامع 8×8×3 سم مع حشوة مخملية للخواتم والأقراط" },
    thumbnail: generateSvgThumbnail("#ffffff", "<rect x='50' y='42' width='100' height='65' fill='#fafafa' stroke='#d4af37' stroke-width='2' rx='6'/><rect x='50' y='25' width='100' height='20' fill='#f5f5f5' stroke='#d4af37' stroke-width='2' rx='6'/><line x1='50' y1='45' x2='150' y2='45' stroke='#d4af37' stroke-width='1' stroke-dasharray='3,3'/><ellipse cx='100' cy='70' rx='22' ry='16' fill='#92716e'/><text x='100' y='74' font-size='8' fill='#d4af37' text-anchor='middle' font-weight='bold'>JEWELRY</text>"),
    closureType: "snap",
    cardboardColor: "white",
    tags: ["jewelry", "white", "glossy", "velvet", "luxury"],
    style: "luxury",
    material: "white-glossy",
    finish: "gloss-lamination",
    dimensions: { length: 8, width: 8, height: 3 },
    layers: [
      {
        type: "shape",
        name: "Outer Border",
        shapeProperties: { shape: "rect", fill: "transparent", stroke: "#d4af37", strokeWidth: 2, cornerRadius: 12 },
        position: { x: 400, y: 110 },
        scale: { x: 0.45, y: 0.35 },
      },
      {
        type: "shape",
        name: "Velvet Insert",
        shapeProperties: { shape: "circle", fill: "#92716e", stroke: "transparent", strokeWidth: 0 },
        position: { x: 400, y: 105 },
        scale: { x: 0.2, y: 0.15 },
      },
      {
        type: "text",
        name: "Brand",
        textProperties: { content: "JEWELRY", fontFamily: "Playfair Display", fontSize: 36, fontWeight: 400, align: "center", color: "#d4af37", lineHeight: 1, letterSpacing: 6 },
        position: { x: 400, y: 175 },
      },
      {
        type: "text",
        name: "Sub",
        textProperties: { content: "FINE COLLECTION", fontFamily: "Inter", fontSize: 10, fontWeight: 500, align: "center", color: "#a08029", lineHeight: 1.5, letterSpacing: 4 },
        position: { x: 400, y: 200 },
      },
    ],
  },
  {
    id: "folding-carton",
    name: { en: "Folding Carton", ar: "كرتون قابل للطي" },
    category: "box",
    description: { en: "12×12×6 cm recyclable cardboard carton with matte lamination", ar: "كرتون قابل للطي 12×12×6 سم من كرتون معاد تدويره بطبقة مات" },
    thumbnail: generateSvgThumbnail("#f1f5f9", "<rect x='35' y='35' width='130' height='80' fill='#f8fafc' stroke='#334155' stroke-width='2' rx='2'/><line x1='35' y1='115' x2='165' y2='115' stroke='#334155' stroke-width='1' stroke-dasharray='4,3'/><polygon points='80,35 120,35 100,22' fill='#f1f5f9' stroke='#334155' stroke-width='1.5'/><text x='100' y='70' font-size='14' fill='#334155' text-anchor='middle' font-weight='bold' letter-spacing='4'>PREMIUM</text><rect x='60' y='88' width='80' height='3' fill='#94a3b8'/><text x='100' y='108' font-size='9' fill='#64748b' text-anchor='middle'>FOLDING CARTON</text>"),
    closureType: "tuck",
    cardboardColor: "white",
    tags: ["folding", "carton", "recyclable", "matte", "cardboard"],
    style: "professional",
    material: "recyclable-cardboard",
    finish: "matte-lamination",
    dimensions: { length: 12, width: 12, height: 6 },
    layers: [
      {
        type: "shape",
        name: "Border",
        shapeProperties: { shape: "rect", fill: "transparent", stroke: "#334155", strokeWidth: 4, cornerRadius: 4 },
        position: { x: 400, y: 110 },
        scale: { x: 0.5, y: 0.4 },
      },
      {
        type: "text",
        name: "Title",
        textProperties: { content: "PREMIUM", fontFamily: "Inter", fontSize: 42, fontWeight: 700, align: "center", color: "#334155", lineHeight: 1, letterSpacing: 6 },
        position: { x: 400, y: 105 },
      },
      {
        type: "shape",
        name: "Divider",
        shapeProperties: { shape: "rect", fill: "#94a3b8", stroke: "transparent", strokeWidth: 0 },
        position: { x: 400, y: 150 },
        scale: { x: 0.3, y: 0.01 },
      },
      {
        type: "text",
        name: "Eco",
        textProperties: { content: "100% RECYCLABLE", fontFamily: "Inter", fontSize: 12, fontWeight: 600, align: "center", color: "#64748b", lineHeight: 1.5, letterSpacing: 3 },
        position: { x: 400, y: 180 },
      },
    ],
  },
  {
    id: "pizza-box",
    name: { en: "Pizza Box", ar: "صندوق بيتزا" },
    category: "box",
    description: { en: "30×30×4 cm white cardboard box with grease-resistant matte finish", ar: "صندوق بيتزا 30×30×4 سم من كرتون أبيض بمقاومة للزيوت" },
    thumbnail: generateSvgThumbnail("#ffffff", "<rect x='25' y='35' width='150' height='80' fill='white' stroke='#dc2626' stroke-width='2' rx='2'/><rect x='25' y='25' width='150' height='14' fill='#f8f8f8' stroke='#dc2626' stroke-width='2' rx='2'/><line x1='25' y1='39' x2='175' y2='39' stroke='#dc2626' stroke-width='1' stroke-dasharray='3,3'/><rect x='25' y='55' width='150' height='26' fill='#dc2626'/><text x='100' y='73' font-size='16' fill='white' text-anchor='middle' font-weight='bold'>PIZZA</text><rect x='60' y='98' width='80' height='5' fill='#00a86b' rx='1'/>"),
    closureType: "self-locking",
    cardboardColor: "white",
    tags: ["pizza", "food", "white", "grease-resistant", "italian"],
    style: "bold",
    material: "white-cardboard",
    finish: "grease-resistant",
    dimensions: { length: 30, width: 30, height: 4 },
    layers: [
      {
        type: "shape",
        name: "Red Stripe",
        shapeProperties: { shape: "rect", fill: "#dc2626", stroke: "transparent", strokeWidth: 0 },
        position: { x: 400, y: 80 },
        scale: { x: 0.7, y: 0.15 },
      },
      {
        type: "text",
        name: "Pizza",
        textProperties: { content: "PIZZA", fontFamily: "Poppins", fontSize: 56, fontWeight: 700, align: "center", color: "#ffffff", lineHeight: 1, letterSpacing: 4 },
        position: { x: 400, y: 82 },
      },
      {
        type: "text",
        name: "Slogan",
        textProperties: { content: "Authentic Italian Recipe", fontFamily: "Georgia", fontSize: 14, fontWeight: 400, align: "center", color: "#1e293b", lineHeight: 1.5, letterSpacing: 1 },
        position: { x: 400, y: 155 },
      },
      {
        type: "shape",
        name: "Green Bar",
        shapeProperties: { shape: "rect", fill: "#00a86b", stroke: "transparent", strokeWidth: 0, cornerRadius: 2 },
        position: { x: 400, y: 185 },
        scale: { x: 0.35, y: 0.04 },
      },
    ],
  },
  {
    id: "coffee-pouch",
    name: { en: "Coffee Stand-up Pouch", ar: "كيس قهوة قائم" },
    category: "pouch",
    description: { en: "12×20 cm kraft stand-up pouch with heat seal and one-way valve", ar: "كيس قهوة قائم 12×20 سم من ورق كرافت بختم حراري وصمام" },
    thumbnail: generateSvgThumbnail("#451a03", "<rect x='50' y='25' width='100' height='100' fill='%235c2d0e' rx='8'/><text x='100' y='68' font-size='16' fill='%23fef3c7' text-anchor='middle' font-weight='bold'>COFFEE</text><line x1='65' y1='85' x2='135' y2='85' stroke='%23d4a574' stroke-width='1'/><text x='100' y='103' font-size='8' fill='%23d4a574' text-anchor='middle'>ARABICA · MEDIUM ROAST</text><circle cx='100' cy='120' r='4' fill='%23a08029'/>"),
    tags: ["coffee", "pouch", "stand-up", "kraft", "aromatic"],
    style: "warm",
    material: "kraft-paper",
    finish: "matte",
    dimensions: { length: 12, width: 20, height: 0 },
    layers: [
      {
        type: "shape",
        name: "Background",
        shapeProperties: { shape: "rect", fill: "#5c2d0e", stroke: "transparent", strokeWidth: 0, cornerRadius: 12 },
        position: { x: 400, y: 110 },
        scale: { x: 0.5, y: 0.5 },
      },
      {
        type: "text",
        name: "Brand",
        textProperties: { content: "COFFEE", fontFamily: "Merriweather", fontSize: 44, fontWeight: 700, align: "center", color: "#fef3c7", lineHeight: 1, letterSpacing: 3 },
        position: { x: 400, y: 95 },
      },
      {
        type: "shape",
        name: "Separator",
        shapeProperties: { shape: "rect", fill: "#d4a574", stroke: "transparent", strokeWidth: 0 },
        position: { x: 400, y: 140 },
        scale: { x: 0.3, y: 0.008 },
      },
      {
        type: "text",
        name: "Origin",
        textProperties: { content: "ARABICA · MEDIUM ROAST", fontFamily: "Inter", fontSize: 10, fontWeight: 500, align: "center", color: "#d4a574", lineHeight: 1.5, letterSpacing: 3 },
        position: { x: 400, y: 170 },
      },
    ],
  },
  {
    id: "sunscreen-tube",
    name: { en: "Sunscreen Tube", ar: "أنبوب واقي شمس" },
    category: "tube",
    description: { en: "5×15 cm white plastic tube with full-colour gloss label", ar: "أنبوب بلاستيك أبيض 5×15 سم مع ملصق كامل الألوان لامع" },
    thumbnail: generateSvgThumbnail("#f0f9ff", "<rect x='60' y='20' width='80' height='110' fill='%23e0f2fe' rx='30' stroke='%233b82f6' stroke-width='2'/><circle cx='100' cy='55' r='18' fill='%23fbbf24'/><text x='100' y='60' font-size='8' fill='%2385403c' text-anchor='middle' font-weight='bold'>SPF</text><text x='100' y='100' font-size='10' fill='%231e3a5f' text-anchor='middle' font-weight='bold'>50+</text>"),
    tags: ["sunscreen", "tube", "plastic", "spf", "summer"],
    style: "modern",
    material: "white-plastic",
    finish: "gloss",
    dimensions: { length: 5, width: 15, height: 0 },
    layers: [
      {
        type: "shape",
        name: "Tube Body",
        shapeProperties: { shape: "rect", fill: "#e0f2fe", stroke: "#3b82f6", strokeWidth: 3, cornerRadius: 30 },
        position: { x: 400, y: 110 },
        scale: { x: 0.35, y: 0.55 },
      },
      {
        type: "shape",
        name: "Sun Circle",
        shapeProperties: { shape: "circle", fill: "#fbbf24", stroke: "#f59e0b", strokeWidth: 2 },
        position: { x: 400, y: 85 },
        scale: { x: 0.16, y: 0.16 },
      },
      {
        type: "text",
        name: "SPF",
        textProperties: { content: "SPF", fontFamily: "Oswald", fontSize: 22, fontWeight: 700, align: "center", color: "#85403c", lineHeight: 1, letterSpacing: 2 },
        position: { x: 400, y: 75 },
      },
      {
        type: "text",
        name: "Value",
        textProperties: { content: "50+", fontFamily: "Oswald", fontSize: 32, fontWeight: 700, align: "center", color: "#1e3a5f", lineHeight: 1, letterSpacing: 1 },
        position: { x: 400, y: 170 },
      },
      {
        type: "text",
        name: "Desc",
        textProperties: { content: "BROAD SPECTRUM", fontFamily: "Inter", fontSize: 9, fontWeight: 600, align: "center", color: "#3b82f6", lineHeight: 1.5, letterSpacing: 2 },
        position: { x: 400, y: 195 },
      },
    ],
  },
  {
    id: "shopping-bag",
    name: { en: "Shopping Paper Bag", ar: "حقيبة تسوق ورقية" },
    category: "bag",
    description: { en: "25×30×10 cm reinforced kraft bag with twisted paper handles", ar: "حقيبة كرافت مقواة 25×30×10 سم بمقابض ورقية ملتوية" },
    thumbnail: generateSvgThumbnail("#fef7ed", "<rect x='35' y='25' width='130' height='100' fill='%23ead7c3' stroke='%239c7c5b' stroke-width='2'/><rect x='80' y='15' width='40' height='15' fill='%23d4b896' rx='4'/><text x='100' y='68' font-size='22' fill='%235c3d2e' text-anchor='middle' font-weight='bold'>STORE</text><rect x='55' y='85' width='90' height='4' fill='%239c7c5b' rx='1'/><text x='100' y='108' font-size='9' fill='%237c5c3b' text-anchor='middle'>PAPER BAG</text>"),
    tags: ["bag", "paper", "shopping", "kraft", "retail"],
    style: "minimal",
    material: "reinforced-kraft",
    finish: "uncoated",
    dimensions: { length: 25, width: 30, height: 10 },
    layers: [
      {
        type: "shape",
        name: "Bag Body",
        shapeProperties: { shape: "rect", fill: "#ead7c3", stroke: "#9c7c5b", strokeWidth: 3 },
        position: { x: 400, y: 110 },
        scale: { x: 0.55, y: 0.5 },
      },
      {
        type: "shape",
        name: "Handle Left",
        shapeProperties: { shape: "rect", fill: "#d4b896", stroke: "transparent", strokeWidth: 0, cornerRadius: 4 },
        position: { x: 355, y: 30 },
        scale: { x: 0.08, y: 0.06 },
      },
      {
        type: "shape",
        name: "Handle Right",
        shapeProperties: { shape: "rect", fill: "#d4b896", stroke: "transparent", strokeWidth: 0, cornerRadius: 4 },
        position: { x: 445, y: 30 },
        scale: { x: 0.08, y: 0.06 },
      },
      {
        type: "text",
        name: "Brand",
        textProperties: { content: "STORE", fontFamily: "Oswald", fontSize: 48, fontWeight: 700, align: "center", color: "#5c3d2e", lineHeight: 1, letterSpacing: 8 },
        position: { x: 400, y: 105 },
      },
      {
        type: "shape",
        name: "Divider",
        shapeProperties: { shape: "rect", fill: "#9c7c5b", stroke: "transparent", strokeWidth: 0 },
        position: { x: 400, y: 145 },
        scale: { x: 0.25, y: 0.01 },
      },
      {
        type: "text",
        name: "Type",
        textProperties: { content: "PAPER BAG", fontFamily: "Inter", fontSize: 12, fontWeight: 500, align: "center", color: "#7c5c3b", lineHeight: 1.5, letterSpacing: 5 },
        position: { x: 400, y: 175 },
      },
    ],
  },
  {
    id: "product-label",
    name: { en: "Product Label", ar: "ملصق منتج" },
    category: "label",
    description: { en: "10×10 cm square gloss label with UV spot and custom die-cut", ar: "ملصق مربع لامع 10×10 سم مع طباعة UV وقص مخصص" },
    thumbnail: generateSvgThumbnail("#f8fafc", "<rect x='40' y='25' width='120' height='100' fill='%23f1f5f9' stroke='%233b82f6' stroke-width='3' rx='12'/><circle cx='100' cy='65' r='20' fill='%23dbeafe'/><text x='100' y='70' font-size='10' fill='%231d4ed8' text-anchor='middle' font-weight='bold'>BRAND</text><text x='100' y='110' font-size='7' fill='%2364748b' text-anchor='middle'>PREMIUM QUALITY</text>"),
    tags: ["label", "sticker", "gloss", "die-cut", "product"],
    style: "modern",
    material: "glossy-paper",
    finish: "uv-gloss",
    dimensions: { length: 10, width: 10, height: 0 },
    layers: [
      {
        type: "shape",
        name: "Label Shape",
        shapeProperties: { shape: "rect", fill: "#f1f5f9", stroke: "#3b82f6", strokeWidth: 4, cornerRadius: 16 },
        position: { x: 400, y: 110 },
        scale: { x: 0.5, y: 0.45 },
      },
      {
        type: "shape",
        name: "Circle Accent",
        shapeProperties: { shape: "circle", fill: "#dbeafe", stroke: "transparent", strokeWidth: 0 },
        position: { x: 400, y: 95 },
        scale: { x: 0.18, y: 0.18 },
      },
      {
        type: "text",
        name: "Brand",
        textProperties: { content: "BRAND", fontFamily: "Inter", fontSize: 28, fontWeight: 700, align: "center", color: "#1d4ed8", lineHeight: 1, letterSpacing: 4 },
        position: { x: 400, y: 98 },
      },
      {
        type: "text",
        name: "Tagline",
        textProperties: { content: "PREMIUM QUALITY", fontFamily: "Inter", fontSize: 10, fontWeight: 600, align: "center", color: "#64748b", lineHeight: 1.5, letterSpacing: 2 },
        position: { x: 400, y: 170 },
      },
    ],
  },
  {
    id: "poly-mailer",
    name: { en: "Poly Mailer", ar: "ظرف بولي إيثيلين" },
    category: "pouch",
    description: { en: "25×35 cm lightweight polyethylene waterproof mailer with strong seal", ar: "ظرف بولي إيثيلين مقاوم للماء 25×35 سم بختم قوي" },
    thumbnail: generateSvgThumbnail("#f8fafc", "<rect x='25' y='20' width='150' height='110' fill='%23f1f5f9' stroke='%23334155' stroke-width='2' rx='5'/><rect x='25' y='35' width='150' height='35' fill='%23dc2626'/><text x='100' y='60' font-size='14' fill='white' text-anchor='middle' font-weight='bold'>THANK YOU</text><text x='100' y='108' font-size='8' fill='%2364748b' text-anchor='middle'>POLY MAILER · WATERPROOF</text>"),
    tags: ["poly", "mailer", "waterproof", "polyethylene", "shipping"],
    style: "bold",
    material: "polyethylene",
    finish: "waterproof",
    dimensions: { length: 25, width: 35, height: 0 },
    layers: [
      {
        type: "shape",
        name: "Mailer Outline",
        shapeProperties: { shape: "rect", fill: "#f1f5f9", stroke: "#334155", strokeWidth: 3, cornerRadius: 8 },
        position: { x: 400, y: 110 },
        scale: { x: 0.6, y: 0.55 },
      },
      {
        type: "shape",
        name: "Red Bar",
        shapeProperties: { shape: "rect", fill: "#dc2626", stroke: "transparent", strokeWidth: 0 },
        position: { x: 400, y: 80 },
        scale: { x: 0.5, y: 0.18 },
      },
      {
        type: "text",
        name: "Thank You",
        textProperties: { content: "THANK YOU", fontFamily: "Oswald", fontSize: 36, fontWeight: 700, align: "center", color: "#ffffff", lineHeight: 1, letterSpacing: 4 },
        position: { x: 400, y: 82 },
      },
      {
        type: "text",
        name: "Type Label",
        textProperties: { content: "POLY MAILER · WATERPROOF", fontFamily: "Inter", fontSize: 10, fontWeight: 600, align: "center", color: "#64748b", lineHeight: 1.5, letterSpacing: 3 },
        position: { x: 400, y: 180 },
      },
    ],
  },
  {
    id: "soap-box",
    name: { en: "Soap Box", ar: "علبة صابون" },
    category: "box",
    description: { en: "10×7×4 cm kraft box with circular window cutout for natural soap", ar: "علبة كرافت 10×7×4 سم مع نافذة دائرية للصابون الطبيعي" },
    thumbnail: generateSvgThumbnail("#fef7ed", "<rect x='45' y='35' width='110' height='80' fill='#f5e6d0' stroke='#8b6914' stroke-width='2' rx='3'/><line x1='45' y1='115' x2='155' y2='115' stroke='#8b6914' stroke-width='1' stroke-dasharray='4,3'/><polygon points='82,35 118,35 100,22' fill='#efe0c0' stroke='#8b6914' stroke-width='1.5'/><circle cx='100' cy='65' r='16' fill='#fef7ed' stroke='#8b6914' stroke-width='1'/><text x='100' y='69' font-size='7' fill='#5c3d2e' text-anchor='middle'>SOAP</text><ellipse cx='100' cy='100' rx='14' ry='5' fill='#16a34a'/>"),
    closureType: "tuck",
    cardboardColor: "kraft-brown",
    tags: ["soap", "craft", "natural", "window-cutout", "eco"],
    style: "eco",
    material: "kraft",
    finish: "uncoated",
    dimensions: { length: 10, width: 7, height: 4 },
    layers: [
      {
        type: "shape",
        name: "Box Outline",
        shapeProperties: { shape: "rect", fill: "#f5e6d0", stroke: "#8b6914", strokeWidth: 3, cornerRadius: 6 },
        position: { x: 400, y: 110 },
        scale: { x: 0.48, y: 0.42 },
      },
      {
        type: "shape",
        name: "Window Cutout",
        shapeProperties: { shape: "circle", fill: "#fef7ed", stroke: "#8b6914", strokeWidth: 2 },
        position: { x: 400, y: 95 },
        scale: { x: 0.15, y: 0.15 },
      },
      {
        type: "text",
        name: "Soap",
        textProperties: { content: "SOAP", fontFamily: "Merriweather", fontSize: 18, fontWeight: 700, align: "center", color: "#5c3d2e", lineHeight: 1, letterSpacing: 3 },
        position: { x: 400, y: 80 },
      },
      {
        type: "shape",
        name: "Leaf Accent",
        shapeProperties: { shape: "circle", fill: "#16a34a", stroke: "transparent", strokeWidth: 0, cornerRadius: 0 },
        position: { x: 400, y: 175 },
        scale: { x: 0.12, y: 0.06 },
      },
      {
        type: "text",
        name: "Handmade",
        textProperties: { content: "HANDMADE", fontFamily: "Inter", fontSize: 12, fontWeight: 600, align: "center", color: "#5c3d2e", lineHeight: 1.5, letterSpacing: 4 },
        position: { x: 400, y: 200 },
      },
    ],
  },
  {
    id: "tea-box",
    name: { en: "Premium Tea Box", ar: "علبة شاي فاخرة" },
    category: "box",
    description: { en: "15×10×8 cm metallic foil carton with embossed botanical pattern", ar: "علبة شاي 15×10×8 سم برقائق معدنية ونقش نباتي بارز" },
    thumbnail: generateSvgThumbnail("#0f3b2c", "<rect x='40' y='35' width='120' height='80' fill='#145a40' stroke='#d4af37' stroke-width='2' rx='4'/><line x1='40' y1='115' x2='160' y2='115' stroke='#d4af37' stroke-width='1' stroke-dasharray='4,3'/><polygon points='80,35 120,35 100,22' fill='#1a6b4d' stroke='#d4af37' stroke-width='1.5'/><ellipse cx='100' cy='62' rx='10' ry='7' fill='#22c55e'/><text x='100' y='100' font-size='14' fill='#d4af37' text-anchor='middle' font-weight='bold' letter-spacing='4'>TEA</text><text x='100' y='112' font-size='7' fill='#a08029' text-anchor='middle'>PREMIUM COLLECTION</text>"),
    closureType: "tuck",
    cardboardColor: "kraft-brown",
    tags: ["tea", "premium", "metallic", "embossed", "botanical"],
    style: "luxury",
    material: "metallic-foil",
    finish: "embossed",
    dimensions: { length: 15, width: 10, height: 8 },
    layers: [
      {
        type: "shape",
        name: "Box Body",
        shapeProperties: { shape: "rect", fill: "#145a40", stroke: "#d4af37", strokeWidth: 3, cornerRadius: 6 },
        position: { x: 400, y: 110 },
        scale: { x: 0.5, y: 0.45 },
      },
      {
        type: "shape",
        name: "Leaf Motif",
        shapeProperties: { shape: "circle", fill: "#22c55e", stroke: "transparent", strokeWidth: 0 },
        position: { x: 400, y: 95 },
        scale: { x: 0.06, y: 0.06 },
      },
      {
        type: "text",
        name: "Tea",
        textProperties: { content: "TEA", fontFamily: "Playfair Display", fontSize: 40, fontWeight: 400, align: "center", color: "#d4af37", lineHeight: 1, letterSpacing: 8 },
        position: { x: 400, y: 170 },
      },
      {
        type: "text",
        name: "Sub",
        textProperties: { content: "PREMIUM COLLECTION", fontFamily: "Inter", fontSize: 9, fontWeight: 500, align: "center", color: "#a08029", lineHeight: 1.5, letterSpacing: 4 },
        position: { x: 400, y: 195 },
      },
    ],
  },
  {
    id: "candle-label",
    name: { en: "Candle Jar Label", ar: "ملصق شمعة" },
    category: "label",
    description: { en: "8×12 cm matte paper label with soft-touch coating for candle jars", ar: "ملصق شمعة 8×12 سم من ورق مات بطبقة ناعمة لبرطمانات الشموع" },
    thumbnail: generateSvgThumbnail("#fefce8", "<rect x='50' y='25' width='100' height='100' fill='%23fefce8' stroke='%23a16207' stroke-width='2' rx='10'/><text x='100' y='65' font-size='16' fill='%238b4513' text-anchor='middle' font-family='serif' font-style='italic'>CANDLE</text><line x1='65' y1='80' x2='135' y2='80' stroke='%23d4af37' stroke-width='1'/><text x='100' y='100' font-size='8' fill='%23a16207' text-anchor='middle'>HAND-POURED · SOY WAX</text><circle cx='100' cy='118' r='3' fill='%23fbbf24'/>"),
    tags: ["candle", "label", "matte", "soft-touch", "premium"],
    style: "elegant",
    material: "matte-paper",
    finish: "soft-touch",
    dimensions: { length: 8, width: 12, height: 0 },
    layers: [
      {
        type: "shape",
        name: "Label Shape",
        shapeProperties: { shape: "rect", fill: "#fefce8", stroke: "#a16207", strokeWidth: 3, cornerRadius: 12 },
        position: { x: 400, y: 110 },
        scale: { x: 0.42, y: 0.5 },
      },
      {
        type: "text",
        name: "Candle",
        textProperties: { content: "CANDLE", fontFamily: "Georgia", fontSize: 36, fontWeight: 400, align: "center", color: "#8b4513", lineHeight: 1, letterSpacing: 4 },
        position: { x: 400, y: 95 },
      },
      {
        type: "shape",
        name: "Gold Line",
        shapeProperties: { shape: "rect", fill: "#d4af37", stroke: "transparent", strokeWidth: 0 },
        position: { x: 400, y: 135 },
        scale: { x: 0.3, y: 0.01 },
      },
      {
        type: "text",
        name: "Description",
        textProperties: { content: "HAND-POURED · SOY WAX", fontFamily: "Inter", fontSize: 9, fontWeight: 600, align: "center", color: "#a16207", lineHeight: 1.5, letterSpacing: 2 },
        position: { x: 400, y: 165 },
      },
      {
        type: "shape",
        name: "Flame Dot",
        shapeProperties: { shape: "circle", fill: "#fbbf24", stroke: "transparent", strokeWidth: 0 },
        position: { x: 400, y: 190 },
        scale: { x: 0.03, y: 0.03 },
      },
    ],
  },
  {
    id: "shipping-box",
    name: { en: "Heavy-Duty Shipping Box", ar: "صندوق شحن متين" },
    category: "box",
    description: { en: "40×30×20 cm double-wall corrugated box with handling labels", ar: "صندوق شحن مموج مزدوج 40×30×20 سم مع ملصقات تعليمات" },
    thumbnail: generateSvgThumbnail("#cbd5e1", "<rect x='20' y='35' width='160' height='80' fill='#d6dce5' stroke='#475869' stroke-width='2' rx='2'/><line x1='20' y1='115' x2='180' y2='115' stroke='#475869' stroke-width='1' stroke-dasharray='4,3'/><polygon points='80,35 120,35 100,22' fill='#cbd5e1' stroke='#475869' stroke-width='1.5'/><rect x='95' y='35' width='10' height='80' fill='#94a3b8' opacity='0.5'/><rect x='38' y='50' width='124' height='22' fill='#ef4444'/><text x='100' y='66' font-size='13' fill='white' text-anchor='middle' font-weight='bold'>FRAGILE</text><rect x='60' y='88' width='80' height='3' fill='#475869'/><text x='100' y='108' font-size='8' fill='#334155' text-anchor='middle'>HANDLE WITH CARE</text>"),
    closureType: "tape-seal",
    cardboardColor: "kraft-brown",
    tags: ["shipping", "corrugated", "heavy-duty", "fragile", "logistics"],
    style: "professional",
    material: "corrugated",
    finish: "uncoated",
    dimensions: { length: 40, width: 30, height: 20 },
    layers: [
      {
        type: "shape",
        name: "Box Outline",
        shapeProperties: { shape: "rect", fill: "#d6dce5", stroke: "#475869", strokeWidth: 4 },
        position: { x: 400, y: 110 },
        scale: { x: 0.65, y: 0.45 },
      },
      {
        type: "shape",
        name: "Fragile Bar",
        shapeProperties: { shape: "rect", fill: "#ef4444", stroke: "transparent", strokeWidth: 0 },
        position: { x: 400, y: 80 },
        scale: { x: 0.5, y: 0.14 },
      },
      {
        type: "text",
        name: "Fragile",
        textProperties: { content: "FRAGILE", fontFamily: "Oswald", fontSize: 42, fontWeight: 700, align: "center", color: "#ffffff", lineHeight: 1, letterSpacing: 5 },
        position: { x: 400, y: 82 },
      },
      {
        type: "shape",
        name: "Divider",
        shapeProperties: { shape: "rect", fill: "#475869", stroke: "transparent", strokeWidth: 0 },
        position: { x: 400, y: 138 },
        scale: { x: 0.45, y: 0.015 },
      },
      {
        type: "text",
        name: "Instruction",
        textProperties: { content: "HANDLE WITH CARE", fontFamily: "Inter", fontSize: 14, fontWeight: 600, align: "center", color: "#334155", lineHeight: 1.5, letterSpacing: 5 },
        position: { x: 400, y: 170 },
      },
    ],
  },
  {
    id: "tissue-paper",
    name: { en: "Custom Tissue Paper", ar: "ورق تيشو مخصص" },
    category: "other",
    description: { en: "50×75 cm white tissue paper with full-surface brand pattern", ar: "ورق تيشو أبيض 50×75 سم بنمط العلامة التجارية" },
    thumbnail: generateSvgThumbnail("#ffffff", "<rect x='20' y='20' width='160' height='110' fill='%23fafafa'/><circle cx='50' cy='40' r='6' fill='%239c7c5b' opacity='0.4'/><circle cx='100' cy='75' r='8' fill='%239c7c5b' opacity='0.6'/><circle cx='150' cy='40' r='6' fill='%239c7c5b' opacity='0.4'/><circle cx='50' cy='110' r='6' fill='%239c7c5b' opacity='0.4'/><circle cx='150' cy='110' r='6' fill='%239c7c5b' opacity='0.4'/><text x='100' y='80' font-size='14' fill='%235c3d2e' text-anchor='middle' opacity='0.3' font-weight='bold'>BRAND</text>"),
    tags: ["tissue", "paper", "wrapping", "branded", "custom-print"],
    style: "playful",
    material: "white-tissue",
    finish: "uncoated",
    dimensions: { length: 50, width: 75, height: 0 },
    layers: [
      {
        type: "shape",
        name: "Background",
        shapeProperties: { shape: "rect", fill: "#fafafa", stroke: "#e2e8f0", strokeWidth: 2 },
        position: { x: 400, y: 110 },
        scale: { x: 0.65, y: 0.55 },
      },
      {
        type: "shape",
        name: "Dot 1",
        shapeProperties: { shape: "circle", fill: "#9c7c5b", stroke: "transparent", strokeWidth: 0 },
        position: { x: 320, y: 70 },
        scale: { x: 0.05, y: 0.05 },
      },
      {
        type: "shape",
        name: "Dot 2",
        shapeProperties: { shape: "circle", fill: "#9c7c5b", stroke: "transparent", strokeWidth: 0 },
        position: { x: 480, y: 70 },
        scale: { x: 0.05, y: 0.05 },
      },
      {
        type: "shape",
        name: "Dot 3",
        shapeProperties: { shape: "circle", fill: "#9c7c5b", stroke: "transparent", strokeWidth: 0 },
        position: { x: 320, y: 150 },
        scale: { x: 0.05, y: 0.05 },
      },
      {
        type: "shape",
        name: "Dot 4",
        shapeProperties: { shape: "circle", fill: "#9c7c5b", stroke: "transparent", strokeWidth: 0 },
        position: { x: 480, y: 150 },
        scale: { x: 0.05, y: 0.05 },
      },
      {
        type: "text",
        name: "Watermark",
        textProperties: { content: "BRAND", fontFamily: "Inter", fontSize: 24, fontWeight: 700, align: "center", color: "#5c3d2e", lineHeight: 1, letterSpacing: 8 },
        position: { x: 400, y: 115 },
        opacity: 0.15,
      },
    ],
  },
]

const styleToPanelCategory: Record<string, string> = {
  playful: "playful",
  eco: "eco",
  luxury: "luxury",
  minimal: "minimalist",
  modern: "minimalist",
  bold: "bold",
  professional: "corporate",
  warm: "food",
  fresh: "food",
  nature: "eco",
  elegant: "luxury",
  vintage: "luxury",
  classic: "luxury",
  festive: "seasonal",
  romantic: "seasonal",
  fun: "playful",
  cute: "playful",
}

const getPanelCategory = (style: string): string => styleToPanelCategory[style] || "minimalist"

export const PRESET_TEMPLATES: PresetTemplate[] = TEMPLATES.map((t) => ({
  ...t,
  name: t.name.en,
  nameAr: t.name.ar,
  description: t.description.en,
  descriptionAr: t.description.ar,
  category: getPanelCategory(t.style),
  productTypes: [] as string[],
  isPremium: t.style === "luxury" || t.finish === "embossed",
  layers: t.layers.map((l) => ({
    id: uuidv4(),
    type: (l.type || "text") as Layer["type"],
    name: l.name || "",
    visible: true,
    locked: false,
    opacity: l.opacity ?? 1,
    blendMode: "normal" as const,
    rotation: 0,
    scale: l.scale || { x: 1, y: 1 },
    position: l.position || { x: 400, y: 150 },
    faceId: "front" as const,
    textProperties: l.textProperties,
    imageProperties: l.imageProperties,
    shapeProperties: l.shapeProperties,
  })),
}))

export function getTemplatesByCategory(categoryId: string): RawTemplate[] {
  if (categoryId === "all") return TEMPLATES
  if (categoryId === "no_template") return []
  return TEMPLATES.filter((t) => t.category === categoryId)
}

export function searchTemplates(query: string): RawTemplate[] {
  const lowerQuery = query.toLowerCase()
  return TEMPLATES.filter(
    (t) =>
      t.name.en.toLowerCase().includes(lowerQuery) ||
      t.name.ar.includes(query) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      t.description.en.toLowerCase().includes(lowerQuery) ||
      t.material.toLowerCase().includes(lowerQuery) ||
      t.finish.toLowerCase().includes(lowerQuery),
  )
}

export function getTemplatesByProductType(productType: string): PresetTemplate[] {
  return PRESET_TEMPLATES.filter((t) => t.productTypes.includes(productType))
}

export function getTemplatesByMaterial(material: string): RawTemplate[] {
  if (!material || material === "all") return TEMPLATES
  return TEMPLATES.filter((t) => t.material === material)
}
