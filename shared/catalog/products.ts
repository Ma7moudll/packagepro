/**
 * Canonical PackagePro product catalogue - single source of truth for the
 * unified storefront + editor product list (55 entries).
 *
 * Identity contract (agreed with the rendering owner):
 *   - `id`     is the editor picker ProductType string (snake_case).
 *   - `boxType` is the normalized kebab-case model key; the editor preview
 *     coverage registry (frontend/lib/editor/product-preview-coverage.ts)
 *     normalizes ids the same way, so registry <-> coverage join on it.
 *   - `slug`   is the storefront slug; the 8 originally seeded slugs are
 *     preserved verbatim so existing links/orders/sessions keep working.
 *
 * Readiness is three independent flags; listing in the catalogue never
 * implies sale-readiness:
 *   - preview: editor 3D preview state (supported / in_progress / unavailable)
 *   - dieline: production blueprint state (supported / deferred)
 *   - pricing: rate state (estimated = seeded estimate-based rules,
 *     quote_required = no product-specific rates exist, price on request)
 * Nothing here claims production approval, certified manufacturing specs
 * or supplier-verified prices.
 */

export type CatalogueCategoryId =
  | "boxes" | "bags" | "pouches" | "cups-tubes" | "envelopes"
  | "paper-tape" | "labels-stickers" | "cards" | "accessories"

export type PreviewStatus = "supported" | "in_progress" | "unavailable"
export type DielineStatus = "supported" | "deferred"
export type PricingStatus = "estimated" | "quote_required"

/**
 * Mirrors the editor preview-coverage family enum, including the two planned
 * additions agreed with the rendering owner: "flat" (single card/sheet, not
 * roll production) and "mailer-bag" (paper/poly mailing envelope, distinct
 * from a carrier "bag"). Families with no integrated preview stay
 * in_progress/unavailable in readiness; `plannedFamily` only records intent.
 */
export type PreviewFamily =
  | "mailer" | "shipping" | "rigid" | "carton" | "pizza"
  | "cup" | "bag" | "pouch" | "tube" | "envelope" | "label"
  | "flat" | "mailer-bag"

export interface CatalogueReadiness {
  preview: PreviewStatus
  dieline: DielineStatus
  pricing: PricingStatus
}

export interface CatalogueCategory {
  id: string
  slug: CatalogueCategoryId
  name: string
  description: string
  sortOrder: number
}

export interface CatalogueSubcategory {
  id: string
  categoryId: string
  slug: string
  name: string
  sortOrder: number
}

export interface CatalogueProduct {
  /** Canonical id; equals the editor picker ProductType. */
  id: string
  /** Normalized kebab-case model key (joins to preview coverage). */
  boxType: string
  /** Backend catalogue row id (existing 8 preserved). */
  productId: string
  slug: string
  name: { en: string; ar: string }
  description: { en: string; ar: string }
  category: CatalogueCategoryId
  subcategory: string
  /** Pricing-engine family; nearest supported type, inert while quote_required. */
  pricingFamily: "box" | "bag" | "label"
  /** Set only where the editor preview routes today (045ef00 coverage). */
  previewFamily?: PreviewFamily
  /** Intended family once its preview is implemented; not a readiness claim. */
  plannedFamily?: PreviewFamily
  readiness: CatalogueReadiness
  /** Human reason when dieline production is deferred. */
  supportReason?: string
  moq: number
  /** Default size in mm, taken verbatim from the editor picker data. */
  defaultDimensions: { length: number; width: number; height: number }
}

export const CATALOGUE_CATEGORIES: CatalogueCategory[] = [
  { id: "cat-boxes", slug: "boxes", name: "Boxes", description: "Custom printed mailing, product and shipping boxes made to your exact dimensions.", sortOrder: 1 },
  { id: "cat-bags", slug: "bags", name: "Bags", description: "Sustainable paper carrier bags and lightweight mailing bags with custom branding.", sortOrder: 2 },
  { id: "cat-labels", slug: "labels-stickers", name: "Labels & Stickers", description: "Die-cut labels and stickers for products, retail and mailers.", sortOrder: 3 },
  { id: "cat-pouches", slug: "pouches", name: "Pouches", description: "Stand-up and doypack pouches for food, coffee and retail, including recyclable and compostable options.", sortOrder: 4 },
  { id: "cat-cups-tubes", slug: "cups-tubes", name: "Cups & Tubes", description: "Custom printed paper cups, smoothie cups and cardboard tubes.", sortOrder: 5 },
  { id: "cat-envelopes", slug: "envelopes", name: "Envelopes", description: "Cardboard and corrugated envelopes for documents, books and e-commerce.", sortOrder: 6 },
  { id: "cat-paper-tape", slug: "paper-tape", name: "Paper & Tape", description: "Wrapping paper, tissue and branded adhesive tapes.", sortOrder: 7 },
  { id: "cat-cards", slug: "cards", name: "Cards", description: "Business, loyalty, thank-you and menu cards with custom print.", sortOrder: 8 },
  { id: "cat-accessories", slug: "accessories", name: "Accessories", description: "Ribbons, stamps and finishing accessories for your packaging.", sortOrder: 9 },
]

