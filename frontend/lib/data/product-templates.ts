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
  // No price field: real prices come from the backend rate cards on the
  // product pages; hardcoded template prices were unverifiable.
}

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    id: "mailer-box-natural",
    name: "Mailer (Natural Kraft)",
    category: "box",
    type: "mailer_box",
    description: "Mailing box in natural kraft cardboard.",
    image: "/images/templates/mailer-box-f23.png",
    dimensions: { length: 200, width: 150, height: 80 },
    minQuantity: 30
  },
  {
    id: "rigid-box-luxury",
    name: "Rigid Box (Smooth White)",
    category: "box",
    type: "rigid_box",
    description: "Two-piece rigid setup box with a smooth white finish.",
    image: "/images/templates/product-box.png",
    dimensions: { length: 150, width: 150, height: 100 },
    minQuantity: 50
  },
  {
    id: "stand-up-pouch-eco",
    name: "Stand-Up Pouch (Matte Black)",
    category: "pouch",
    type: "pouch",
    description: "Stand-up pouch with a matte finish.",
    image: "/images/templates/stand-up-pouch.png",
    dimensions: { length: 150, width: 60, height: 230 },
    minQuantity: 100
  },
  {
    id: "mailer-box-white",
    name: "Mailer (Pure White)",
    category: "box",
    type: "mailer_box",
    description: "White cardboard mailer for full-colour branding.",
    image: "/images/templates/mailer-box-m.png",
    dimensions: { length: 300, width: 250, height: 100 },
    minQuantity: 30
  }
]
