export interface ProductTemplate {
  id: string
  name: string
  category: "box" | "carton" | "cup" | "bag" | "pouch" | "tube" | "envelope"
  type: "mailer_box" | "rigid_box" | "shipping_box" | "cup" | "bag" | "pouch" | "tube" | "envelope" | "tissue_paper" | "tape" | "label"
  subType?: string
  description: string
  image: string
  dimensions: { length: number; width: number; height: number }
  minQuantity: number
  price: number
}

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    id: "mailer-box-natural",
    name: "Eco-Mailer (Natural Kraft)",
    category: "box",
    type: "mailer_box",
    description: "Our signature sustainable mailing box. Made from 100% recycled natural kraft cardboard.",
    image: "/images/templates/mailer-box-f23.png",
    dimensions: { length: 200, width: 150, height: 80 },
    minQuantity: 30,
    price: 1.20
  },
  {
    id: "rigid-box-luxury",
    name: "Luxury Rigid (Smooth White)",
    category: "box",
    type: "rigid_box",
    description: "Premium rigid setup box with a smooth, luxurious finish. Perfect for retail branding.",
    image: "/images/templates/product-box.png",
    dimensions: { length: 150, width: 150, height: 100 },
    minQuantity: 50,
    price: 4.50
  },
  {
    id: "stand-up-pouch-eco",
    name: "Stand-Up Pouch (Matte Black)",
    category: "pouch",
    type: "pouch",
    description: "High-barrier flexible packaging with a professional matte finish.",
    image: "/images/templates/stand-up-pouch.png",
    dimensions: { length: 150, width: 60, height: 230 },
    minQuantity: 100,
    price: 0.45
  },
  {
    id: "mailer-box-white",
    name: "Premium Mailer (Pure White)",
    category: "box",
    type: "mailer_box",
    description: "Clean, professional white cardboard for high-impact brand colors.",
    image: "/images/templates/mailer-box-m.png",
    dimensions: { length: 300, width: 250, height: 100 },
    minQuantity: 30,
    price: 1.35
  }
]