export const CATALOGUE_SUBCATEGORIES: CatalogueSubcategory[] = [
  { id: "sub-mailer-boxes", categoryId: "cat-boxes", slug: "mailer-boxes", name: "Mailer Boxes", sortOrder: 1 },
  { id: "sub-product-boxes", categoryId: "cat-boxes", slug: "product-boxes", name: "Product Boxes", sortOrder: 2 },
  { id: "sub-shipping-boxes", categoryId: "cat-boxes", slug: "shipping-boxes", name: "Shipping Boxes", sortOrder: 3 },
  { id: "sub-rigid-boxes", categoryId: "cat-boxes", slug: "rigid-boxes", name: "Rigid & Gift Boxes", sortOrder: 4 },
  { id: "sub-pizza-boxes", categoryId: "cat-boxes", slug: "pizza-boxes", name: "Pizza & Food Boxes", sortOrder: 5 },
  { id: "sub-carrier-bags", categoryId: "cat-bags", slug: "carrier-bags", name: "Carrier Bags", sortOrder: 1 },
  { id: "sub-mailing-bags", categoryId: "cat-bags", slug: "mailing-bags", name: "Mailing Bags", sortOrder: 2 },
  { id: "sub-pouches", categoryId: "cat-pouches", slug: "pouches", name: "Pouches", sortOrder: 1 },
  { id: "sub-cups", categoryId: "cat-cups-tubes", slug: "cups", name: "Cups", sortOrder: 1 },
  { id: "sub-tubes", categoryId: "cat-cups-tubes", slug: "tubes", name: "Tubes", sortOrder: 2 },
  { id: "sub-envelopes", categoryId: "cat-envelopes", slug: "envelopes", name: "Envelopes", sortOrder: 1 },
  { id: "sub-wrapping-paper", categoryId: "cat-paper-tape", slug: "wrapping-paper", name: "Wrapping Paper", sortOrder: 1 },
  { id: "sub-adhesive-tapes", categoryId: "cat-paper-tape", slug: "adhesive-tapes", name: "Adhesive Tapes", sortOrder: 2 },
  { id: "sub-label-stickers", categoryId: "cat-labels", slug: "label-stickers", name: "Labels & Stickers", sortOrder: 1 },
  { id: "sub-cards", categoryId: "cat-cards", slug: "cards", name: "Cards", sortOrder: 1 },
  { id: "sub-accessories", categoryId: "cat-accessories", slug: "accessories", name: "Accessories", sortOrder: 1 },
]

export const DEFERRED_DIELINE_REASON = "Unified catalogue entry without a production dieline blueprint yet; manufacturing geometry is deferred and never shipped as a generic box substitute."

/**
 * Candidate material codes per picker product, verbatim from the editor
 * picker data (products-data.ts availableMaterials). CATALOGUE INTENT,
 * not supplier certification: the renderer filters to these candidates
 * and labels them pending supplier confirmation. No rates exist for
 * codes outside the legacy priced set.
 */
export const CATALOGUE_CANDIDATE_MATERIALS: Record<string, string[]> = {
  mailer_box: ["cardboard-kraft", "cardboard-white", "corrugated-kraft", "corrugated-white"],
  ecommerce_mailer_box: ["corrugated-kraft", "corrugated-white"],
  shipping_box: ["corrugated-kraft", "corrugated-white"],
  snap_lock_box: ["cardboard-white", "cardboard-kraft", "cardboard-coated"],
  auto_bottom_box: ["cardboard-white", "cardboard-coated"],
  bottle_box: ["cardboard-white", "cardboard-coated"],
  pizza_box: ["corrugated-kraft", "corrugated-white"],
  pillow_box: ["cardboard-white", "cardboard-kraft", "cardboard-coated"],
  christmas_gift_box: ["cardboard-white", "cardboard-kraft"],
  sleeve: ["cardboard-kraft"],
  folding_carton: ["cardboard-white", "cardboard-coated"],
  rigid_box: ["cardboard-white", "cardboard-coated"],
  rigid_magnetic_box: ["cardboard-white", "cardboard-coated"],
  rigid_jewellery_box: ["cardboard-white", "cardboard-coated"],
  rigid_cosmetic_box: ["cardboard-white", "cardboard-coated"],
  rigid_magnetic_cosmetic_box: ["cardboard-white", "cardboard-coated"],
  rigid_wine_box: ["cardboard-white", "cardboard-coated"],
  rigid_magnetic_wine_box: ["cardboard-white", "cardboard-coated"],
  rigid_flower_box: ["cardboard-white", "cardboard-coated"],
  rigid_shirt_box: ["cardboard-white", "cardboard-coated"],
  gift_box: ["cardboard-white", "cardboard-coated"],
  paper_bag: ["paper-kraft", "paper-white"],
  cotton_bag: ["cotton-natural", "cotton-white"],
  mesh_bag: ["mesh-recycled"],
  muslin_bag: ["muslin-natural"],
  paper_mailer_bag: ["paper-kraft", "paper-white"],
  poly_mailer_bag: ["poly-white", "poly-black"],
  bio_poly_mailer_bag: ["bio-poly"],
  frosted_ziplock_bag: ["plastic-frosted"],
  stand_up_pouch: ["foil-matte", "foil-glossy"],
  doypack_pouch: ["foil-matte", "foil-glossy", "kraft-lined"],
  compostable_doypack: ["compostable"],
  recyclable_doypack: ["recyclable-mono"],
  doypack_valve: ["foil-matte", "kraft-lined"],
  cup: ["paper-coated-white"],
  smoothie_cup: ["plastic-clear"],
  tube: ["cardboard-kraft", "cardboard-white"],
  tube_metal_lid: ["cardboard-kraft", "cardboard-white"],
  envelope: ["cardboard-kraft", "cardboard-white"],
  corrugated_envelope: ["corrugated-kraft"],
  tissue_paper: ["tissue-white"],
  packing_paper: ["kraft-paper", "newsprint"],
  paper_tape: ["paper-tape-kraft"],
  plastic_tape: ["plastic-tape-clear"],
  water_activated_tape: ["kraft-tape"],
  rectangle_label: ["label-paper", "label-vinyl"],
  circle_label: ["label-paper", "label-vinyl"],
  square_label: ["label-paper", "label-vinyl"],
  labels_sheet: ["label-paper"],
  business_card: ["card-stock-white", "card-stock-kraft"],
  loyalty_card: ["card-stock-white"],
  thank_you_card: ["card-stock-white", "card-stock-kraft"],
  menu_card: ["card-stock-white"],
  ribbon: ["satin-ribbon", "grosgrain-ribbon"],
  stamp_ink_pad: ["rubber-stamp"],
};

export const CATALOGUE_PRODUCTS: CatalogueProduct[] = [
  {
    id: "mailer_box", boxType: "mailer-box", productId: "prod-mailer-box", slug: "custom-mailer-box",
    name: { en: "Custom Mailer Box", ar: "صندوق بريدي مخصص" },
    description: { en: "Self-locking mailer box with tuck flaps", ar: "صندوق بريدي ذاتي الإغلاق" },
    category: "boxes", subcategory: "mailer-boxes", pricingFamily: "box",
    previewFamily: "mailer",
    plannedFamily: "mailer",
    readiness: { preview: "supported", dieline: "supported", pricing: "estimated" },
    moq: 30,
    defaultDimensions: { length: 265, width: 195, height: 60 },
  },
  {
    id: "ecommerce_mailer_box", boxType: "ecommerce-mailer-box", productId: "prod-ecommerce-mailer-box", slug: "custom-ecommerce-mailer-box",
    name: { en: "Custom E-commerce Mailer Box", ar: "صندوق بريدي للتجارة الإلكترونية" },
    description: { en: "Economic mailer box for e-commerce", ar: "صندوق اقتصادي للتجارة الإلكترونية" },
    category: "boxes", subcategory: "mailer-boxes", pricingFamily: "box",
    plannedFamily: "mailer",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 30,
    defaultDimensions: { length: 265, width: 195, height: 60 },
  },
  {
    id: "shipping_box", boxType: "shipping-box", productId: "prod-shipping-box", slug: "custom-shipping-box",
    name: { en: "Custom Shipping Box", ar: "صندوق شحن مخصص" },
    description: { en: "RSC shipping box with flaps", ar: "صندوق شحن بفلابات" },
    category: "boxes", subcategory: "shipping-boxes", pricingFamily: "box",
    previewFamily: "shipping",
    plannedFamily: "shipping",
    readiness: { preview: "in_progress", dieline: "supported", pricing: "estimated" },
    moq: 30,
    defaultDimensions: { length: 300, width: 200, height: 150 },
  },
  {
    id: "snap_lock_box", boxType: "snap-lock-box", productId: "prod-snap-lock-box", slug: "custom-snap-lock-box",
    name: { en: "Custom Snap Lock Product Box", ar: "صندوق منتجات بقفل سريع" },
    description: { en: "Product box with snap lock bottom", ar: "صندوق منتجات بقاع قفل سريع" },
    category: "boxes", subcategory: "product-boxes", pricingFamily: "box",
    plannedFamily: "carton",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 30,
    defaultDimensions: { length: 150, width: 100, height: 200 },
  },
  {
    id: "auto_bottom_box", boxType: "auto-bottom-box", productId: "prod-auto-bottom-box", slug: "custom-auto-bottom-box",
    name: { en: "Custom Auto Bottom Wine Box", ar: "صندوق نبيذ بقاع تلقائي" },
    description: { en: "Auto-lock bottom wine box", ar: "صندوق نبيذ بقاع إغلاق تلقائي" },
    category: "boxes", subcategory: "product-boxes", pricingFamily: "box",
    plannedFamily: "carton",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 30,
    defaultDimensions: { length: 100, width: 100, height: 350 },
  },
  {
    id: "bottle_box", boxType: "bottle-box", productId: "prod-bottle-box", slug: "custom-bottle-box",
    name: { en: "Custom Snap Lock Bottle Box", ar: "صندوق زجاجات بقفل سريع" },
    description: { en: "Bottle box with snap lock", ar: "صندوق زجاجات بقفل سريع" },
    category: "boxes", subcategory: "product-boxes", pricingFamily: "box",
    plannedFamily: "carton",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 30,
    defaultDimensions: { length: 80, width: 80, height: 300 },
  },
  {
    id: "pizza_box", boxType: "pizza-box", productId: "prod-pizza-box", slug: "custom-pizza-box",
    name: { en: "Custom Pizza Box", ar: "صندوق بيتزا مخصص" },
    description: { en: "Hinged lid pizza box", ar: "صندوق بيتزا بغطاء مفصلي" },
    category: "boxes", subcategory: "pizza-boxes", pricingFamily: "box",
    previewFamily: "pizza",
    plannedFamily: "pizza",
    readiness: { preview: "in_progress", dieline: "supported", pricing: "estimated" },
    moq: 30,
    defaultDimensions: { length: 300, width: 300, height: 50 },
  },
  {
    id: "pillow_box", boxType: "pillow-box", productId: "prod-pillow-box", slug: "custom-pillow-box",
    name: { en: "Custom Pillow Box", ar: "صندوق وسادة مخصص" },
    description: { en: "Curved pillow-style gift box", ar: "صندوق هدايا بشكل وسادة" },
    category: "boxes", subcategory: "product-boxes", pricingFamily: "box",
    plannedFamily: "carton",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 30,
    defaultDimensions: { length: 150, width: 100, height: 40 },
  },
  {
    id: "christmas_gift_box", boxType: "christmas-gift-box", productId: "prod-christmas-gift-box", slug: "custom-christmas-gift-box",
    name: { en: "Custom Christmas Gift Mailer Box", ar: "صندوق هدايا الكريسماس" },
    description: { en: "Festive Christmas mailer box", ar: "صندوق بريدي لموسم الكريسماس" },
    category: "boxes", subcategory: "mailer-boxes", pricingFamily: "box",
    plannedFamily: "mailer",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 30,
    defaultDimensions: { length: 265, width: 195, height: 60 },
  },
  {
    id: "sleeve", boxType: "sleeve", productId: "prod-sleeve", slug: "custom-sleeve",
    name: { en: "Plain Mailer Box with Custom Sleeve", ar: "صندوق بريدي مع غلاف مخصص" },
    description: { en: "Mailer box with printed sleeve", ar: "صندوق بريدي مع غلاف مطبوع" },
    category: "boxes", subcategory: "mailer-boxes", pricingFamily: "box",
    plannedFamily: "mailer",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 30,
    defaultDimensions: { length: 265, width: 195, height: 60 },
  },
  {
    id: "folding_carton", boxType: "folding-carton", productId: "prod-product-box", slug: "custom-product-box",
    name: { en: "Custom Product Box with Lid", ar: "صندوق منتجات بغطاء" },
    description: { en: "Tuck-end folding carton", ar: "كرتون قابل للطي" },
    category: "boxes", subcategory: "product-boxes", pricingFamily: "box",
    previewFamily: "carton",
    plannedFamily: "carton",
    readiness: { preview: "in_progress", dieline: "supported", pricing: "estimated" },
    moq: 30,
    defaultDimensions: { length: 150, width: 100, height: 200 },
  },
  {
    id: "rigid_box", boxType: "rigid-box", productId: "prod-rigid-box", slug: "custom-rigid-box",
    name: { en: "Custom Rigid Box", ar: "صندوق صلب مخصص" },
    description: { en: "Premium two-piece rigid box", ar: "صندوق صلب فاخر من قطعتين" },
    category: "boxes", subcategory: "rigid-boxes", pricingFamily: "box",
    previewFamily: "rigid",
    plannedFamily: "rigid",
    readiness: { preview: "in_progress", dieline: "supported", pricing: "estimated" },
    moq: 30,
    defaultDimensions: { length: 200, width: 150, height: 80 },
  },
  {
    id: "rigid_magnetic_box", boxType: "rigid-magnetic-box", productId: "prod-rigid-magnetic-box", slug: "custom-rigid-magnetic-box",
    name: { en: "Custom Rigid Magnetic Gift Box", ar: "صندوق هدايا مغناطيسي" },
    description: { en: "Magnetic closure gift box", ar: "صندوق هدايا بإغلاق مغناطيسي" },
    category: "boxes", subcategory: "rigid-boxes", pricingFamily: "box",
    plannedFamily: "rigid",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 30,
    defaultDimensions: { length: 250, width: 200, height: 100 },
  },
  {
    id: "rigid_jewellery_box", boxType: "rigid-jewellery-box", productId: "prod-rigid-jewellery-box", slug: "custom-rigid-jewellery-box",
    name: { en: "Custom Rigid Jewellery Box with Foam Insert", ar: "صندوق مجوهرات صلب" },
    description: { en: "Jewellery box with foam insert", ar: "صندوق مجوهرات بحشوة فوم" },
    category: "boxes", subcategory: "rigid-boxes", pricingFamily: "box",
    plannedFamily: "rigid",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 30,
    defaultDimensions: { length: 100, width: 100, height: 50 },
  },
  {
    id: "rigid_cosmetic_box", boxType: "rigid-cosmetic-box", productId: "prod-rigid-cosmetic-box", slug: "custom-rigid-cosmetic-box",
    name: { en: "Custom Rigid Cosmetic Box with Lid", ar: "صندوق مستحضرات تجميل صلب" },
    description: { en: "Cosmetic box with lid", ar: "صندوق مستحضرات بغطاء" },
    category: "boxes", subcategory: "rigid-boxes", pricingFamily: "box",
    plannedFamily: "rigid",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 30,
    defaultDimensions: { length: 200, width: 150, height: 60 },
  },
  {
    id: "rigid_magnetic_cosmetic_box", boxType: "rigid-magnetic-cosmetic-box", productId: "prod-rigid-magnetic-cosmetic-box", slug: "custom-rigid-magnetic-cosmetic-box",
    name: { en: "Custom Rigid Magnetic Cosmetic Box", ar: "صندوق مستحضرات مغناطيسي" },
    description: { en: "Magnetic cosmetic box", ar: "صندوق مستحضرات مغناطيسي" },
    category: "boxes", subcategory: "rigid-boxes", pricingFamily: "box",
    plannedFamily: "rigid",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 30,
    defaultDimensions: { length: 200, width: 150, height: 60 },
  },
  {
    id: "rigid_wine_box", boxType: "rigid-wine-box", productId: "prod-rigid-wine-box", slug: "custom-rigid-wine-box",
    name: { en: "Custom Rigid Wine Box with Lid", ar: "صندوق نبيذ صلب بغطاء" },
    description: { en: "Premium wine box", ar: "صندوق نبيذ فاخر" },
    category: "boxes", subcategory: "rigid-boxes", pricingFamily: "box",
    plannedFamily: "rigid",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 30,
    defaultDimensions: { length: 120, width: 120, height: 350 },
  },
  {
    id: "rigid_magnetic_wine_box", boxType: "rigid-magnetic-wine-box", productId: "prod-rigid-magnetic-wine-box", slug: "custom-rigid-magnetic-wine-box",
    name: { en: "Custom Rigid Magnetic Wine Box", ar: "صندوق نبيذ مغناطيسي" },
    description: { en: "Magnetic wine box", ar: "صندوق نبيذ مغناطيسي" },
    category: "boxes", subcategory: "rigid-boxes", pricingFamily: "box",
    plannedFamily: "rigid",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 30,
    defaultDimensions: { length: 120, width: 120, height: 350 },
  },
  {
    id: "rigid_flower_box", boxType: "rigid-flower-box", productId: "prod-rigid-flower-box", slug: "custom-rigid-flower-box",
    name: { en: "Custom Rigid Flower Box with Lid", ar: "صندوق زهور صلب" },
    description: { en: "Flower arrangement box", ar: "صندوق لترتيب الزهور" },
    category: "boxes", subcategory: "rigid-boxes", pricingFamily: "box",
    plannedFamily: "rigid",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 30,
    defaultDimensions: { length: 250, width: 250, height: 150 },
  },
  {
    id: "rigid_shirt_box", boxType: "rigid-shirt-box", productId: "prod-rigid-shirt-box", slug: "custom-rigid-shirt-box",
    name: { en: "Custom Rigid Shirt Box with Lid", ar: "صندوق قمصان صلب" },
    description: { en: "Apparel shirt box", ar: "صندوق للقمصان" },
    category: "boxes", subcategory: "rigid-boxes", pricingFamily: "box",
    plannedFamily: "rigid",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 30,
    defaultDimensions: { length: 400, width: 300, height: 50 },
  },
  {
    id: "gift_box", boxType: "gift-box", productId: "prod-gift-box", slug: "custom-gift-box",
    name: { en: "Custom Rigid Gift Box with Lid", ar: "صندوق هدايا صلب" },
    description: { en: "Premium gift box", ar: "صندوق هدايا فاخر" },
    category: "boxes", subcategory: "rigid-boxes", pricingFamily: "box",
    previewFamily: "rigid",
    plannedFamily: "rigid",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 30,
    defaultDimensions: { length: 250, width: 200, height: 100 },
  },
  {
    id: "paper_bag", boxType: "paper-bag", productId: "prod-paper-bag", slug: "custom-paper-bag",
    name: { en: "Releaf® Custom Paper Bag", ar: "كيس ورقي مخصص" },
    description: { en: "Eco-friendly paper bag with handles", ar: "كيس ورقي صديق للبيئة" },
    category: "bags", subcategory: "carrier-bags", pricingFamily: "bag",
    previewFamily: "bag",
    plannedFamily: "bag",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "estimated" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 250, width: 100, height: 300 },
  },
  {
    id: "cotton_bag", boxType: "cotton-bag", productId: "prod-cotton-bag", slug: "custom-cotton-bag",
    name: { en: "Custom Cotton Bag", ar: "كيس قطني مخصص" },
    description: { en: "Reusable cotton bag", ar: "كيس قطني قابل لإعادة الاستخدام" },
    category: "bags", subcategory: "carrier-bags", pricingFamily: "bag",
    plannedFamily: "bag",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 300, width: 50, height: 400 },
  },
  {
    id: "mesh_bag", boxType: "mesh-bag", productId: "prod-mesh-bag", slug: "custom-mesh-bag",
    name: { en: "Custom Recycled Mesh Drawstring Bag", ar: "كيس شبكي برباط" },
    description: { en: "Recycled mesh drawstring bag", ar: "كيس شبكي من مواد معاد تدويرها" },
    category: "bags", subcategory: "carrier-bags", pricingFamily: "bag",
    plannedFamily: "bag",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 200, width: 50, height: 300 },
  },
  {
    id: "muslin_bag", boxType: "muslin-bag", productId: "prod-muslin-bag", slug: "custom-muslin-bag",
    name: { en: "Custom Muslin Bag", ar: "كيس موسلين مخصص" },
    description: { en: "Cotton muslin drawstring bag", ar: "كيس موسلين قطني" },
    category: "bags", subcategory: "carrier-bags", pricingFamily: "bag",
    plannedFamily: "bag",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 150, width: 30, height: 200 },
  },
  {
    id: "paper_mailer_bag", boxType: "paper-mailer-bag", productId: "prod-paper-mailer-bag", slug: "custom-paper-mailer-bag",
    name: { en: "Custom Paper Mailer Bag", ar: "حقيبة بريد ورقية" },
    description: { en: "Paper mailing bag", ar: "حقيبة بريد ورقية" },
    category: "bags", subcategory: "mailing-bags", pricingFamily: "bag",
    previewFamily: "mailer-bag",
    plannedFamily: "mailer-bag",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 300, width: 10, height: 400 },
  },
  {
    id: "poly_mailer_bag", boxType: "poly-mailer-bag", productId: "prod-poly-mailer", slug: "custom-poly-mailer",
    name: { en: "Custom Poly Mailer Bag", ar: "حقيبة بريد بوليمر" },
    description: { en: "Plastic poly mailer", ar: "حقيبة بريد بلاستيكية" },
    category: "bags", subcategory: "mailing-bags", pricingFamily: "bag",
    previewFamily: "mailer-bag",
    plannedFamily: "mailer-bag",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "estimated" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 300, width: 5, height: 400 },
  },
  {
    id: "bio_poly_mailer_bag", boxType: "bio-poly-mailer-bag", productId: "prod-bio-poly-mailer-bag", slug: "custom-bio-poly-mailer-bag",
    name: { en: "Custom Bio Poly Mailer Bag", ar: "حقيبة بريد حيوية" },
    description: { en: "Biodegradable poly mailer", ar: "حقيبة بريد قابلة للتحلل" },
    category: "bags", subcategory: "mailing-bags", pricingFamily: "bag",
    previewFamily: "mailer-bag",
    plannedFamily: "mailer-bag",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 300, width: 5, height: 400 },
  },
  {
    id: "frosted_ziplock_bag", boxType: "frosted-ziplock-bag", productId: "prod-frosted-ziplock-bag", slug: "custom-frosted-ziplock-bag",
    name: { en: "Custom Frosted Ziplock Bag", ar: "كيس بسحاب شفاف" },
    description: { en: "Frosted ziplock bag", ar: "كيس بسحاب شفاف مجمد" },
    category: "bags", subcategory: "mailing-bags", pricingFamily: "bag",
    plannedFamily: "mailer-bag",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 200, width: 5, height: 300 },
  },
  {
    id: "stand_up_pouch", boxType: "stand-up-pouch", productId: "prod-stand-up-pouch", slug: "custom-stand-up-pouch",
    name: { en: "Stand-Up Pouch with Custom Label", ar: "كيس قائم بملصق مخصص" },
    description: { en: "Stand-up pouch with custom label", ar: "كيس قائم مع ملصق مخصص" },
    category: "pouches", subcategory: "pouches", pricingFamily: "bag",
    previewFamily: "pouch",
    plannedFamily: "pouch",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 100,
    defaultDimensions: { length: 150, width: 50, height: 220 },
  },
  {
    id: "doypack_pouch", boxType: "doypack-pouch", productId: "prod-doypack-pouch", slug: "custom-doypack-pouch",
    name: { en: "Custom Doypack Pouch", ar: "كيس دويباك مخصص" },
    description: { en: "Doypack stand-up pouch", ar: "كيس دويباك قائم" },
    category: "pouches", subcategory: "pouches", pricingFamily: "bag",
    previewFamily: "pouch",
    plannedFamily: "pouch",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 100,
    defaultDimensions: { length: 150, width: 80, height: 220 },
  },
  {
    id: "compostable_doypack", boxType: "compostable-doypack", productId: "prod-compostable-doypack", slug: "custom-compostable-doypack",
    name: { en: "Custom Compostable Doypack Pouch", ar: "كيس دويباك قابل للتحلل" },
    description: { en: "Compostable doypack", ar: "كيس دويباك قابل للتحلل" },
    category: "pouches", subcategory: "pouches", pricingFamily: "bag",
    previewFamily: "pouch",
    plannedFamily: "pouch",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 100,
    defaultDimensions: { length: 150, width: 80, height: 220 },
  },
  {
    id: "recyclable_doypack", boxType: "recyclable-doypack", productId: "prod-recyclable-doypack", slug: "custom-recyclable-doypack",
    name: { en: "Custom Recyclable Doypack Pouch", ar: "كيس دويباك قابل للتدوير" },
    description: { en: "Recyclable doypack", ar: "كيس دويباك قابل لإعادة التدوير" },
    category: "pouches", subcategory: "pouches", pricingFamily: "bag",
    previewFamily: "pouch",
    plannedFamily: "pouch",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 100,
    defaultDimensions: { length: 150, width: 80, height: 220 },
  },
  {
    id: "doypack_valve", boxType: "doypack-valve", productId: "prod-doypack-valve", slug: "custom-doypack-valve",
    name: { en: "Custom Doypack with Degassing Valve", ar: "كيس دويباك بصمام" },
    description: { en: "Coffee pouch with valve", ar: "كيس قهوة بصمام تفريغ" },
    category: "pouches", subcategory: "pouches", pricingFamily: "bag",
    previewFamily: "pouch",
    plannedFamily: "pouch",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 100,
    defaultDimensions: { length: 150, width: 80, height: 220 },
  },
  {
    id: "cup", boxType: "cup", productId: "prod-cup", slug: "custom-cup",
    name: { en: "Custom Paper Cup", ar: "كوب ورقي مخصص" },
    description: { en: "Paper cup for hot/cold drinks", ar: "كوب ورقي للمشروبات" },
    category: "cups-tubes", subcategory: "cups", pricingFamily: "box",
    previewFamily: "cup",
    plannedFamily: "cup",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 100,
    defaultDimensions: { length: 80, width: 90, height: 100 },
  },
  {
    id: "smoothie_cup", boxType: "smoothie-cup", productId: "prod-smoothie-cup", slug: "custom-smoothie-cup",
    name: { en: "Custom Plastic Smoothie Cup", ar: "كوب سموذي بلاستيكي" },
    description: { en: "Clear plastic smoothie cup", ar: "كوب سموذي شفاف" },
    category: "cups-tubes", subcategory: "cups", pricingFamily: "box",
    previewFamily: "cup",
    plannedFamily: "cup",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 100,
    defaultDimensions: { length: 90, width: 100, height: 150 },
  },
  {
    id: "tube", boxType: "tube", productId: "prod-tube", slug: "custom-tube",
    name: { en: "Custom Cardboard Tube Box", ar: "أنبوب كرتوني مخصص" },
    description: { en: "Cardboard tube container", ar: "حاوية أنبوبية كرتونية" },
    category: "cups-tubes", subcategory: "tubes", pricingFamily: "box",
    previewFamily: "tube",
    plannedFamily: "tube",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 100,
    defaultDimensions: { length: 80, width: 80, height: 200 },
  },
  {
    id: "tube_metal_lid", boxType: "tube-metal-lid", productId: "prod-tube-metal-lid", slug: "custom-tube-metal-lid",
    name: { en: "Custom Cardboard Tube Box with Metal Lid", ar: "أنبوب كرتوني بغطاء معدني" },
    description: { en: "Tube with metal cap", ar: "أنبوب بغطاء معدني" },
    category: "cups-tubes", subcategory: "tubes", pricingFamily: "box",
    previewFamily: "tube",
    plannedFamily: "tube",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 100,
    defaultDimensions: { length: 80, width: 80, height: 200 },
  },
  {
    id: "envelope", boxType: "envelope", productId: "prod-envelope", slug: "custom-envelope",
    name: { en: "Custom Cardboard Envelope", ar: "ظرف كرتوني مخصص" },
    description: { en: "Rigid cardboard envelope", ar: "ظرف كرتوني صلب" },
    category: "envelopes", subcategory: "envelopes", pricingFamily: "label",
    previewFamily: "envelope",
    plannedFamily: "envelope",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 350, width: 5, height: 250 },
  },
  {
    id: "corrugated_envelope", boxType: "corrugated-envelope", productId: "prod-corrugated-envelope", slug: "custom-corrugated-envelope",
    name: { en: "Custom Corrugated Envelope", ar: "ظرف مموج مخصص" },
    description: { en: "Corrugated protective envelope", ar: "ظرف مموج للحماية" },
    category: "envelopes", subcategory: "envelopes", pricingFamily: "label",
    previewFamily: "envelope",
    plannedFamily: "envelope",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 350, width: 10, height: 250 },
  },
  {
    id: "tissue_paper", boxType: "tissue-paper", productId: "prod-tissue-paper", slug: "custom-tissue-paper",
    name: { en: "Custom Tissue Paper", ar: "ورق تغليف مخصص" },
    description: { en: "Printed tissue paper", ar: "ورق تغليف مطبوع" },
    category: "paper-tape", subcategory: "wrapping-paper", pricingFamily: "label",
    previewFamily: "flat",
    plannedFamily: "flat",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 500, width: 1, height: 750 },
  },
  {
    id: "packing_paper", boxType: "packing-paper", productId: "prod-packing-paper", slug: "custom-packing-paper",
    name: { en: "Custom Packing Paper", ar: "ورق تعبئة مخصص" },
    description: { en: "Printed packing paper", ar: "ورق تعبئة مطبوع" },
    category: "paper-tape", subcategory: "wrapping-paper", pricingFamily: "label",
    previewFamily: "flat",
    plannedFamily: "flat",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 500, width: 1, height: 700 },
  },
  {
    id: "paper_tape", boxType: "paper-tape", productId: "prod-paper-tape", slug: "custom-paper-tape",
    name: { en: "Custom Paper Adhesive Tape", ar: "شريط لاصق ورقي" },
    description: { en: "Paper packaging tape", ar: "شريط تغليف ورقي" },
    category: "paper-tape", subcategory: "adhesive-tapes", pricingFamily: "label",
    plannedFamily: "label",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 50000, width: 50, height: 1 },
  },
  {
    id: "plastic_tape", boxType: "plastic-tape", productId: "prod-plastic-tape", slug: "custom-plastic-tape",
    name: { en: "Custom Packaging Adhesive Tape", ar: "شريط لاصق بلاستيكي" },
    description: { en: "Plastic packaging tape", ar: "شريط تغليف بلاستيكي" },
    category: "paper-tape", subcategory: "adhesive-tapes", pricingFamily: "label",
    plannedFamily: "label",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 50000, width: 50, height: 1 },
  },
  {
    id: "water_activated_tape", boxType: "water-activated-tape", productId: "prod-water-activated-tape", slug: "custom-water-activated-tape",
    name: { en: "Custom Water-Activated Adhesive Tape", ar: "شريط لاصق منشط بالماء" },
    description: { en: "Water-activated kraft tape", ar: "شريط كرافت منشط بالماء" },
    category: "paper-tape", subcategory: "adhesive-tapes", pricingFamily: "label",
    plannedFamily: "label",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 50000, width: 70, height: 1 },
  },
  {
    id: "rectangle_label", boxType: "rectangle-label", productId: "prod-sticker-label", slug: "custom-label-sticker",
    name: { en: "Custom Rectangle Labels on Roll", ar: "ملصقات مستطيلة على لفة" },
    description: { en: "Rectangle labels on roll", ar: "ملصقات مستطيلة على لفة" },
    category: "labels-stickers", subcategory: "label-stickers", pricingFamily: "label",
    previewFamily: "label",
    plannedFamily: "label",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "estimated" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 25,
    defaultDimensions: { length: 100, width: 1, height: 50 },
  },
  {
    id: "circle_label", boxType: "circle-label", productId: "prod-circle-label", slug: "custom-circle-label",
    name: { en: "Custom Circle Labels on Roll", ar: "ملصقات دائرية على لفة" },
    description: { en: "Circle labels on roll", ar: "ملصقات دائرية على لفة" },
    category: "labels-stickers", subcategory: "label-stickers", pricingFamily: "label",
    previewFamily: "label",
    plannedFamily: "label",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 25,
    defaultDimensions: { length: 50, width: 1, height: 50 },
  },
  {
    id: "square_label", boxType: "square-label", productId: "prod-square-label", slug: "custom-square-label",
    name: { en: "Custom Square Labels on Roll", ar: "ملصقات مربعة على لفة" },
    description: { en: "Square labels on roll", ar: "ملصقات مربعة على لفة" },
    category: "labels-stickers", subcategory: "label-stickers", pricingFamily: "label",
    previewFamily: "label",
    plannedFamily: "label",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 25,
    defaultDimensions: { length: 50, width: 1, height: 50 },
  },
  {
    id: "labels_sheet", boxType: "labels-sheet", productId: "prod-labels-sheet", slug: "custom-labels-sheet",
    name: { en: "Custom Labels on Sheets", ar: "ملصقات على أوراق" },
    description: { en: "Labels on A4 sheets", ar: "ملصقات على أوراق A4" },
    category: "labels-stickers", subcategory: "label-stickers", pricingFamily: "label",
    previewFamily: "label",
    plannedFamily: "flat",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 25,
    defaultDimensions: { length: 297, width: 1, height: 210 },
  },
  {
    id: "business_card", boxType: "business-card", productId: "prod-business-card", slug: "custom-business-card",
    name: { en: "Custom Business Card", ar: "بطاقة عمل مخصصة" },
    description: { en: "Premium business cards", ar: "بطاقات عمل فاخرة" },
    category: "cards", subcategory: "cards", pricingFamily: "label",
    previewFamily: "flat",
    plannedFamily: "flat",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 85, width: 1, height: 55 },
  },
  {
    id: "loyalty_card", boxType: "loyalty-card", productId: "prod-loyalty-card", slug: "custom-loyalty-card",
    name: { en: "Custom Loyalty Card", ar: "بطاقة ولاء مخصصة" },
    description: { en: "Loyalty/stamp cards", ar: "بطاقات ولاء وطوابع" },
    category: "cards", subcategory: "cards", pricingFamily: "label",
    previewFamily: "flat",
    plannedFamily: "flat",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 85, width: 1, height: 55 },
  },
  {
    id: "thank_you_card", boxType: "thank-you-card", productId: "prod-thank-you-card", slug: "custom-thank-you-card",
    name: { en: "Custom \"Thank You\" Card", ar: "بطاقة شكر مخصصة" },
    description: { en: "Thank you insert cards", ar: "بطاقات شكر مرفقة" },
    category: "cards", subcategory: "cards", pricingFamily: "label",
    previewFamily: "flat",
    plannedFamily: "flat",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 100, width: 1, height: 150 },
  },
  {
    id: "menu_card", boxType: "menu-card", productId: "prod-menu-card", slug: "custom-menu-card",
    name: { en: "Custom Menu Card", ar: "بطاقة قائمة مخصصة" },
    description: { en: "Restaurant menu cards", ar: "بطاقات قائمة المطعم" },
    category: "cards", subcategory: "cards", pricingFamily: "label",
    previewFamily: "flat",
    plannedFamily: "flat",
    readiness: { preview: "in_progress", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 50,
    defaultDimensions: { length: 210, width: 1, height: 297 },
  },
  {
    id: "ribbon", boxType: "ribbon", productId: "prod-ribbon", slug: "custom-ribbon",
    name: { en: "Custom Ribbon", ar: "شريط مخصص" },
    description: { en: "Printed ribbon", ar: "شريط مطبوع" },
    category: "accessories", subcategory: "accessories", pricingFamily: "label",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 25,
    defaultDimensions: { length: 10000, width: 25, height: 1 },
  },
  {
    id: "stamp_ink_pad", boxType: "stamp-ink-pad", productId: "prod-stamp-ink-pad", slug: "custom-stamp-ink-pad",
    name: { en: "Custom Stamp with Ink Pad & Bottle", ar: "ختم مخصص مع حبر" },
    description: { en: "Custom rubber stamp", ar: "ختم مطاطي مخصص" },
    category: "accessories", subcategory: "accessories", pricingFamily: "label",
    readiness: { preview: "unavailable", dieline: "deferred", pricing: "quote_required" },
    supportReason: DEFERRED_DIELINE_REASON,
    moq: 25,
    defaultDimensions: { length: 50, width: 50, height: 30 },
  },
]


export function getCatalogueProduct(id: string): CatalogueProduct | undefined {
  return CATALOGUE_PRODUCTS.find((p) => p.id === id)
}

export function getCatalogueProductBySlug(slug: string): CatalogueProduct | undefined {
  return CATALOGUE_PRODUCTS.find((p) => p.slug === slug)
}

export function getCatalogueProductByBoxType(boxType: string): CatalogueProduct | undefined {
  return CATALOGUE_PRODUCTS.find((p) => p.boxType === boxType)
}

/** Expected picker count; guards against silently dropped entries. */
export const CATALOGUE_PRODUCT_COUNT = 55

/** Stable aliases used by the original non-box editor configurations. */
export function canonicalEditorType(type:string){
 const id=type.replace(/-/g,'_')
 return ({poly_mailer:'poly_mailer_bag',label:'rectangle_label',bag:'paper_bag'} as Record<string,string>)[id]??id
}
