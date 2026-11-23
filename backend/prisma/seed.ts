import {loyaltyPreviewStructure} from '../src/modules/catalog/loyalty-preview';
import {thankYouPreviewStructure} from '../src/modules/catalog/thank-you-preview';
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import EGP_RATES from '../src/services/pricing-bootstrap/egp-rates.json';
import {
  CATALOGUE_CATEGORIES,
  CATALOGUE_SUBCATEGORIES,
  CATALOGUE_PRODUCTS,
  CATALOGUE_CANDIDATE_MATERIALS,
} from '../../shared/catalog/products';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create sample materials.
  // unitPrice is EGP per square centimeter, calibrated to Egyptian
  // board prices (testliner ~25-30 EGP/kg; imported white liner higher).
  // surface area in cm2). These codes match every material id/code the
  // frontend sends (editor MATERIAL_TYPES, product pages, pricing config).
  const MATERIALS = EGP_RATES.map((rate) => ({ ...rate, price: rate.unitPrice }));

  const materials = await Promise.all(
    MATERIALS.map((m) =>
      prisma.material.upsert({
        where: { code: m.code },
        update: { unitPrice: m.price, currency: 'EGP', isActive: true },
        create: {
          code: m.code,
          name: m.name,
          unitPrice: m.price,
          currency: 'EGP',
          isActive: true,
          metadata: { source: 'seed' },
        },
      })
    )
  );

  console.log(`Created/updated ${materials.length} materials`);

  // Create sample pricing rules
  const pricingRules = await Promise.all([
    prisma.pricingRule.upsert({
      where: { id: 'default-margin' },
      update: {},
      create: {
        id: 'default-margin',
        productType: 'box',
        ruleType: 'margin',
        value: 0.35, // 35% margin
        isActive: true,
      },
    }),
    prisma.pricingRule.upsert({
      where: { id: 'bag-margin' },
      update: {},
      create: {
        id: 'bag-margin',
        productType: 'bag',
        ruleType: 'margin',
        value: 0.30, // 30% margin
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${pricingRules.length} pricing rules`);

  // Create sample catalog templates. These are the purchasable units in the
  // shop: each maps to a productType the pricing engine supports (box/bag/label)
  // and carries default dimensions + a default material so catalog cards and
  // configurators can price them via POST /api/pricing/calculate.
  const emptyDesign = { version: '6.5.4', objects: [] };
  const TEMPLATES = [
    {
      id: 'tpl-custom-mailer-box',
      name: 'Custom Mailer Box',
      description: 'Customizable mailer box with full-color printing.',
      category: 'business',
      productType: 'box',
      boxType: 'mailer-box',
      // No honest product photo on file — empty thumbnail renders the
      // storefront's neutral Preview placeholder, never a mismatched stock image.
      thumbnail: '',
      tags: ['mailer', 'box', 'ecommerce'],
      defaultMaterial: 'kraft',
      defaultDimensions: { length: 152, width: 102, height: 51, unit: 'mm' },
    },
    {
      id: 'tpl-gift-box',
      name: 'Premium Gift Box',
      description: 'Rigid gift box with a branded lid. Ideal for retail and gifting.',
      category: 'celebration',
      productType: 'box',
      boxType: 'gift-box',
      thumbnail:
        'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&h=600&fit=crop',
      tags: ['gift', 'box', 'retail'],
      defaultMaterial: 'white-kraft',
      defaultDimensions: { length: 200, width: 150, height: 80, unit: 'mm' },
    },
    {
      id: 'tpl-corrugated-shipping-box',
      name: 'Corrugated Shipping Box',
      description: 'Corrugated shipping box for larger loads.',
      category: 'industry-specific',
      productType: 'box',
      boxType: 'shipping-box',
      thumbnail: '',
      tags: ['shipping', 'box', 'corrugated'],
      defaultMaterial: 'cardboard-kraft',
      defaultDimensions: { length: 250, width: 200, height: 150, unit: 'mm' },
    },
    {
      id: 'tpl-eco-kraft-bag',
      // No unverified eco certification in the name or copy.
      name: 'Kraft Bag',
      description: 'Kraft paper bag with custom branding.',
      category: 'business',
      productType: 'bag',
      boxType: undefined,
      thumbnail: '',
      tags: ['bag', 'kraft'],
      defaultMaterial: 'kraft',
      defaultDimensions: { length: 300, width: 200, height: 150, unit: 'mm' },
    },
    {
      id: 'tpl-stand-up-pouch',
      name: 'Stand-up Pouch Bag',
      description: 'Stand-up pouch for food and retail packaging.',
      category: 'food-packaging',
      productType: 'bag',
      boxType: undefined,
      thumbnail: '',
      tags: ['pouch', 'bag', 'food'],
      defaultMaterial: 'cardboard-white',
      defaultDimensions: { length: 180, width: 120, height: 40, unit: 'mm' },
    },
    {
      id: 'tpl-product-label',
      name: 'Custom Product Label',
      description: 'Die-cut product labels with your brand artwork.',
      category: 'business',
      productType: 'label',
      boxType: undefined,
      thumbnail: '',
      tags: ['label', 'sticker'],
      defaultMaterial: 'paper',
      defaultDimensions: { length: 100, width: 100, unit: 'mm' },
    },
  ];

  for (const t of TEMPLATES) {
    await prisma.template.upsert({
      where: { id: t.id },
      update: {
        name: t.name,
        description: t.description,
        category: t.category,
        productType: t.productType,
        boxType: t.boxType,
        thumbnail: t.thumbnail,
        tags: t.tags,
        isPublic: true,
      },
      create: {
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        productType: t.productType,
        boxType: t.boxType,
        thumbnail: t.thumbnail,
        designData: {
          ...emptyDesign,
          metadata: {
            defaultMaterial: t.defaultMaterial,
            defaultDimensions: t.defaultDimensions,
          },
        },
        tags: t.tags,
        isPublic: true,
      },
    });
  }

  console.log(`Created/updated ${TEMPLATES.length} catalog templates`);

  // ============================================================
  // PRODUCT CATALOG (Packhelp-style: category -> subcategory -> product)
  // Each product carries: a set of size presets (ProductVariant), the config
  // options a buyer can pick (ProductOption/ProductOptionValue) and scoped
  // PricingRules (conversion base, margin, quantity discount tiers).
  // ============================================================

  interface CatalogSize {
    code: string;
    name: string;
    length: number;
    width: number;
    height: number;
  }
  interface CatalogDims {
    length: number;
    width: number;
    height: number;
  }
  interface CatalogOptionValue {
    label: string;
    value: string;
    priceDelta?: number;
    priceType?: string;
    appliesTo?: unknown;
    isDefault?: boolean;
    sortOrder?: number;
  }
  interface CatalogOption {
    key: string;
    label: string;
    control: string;
    required?: boolean;
    values: CatalogOptionValue[];
  }
  interface CatalogProductDef {
    id: string;
    subcategoryId: string;
    slug: string;
    name: string;
    shortDescription: string;
    description: string | null;
    productType: string; // "box" | "bag" | "label"
    boxType: string;
    moq: number;
    sizeUnit: string;
    sizes: CatalogSize[];
    minDims: CatalogDims;
    maxDims: CatalogDims;
    priceFrom: number | null; // null => quote on request (no rate card yet)
    thumbnail: string | null;
    gallery: string[];
    ecoFlags: unknown;
    filters: unknown;
    editorDefaults: unknown;
    defaultVariant: {
      materialCode: string;
      color: string;
      printMode: 'none' | 'mono' | 'full_color';
      printSides: 'outside_only' | 'inside_outside';
      finish: string;
    };
    options: CatalogOption[];
    conversion?: number; // base conversion/setup cost per unit (EGP)
    margin?: number; // margin factor (e.g. 0.35 = +35%)
  }

  // Unified classification lives in the canonical registry
  // (shared/catalog/products.ts). The 3 original categories and 8 original
  // subcategories keep their exact ids/slugs/names/sort orders there.
  const CATEGORIES = CATALOGUE_CATEGORIES;
  const SUBCATEGORIES = CATALOGUE_SUBCATEGORIES;

  // Shared pricing tier ladder (factor applies per unit at/above minQuantity).
  // Anchored on each product's MOQ via the first tier below.
  const TIER_LADDER = [
    { min: 100, factor: 0.95 },
    { min: 300, factor: 0.9 },
    { min: 500, factor: 0.85 },
    { min: 1000, factor: 0.8 },
  ];

  // Shared option definitions reused across products where sensible.
  const OPTION_MATERIAL_BOX = {
    key: 'material', label: 'Material', control: 'select', required: true,
    values: [
      { label: 'Kraft (Brown)', value: 'kraft' },
      { label: 'White (Egyptian)', value: 'cardboard-local' },
      { label: 'White (Imported)', value: 'cardboard-white' },
      { label: 'Corrugated Kraft', value: 'corrugated-kraft' },
      { label: 'Corrugated White (Imported)', value: 'corrugated-white' },
      { label: 'White Kraft Board', value: 'white-kraft' },
    ],
  };
  const OPTION_PRINT_COLORS = {
    key: 'printColors', label: 'Print colours', control: 'select', required: true,
    values: [
      { label: 'No print', value: 'none', priceDelta: 0 },
      { label: '1 colour', value: 'mono', priceDelta: 1.2 },
      { label: 'Full colour', value: 'full_color', priceDelta: 2.5, isDefault: true },
    ],
  };
  const OPTION_PRINT_SIDES = {
    key: 'printSides', label: 'Print sides', control: 'select', required: true,
    values: [
      { label: 'Outside only', value: 'outside_only', priceDelta: 0 },
      { label: 'Inside & outside', value: 'inside_outside', priceDelta: 1.5 },
    ],
  };
  const OPTION_FINISH = {
    key: 'finish', label: 'Finish', control: 'select', required: false,
    values: [
      { label: 'None', value: 'none', priceDelta: 0, isDefault: true },
      { label: 'Gloss lamination', value: 'gloss_lamin', priceDelta: 2 },
      { label: 'Matte lamination', value: 'matte_lamin', priceDelta: 2.4 },
      { label: 'Spot UV', value: 'spot_uv', priceDelta: 3 },
      { label: 'Gold foil', value: 'foil_gold', priceDelta: 8 },
      { label: 'Silver foil', value: 'foil_silver', priceDelta: 6.5 },
    ],
  };

  // M7: Backend-issued ProductStructure for the self-locking mailer box.
  // Faces are large-standard mailer panels in mm (base size F42 = 115x70x38).
  // The editor consumes these as the source of truth for surfaces + zones.
  const MAILER_BOX_STRUCTURE = {
    type: 'box',
    brand: 'PackagePro',
    boxType: 'mailer-box',
    defaultSizes: [
      { code: 'f42', label: 'Size F42 (115x70x38)', dims: { length: 115, width: 70, height: 38 } },
      { code: 'f52', label: 'Size F52 (153x102x51)', dims: { length: 153, width: 102, height: 51 } },
      { code: 'f62', label: 'Size F62 (196x127x64)', dims: { length: 196, width: 127, height: 64 } },
      { code: 'f72', label: 'Size F72 (235x140x76)', dims: { length: 235, width: 140, height: 76 } },
    ],
    faces: {
      front: { width: 115, height: 38, depth: 70, label: 'Front Panel' },
      back: { width: 115, height: 38, depth: 70, label: 'Back Panel' },
      left: { width: 70, height: 38, depth: 115, label: 'Left Panel' },
      right: { width: 70, height: 38, depth: 115, label: 'Right Panel' },
      top: { width: 115, height: 70, depth: 38, label: 'Top Flap' },
      bottom: { width: 115, height: 70, depth: 38, label: 'Bottom Panel' },
      inside_front: { width: 115, height: 38, depth: 70, label: 'Inside Front' },
      inside_back: { width: 115, height: 38, depth: 70, label: 'Inside Back' },
      inside_left: { width: 70, height: 38, depth: 115, label: 'Inside Left' },
      inside_right: { width: 70, height: 38, depth: 115, label: 'Inside Right' },
      inside_top: { width: 115, height: 70, depth: 38, label: 'Inside Top Flap' },
      inside_bottom: { width: 115, height: 70, depth: 38, label: 'Inside Bottom' },
    },
    zones: {
      front: [
        { label: 'Brand Logo', required: true, position: [57.5, 15, 0] },
        { label: 'Headline', required: false, position: [40, 27, 0] },
      ],
      back: [{ label: 'Product Info', required: false, position: [57.5, 16, 0] }],
      top: [{ label: 'Brand Mark', required: false, position: [57.5, 35, 0] }],
      left: [], right: [], bottom: [],
      inside_front: [], inside_back: [], inside_left: [], inside_right: [], inside_top: [], inside_bottom: [],
    },
    rules: {
      moq: 30,
      printing: {
        outside: {
          modes: ['none', 'mono', 'full_color'],
          sides: [1],
          labels: { none: 'No print', mono: '1 colour', full_color: 'Full colour' },
        },
        inside: true,
      },
      finishing: {
        lamination: ['gloss_lamin', 'matte_lamin'],
        coating: [],
        foil: ['foil_gold', 'foil_silver'],
        emboss: false,
        spotUV: true,
      },
      printSides: [1, 2],
      materialOptions: [
        { code: 'kraft', label: 'Kraft Board' },
        { code: 'white-kraft', label: 'White Kraft Board' },
        { code: 'cardboard-kraft', label: 'Kraft Cardboard' },
        { code: 'corrugated-kraft', label: 'Corrugated Kraft' },
        { code: 'cardboard-white', label: 'White Glossy (Imported)' },
      ],
      dimensionConstraints: { unit: 'mm', min: [20, 20, 10], max: [600, 500, 400] },
    },
    boxTypeOptions: [{ value: 'mailer-box', label: 'Mailer Box' }],
    editorFields: ['size', 'material', 'print', 'finish', 'lamination', 'foil', 'quantity'],
  };

  // Business card: a single flat sheet with two printable sides. The
  // structure carries exactly the front and back faces — each the full
  // card (85x55mm at the catalogue default size, 1mm sheet axis) — so the
  // editor's face list, 2D canvas and 3D flat preview all work on the
  // card's real faces instead of a six-face box set. This is a preview
  // structure, not a production dieline: no blueprint is attached and
  // the product's support flag stays deferred (see its catalogue entry).
  const BUSINESS_CARD_STRUCTURE = {
    type: 'flat',
    brand: 'PackagePro',
    boxType: 'business-card',
    defaultSizes: [
      { code: 'default', label: 'Business Card (85x55)', dims: { length: 85, width: 1, height: 55 } },
    ],
    faces: {
      front: { width: 85, height: 55, depth: 1, label: 'Front' },
      back: { width: 85, height: 55, depth: 1, label: 'Back' },
    },
    zones: { front: [], back: [] },
  };

  // M8-B: Canonical packaging blueprint — dieline template for the mailer
  // (M8_SPEC §7 §8). JSON-only; no path/bezier geometry (the M8-C engine
  // derives paths from this template). F42 115x70x38mm: body row
  // left|front|right|back, top lid above front, bottom panel below front,
  // glue flaps on the short-side panels. Adjacency is encoded via the `to`
  // target on fold/glue edges.
  const MAILER_DIELINE_TEMPLATE = {
    schemaVersion: 1,
    boxType: 'mailer-box',
    faceOrder: ['left', 'front', 'right', 'back', 'top', 'bottom'],
    panels: {
      left: {
        faceId: 'left',
        x: 0, y: 70, w: 70, h: 38,
        rotation: 0,
        edges: {
          top: { class: 'glue', to: 'glue_flap' },
          right: { class: 'fold', to: 'front' },
          bottom: { class: 'glue', to: 'glue_flap' },
          left: { class: 'cut' },
        },
      },
      front: {
        faceId: 'front',
        x: 70, y: 70, w: 115, h: 38,
        rotation: 0,
        edges: {
          top: { class: 'fold', to: 'top' },
          right: { class: 'fold', to: 'right' },
          bottom: { class: 'fold', to: 'bottom' },
          left: { class: 'fold', to: 'left' },
        },
      },
      right: {
        faceId: 'right',
        x: 185, y: 70, w: 70, h: 38,
        rotation: 0,
        edges: {
          top: { class: 'glue', to: 'glue_flap' },
          right: { class: 'fold', to: 'back' },
          bottom: { class: 'glue', to: 'glue_flap' },
          left: { class: 'fold', to: 'front' },
        },
      },
      back: {
        faceId: 'back',
        x: 255, y: 70, w: 115, h: 38,
        rotation: 0,
        edges: {
          top: { class: 'cut' },
          right: { class: 'glue', to: 'left' },
          bottom: { class: 'cut' },
          left: { class: 'fold', to: 'right' },
        },
      },
      top: {
        faceId: 'top',
        x: 70, y: 0, w: 115, h: 70,
        rotation: 0,
        edges: {
          top: { class: 'cut' },
          right: { class: 'cut' },
          bottom: { class: 'fold', to: 'front' },
          left: { class: 'cut' },
        },
      },
      bottom: {
        faceId: 'bottom',
        x: 70, y: 108, w: 115, h: 70,
        rotation: 0,
        edges: {
          top: { class: 'fold', to: 'front' },
          right: { class: 'cut' },
          bottom: { class: 'cut' },
          left: { class: 'cut' },
        },
      },
      inside_front: {
        faceId: 'inside_front',
        x: 70, y: 70, w: 115, h: 38,
        rotation: 0,
        edges: {},
      },
      inside_back: {
        faceId: 'inside_back',
        x: 255, y: 70, w: 115, h: 38,
        rotation: 0,
        edges: {},
      },
      inside_left: {
        faceId: 'inside_left',
        x: 0, y: 70, w: 70, h: 38,
        rotation: 0,
        edges: {},
      },
      inside_right: {
        faceId: 'inside_right',
        x: 185, y: 70, w: 70, h: 38,
        rotation: 0,
        edges: {},
      },
      inside_top: {
        faceId: 'inside_top',
        x: 70, y: 0, w: 115, h: 70,
        rotation: 0,
        edges: {},
      },
      inside_bottom: {
        faceId: 'inside_bottom',
        x: 70, y: 108, w: 115, h: 70,
        rotation: 0,
        edges: {},
      },
    },
    outline: { w: 370, h: 178 },
  };

  // M8-J (spec §14): product coverage completion. Canonical mm structures +
  // dieline templates for the four M8-required box products (weighing-machine
  // folding carton, corrugated shipping box, two-piece rigid box, single-piece
  // pizza box). All panels are sized by the strict `facePanel(dims, faceId)`
  // mapping and positioned as a flat (non-overlapping) make-ready blank at the
  // product's default size. Deferral markers (support:"deferred") live on the
  // non-box products below — no fake geometry is ever shipped.

  const FOLDING_CARTON_STRUCTURE = {
    type: 'box',
    brand: 'PackagePro',
    boxType: 'folding-carton',
    defaultSizes: [
      { code: 's', label: 'Small (100x60x30)', dims: { length: 100, width: 60, height: 30 } },
      { code: 'm', label: 'Medium (150x100x50)', dims: { length: 150, width: 100, height: 50 } },
      { code: 'l', label: 'Large (200x150x80)', dims: { length: 200, width: 150, height: 80 } },
    ],
    faces: {
      front: { width: 150, height: 50, depth: 100, label: 'Front Panel' },
      back: { width: 150, height: 50, depth: 100, label: 'Back Panel' },
      left: { width: 100, height: 50, depth: 150, label: 'Left Panel' },
      right: { width: 100, height: 50, depth: 150, label: 'Right Panel' },
      top: { width: 150, height: 100, depth: 50, label: 'Top Flap' },
      bottom: { width: 150, height: 100, depth: 50, label: 'Bottom Panel' },
      inside_front: { width: 150, height: 50, depth: 100, label: 'Inside Front' },
      inside_back: { width: 150, height: 50, depth: 100, label: 'Inside Back' },
      inside_left: { width: 100, height: 50, depth: 150, label: 'Inside Left' },
      inside_right: { width: 100, height: 50, depth: 150, label: 'Inside Right' },
      inside_top: { width: 150, height: 100, depth: 50, label: 'Inside Top Flap' },
      inside_bottom: { width: 150, height: 100, depth: 50, label: 'Inside Bottom' },
    },
    zones: {
      front: [
        { label: 'Brand Logo', required: true, position: [75, 15, 0] },
        { label: 'Headline', required: false, position: [50, 30, 0] },
      ],
      back: [{ label: 'Product Info', required: false, position: [75, 16, 0] }],
      top: [{ label: 'Brand Mark', required: false, position: [75, 50, 0] }],
      left: [], right: [], bottom: [],
      inside_front: [], inside_back: [], inside_left: [], inside_right: [], inside_top: [], inside_bottom: [],
    },
    rules: {
      moq: 30,
      printing: {
        outside: {
          modes: ['none', 'mono', 'full_color'],
          sides: [1],
          labels: { none: 'No print', mono: '1 colour', full_color: 'Full colour' },
        },
        inside: true,
      },
      finishing: {
        lamination: ['gloss_lamin', 'matte_lamin'],
        coating: [],
        foil: ['foil_gold', 'foil_silver'],
        emboss: false,
        spotUV: true,
      },
      printSides: [1, 2],
      materialOptions: [
        { code: 'kraft', label: 'Kraft Board' },
        { code: 'white-kraft', label: 'White Kraft Board' },
        { code: 'cardboard-kraft', label: 'Kraft Cardboard' },
        { code: 'corrugated-kraft', label: 'Corrugated Kraft' },
        { code: 'cardboard-white', label: 'White Glossy (Imported)' },
      ],
      dimensionConstraints: { unit: 'mm', min: [30, 20, 10], max: [400, 300, 200] },
    },
    boxTypeOptions: [{ value: 'folding-carton', label: 'Folding Carton' }],
    editorFields: ['size', 'material', 'print', 'finish', 'lamination', 'foil', 'quantity'],
  };

  // M8-J folding-carton dieline — Medium 150x100x50mm. Weighing-machine box:
  // body row left|front|right|back with side/bottom glue flaps (front edges
  // fold between the four walls, glue along the wall tops/bottoms), full-width
  // top & bottom flaps attached to the front panel, inside mirrors coincident
  // for 2-side print. Flat blank fits 700x250mm with no panel overlap.
  const FOLDING_CARTON_DIELINE_TEMPLATE = {
    schemaVersion: 1,
    boxType: 'folding-carton',
    faceOrder: ['left', 'front', 'right', 'back', 'top', 'bottom'],
    panels: {
      left: {
        faceId: 'left',
        x: 200, y: 100, w: 100, h: 50,
        rotation: 0,
        edges: {
          top: { class: 'glue', to: 'glue_flap' },
          right: { class: 'fold', to: 'front' },
          bottom: { class: 'glue', to: 'glue_flap' },
          left: { class: 'cut' },
        },
      },
      front: {
        faceId: 'front',
        x: 300, y: 100, w: 150, h: 50,
        rotation: 0,
        edges: {
          top: { class: 'fold', to: 'top' },
          right: { class: 'fold', to: 'right' },
          bottom: { class: 'fold', to: 'bottom' },
          left: { class: 'fold', to: 'left' },
        },
      },
      right: {
        faceId: 'right',
        x: 450, y: 100, w: 100, h: 50,
        rotation: 0,
        edges: {
          top: { class: 'glue', to: 'glue_flap' },
          right: { class: 'fold', to: 'back' },
          bottom: { class: 'glue', to: 'glue_flap' },
          left: { class: 'fold', to: 'front' },
        },
      },
      back: {
        faceId: 'back',
        x: 550, y: 100, w: 150, h: 50,
        rotation: 0,
        edges: {
          top: { class: 'cut' },
          right: { class: 'glue', to: 'left' },
          bottom: { class: 'cut' },
          left: { class: 'fold', to: 'right' },
        },
      },
      top: {
        faceId: 'top',
        x: 300, y: 0, w: 150, h: 100,
        rotation: 0,
        edges: {
          top: { class: 'cut' },
          right: { class: 'cut' },
          bottom: { class: 'fold', to: 'front' },
          left: { class: 'cut' },
        },
      },
      bottom: {
        faceId: 'bottom',
        x: 300, y: 150, w: 150, h: 100,
        rotation: 0,
        edges: {
          top: { class: 'fold', to: 'front' },
          right: { class: 'cut' },
          bottom: { class: 'cut' },
          left: { class: 'cut' },
        },
      },
      inside_front: {
        faceId: 'inside_front',
        x: 300, y: 100, w: 150, h: 50,
        rotation: 0,
        edges: {},
      },
      inside_back: {
        faceId: 'inside_back',
        x: 550, y: 100, w: 150, h: 50,
        rotation: 0,
        edges: {},
      },
      inside_left: {
        faceId: 'inside_left',
        x: 200, y: 100, w: 100, h: 50,
        rotation: 0,
        edges: {},
      },
      inside_right: {
        faceId: 'inside_right',
        x: 450, y: 100, w: 100, h: 50,
        rotation: 0,
        edges: {},
      },
      inside_top: {
        faceId: 'inside_top',
        x: 300, y: 0, w: 150, h: 100,
        rotation: 0,
        edges: {},
      },
      inside_bottom: {
        faceId: 'inside_bottom',
        x: 300, y: 150, w: 150, h: 100,
        rotation: 0,
        edges: {},
      },
    },
    outline: { w: 700, h: 250 },
  };

  const SHIPPING_BOX_STRUCTURE = {
    type: 'box',
    brand: 'PackagePro',
    boxType: 'shipping-box',
    defaultSizes: [
      { code: 's', label: 'Small (250x200x150)', dims: { length: 250, width: 200, height: 150 } },
      { code: 'm', label: 'Medium (400x300x250)', dims: { length: 400, width: 300, height: 250 } },
      { code: 'l', label: 'Large (600x400x400)', dims: { length: 600, width: 400, height: 400 } },
      { code: 'xl', label: 'XL (800x600x600)', dims: { length: 800, width: 600, height: 600 } },
    ],
    faces: {
      front: { width: 400, height: 250, depth: 300, label: 'Front Panel' },
      back: { width: 400, height: 250, depth: 300, label: 'Back Panel' },
      left: { width: 300, height: 250, depth: 400, label: 'Left Panel' },
      right: { width: 300, height: 250, depth: 400, label: 'Right Panel' },
      top: { width: 400, height: 300, depth: 250, label: 'Top Flap' },
      bottom: { width: 400, height: 300, depth: 250, label: 'Bottom Panel' },
      inside_front: { width: 400, height: 250, depth: 300, label: 'Inside Front' },
      inside_back: { width: 400, height: 250, depth: 300, label: 'Inside Back' },
      inside_left: { width: 300, height: 250, depth: 400, label: 'Inside Left' },
      inside_right: { width: 300, height: 250, depth: 400, label: 'Inside Right' },
      inside_top: { width: 400, height: 300, depth: 250, label: 'Inside Top Flap' },
      inside_bottom: { width: 400, height: 300, depth: 250, label: 'Inside Bottom' },
    },
    zones: {
      front: [
        { label: 'Brand Logo', required: true, position: [160, 90, 0] },
        { label: 'Headline', required: false, position: [120, 150, 0] },
      ],
      back: [{ label: 'Product Info', required: false, position: [200, 90, 0] }],
      top: [{ label: 'Brand Mark', required: false, position: [200, 150, 0] }],
      left: [], right: [], bottom: [],
      inside_front: [], inside_back: [], inside_left: [], inside_right: [], inside_top: [], inside_bottom: [],
    },
    rules: {
      moq: 30,
      printing: {
        outside: {
          modes: ['none', 'mono', 'full_color'],
          sides: [1],
          labels: { none: 'No print', mono: '1 colour', full_color: 'Full colour' },
        },
        inside: true,
      },
      finishing: {
        lamination: ['gloss_lamin'],
        coating: [],
        foil: [],
        emboss: false,
        spotUV: false,
      },
      printSides: [1, 2],
      materialOptions: [
        { code: 'cardboard-kraft', label: 'Kraft Cardboard' },
        { code: 'corrugated-kraft', label: 'Corrugated Kraft' },
        { code: 'kraft', label: 'Kraft Board' },
        { code: 'white-kraft', label: 'White Kraft Board' },
      ],
      dimensionConstraints: { unit: 'mm', min: [100, 100, 50], max: [1200, 800, 800] },
    },
    boxTypeOptions: [{ value: 'shipping-box', label: 'Shipping Box' }],
    editorFields: ['size', 'material', 'print', 'finish', 'lamination', 'quantity'],
  };

  // M8-J shipping-box dieline — Medium 400x300x250mm. RSC-style: body row
  // left|front|right|back (corrugated flute B), full-width top & bottom flaps
  // hinged on the front panel, final closing glue seam back→left. Flat blank
  // fits 1400x850mm with no panel overlap.
  const SHIPPING_BOX_DIELINE_TEMPLATE = {
    schemaVersion: 1,
    boxType: 'shipping-box',
    faceOrder: ['left', 'front', 'right', 'back', 'top', 'bottom'],
    panels: {
      left: {
        faceId: 'left',
        x: 0, y: 300, w: 300, h: 250,
        rotation: 0,
        edges: {
          top: { class: 'fold', to: 'top' },
          right: { class: 'fold', to: 'front' },
          bottom: { class: 'fold', to: 'bottom' },
          left: { class: 'cut' },
        },
      },
      front: {
        faceId: 'front',
        x: 300, y: 300, w: 400, h: 250,
        rotation: 0,
        edges: {
          top: { class: 'fold', to: 'top' },
          right: { class: 'fold', to: 'right' },
          bottom: { class: 'fold', to: 'bottom' },
          left: { class: 'fold', to: 'left' },
        },
      },
      right: {
        faceId: 'right',
        x: 700, y: 300, w: 300, h: 250,
        rotation: 0,
        edges: {
          top: { class: 'fold', to: 'top' },
          right: { class: 'fold', to: 'back' },
          bottom: { class: 'fold', to: 'bottom' },
          left: { class: 'fold', to: 'front' },
        },
      },
      back: {
        faceId: 'back',
        x: 1000, y: 300, w: 400, h: 250,
        rotation: 0,
        edges: {
          top: { class: 'fold', to: 'top' },
          right: { class: 'glue', to: 'left' },
          bottom: { class: 'fold', to: 'bottom' },
          left: { class: 'fold', to: 'right' },
        },
      },
      top: {
        faceId: 'top',
        x: 300, y: 0, w: 400, h: 300,
        rotation: 0,
        edges: {
          top: { class: 'cut' },
          right: { class: 'cut' },
          bottom: { class: 'fold', to: 'front' },
          left: { class: 'cut' },
        },
      },
      bottom: {
        faceId: 'bottom',
        x: 300, y: 550, w: 400, h: 300,
        rotation: 0,
        edges: {
          top: { class: 'fold', to: 'front' },
          right: { class: 'cut' },
          bottom: { class: 'cut' },
          left: { class: 'cut' },
        },
      },
      inside_front: {
        faceId: 'inside_front',
        x: 300, y: 300, w: 400, h: 250,
        rotation: 0,
        edges: {},
      },
      inside_back: {
        faceId: 'inside_back',
        x: 1000, y: 300, w: 400, h: 250,
        rotation: 0,
        edges: {},
      },
      inside_left: {
        faceId: 'inside_left',
        x: 0, y: 300, w: 300, h: 250,
        rotation: 0,
        edges: {},
      },
      inside_right: {
        faceId: 'inside_right',
        x: 700, y: 300, w: 300, h: 250,
        rotation: 0,
        edges: {},
      },
      inside_top: {
        faceId: 'inside_top',
        x: 300, y: 0, w: 400, h: 300,
        rotation: 0,
        edges: {},
      },
      inside_bottom: {
        faceId: 'inside_bottom',
        x: 300, y: 550, w: 400, h: 300,
        rotation: 0,
        edges: {},
      },
    },
    outline: { w: 1400, h: 850 },
  };

  const RIGID_BOX_STRUCTURE = {
    type: 'box',
    brand: 'PackagePro',
    boxType: 'rigid-box',
    defaultSizes: [
      { code: 's', label: 'Small (200x150x50)', dims: { length: 200, width: 150, height: 50 } },
      { code: 'm', label: 'Medium (250x180x60)', dims: { length: 250, width: 180, height: 60 } },
      { code: 'l', label: 'Large (300x220x80)', dims: { length: 300, width: 220, height: 80 } },
    ],
    faces: {
      front: { width: 250, height: 60, depth: 180, label: 'Front Wall' },
      back: { width: 250, height: 60, depth: 180, label: 'Back Wall' },
      left: { width: 180, height: 60, depth: 250, label: 'Left Wall' },
      right: { width: 180, height: 60, depth: 250, label: 'Right Wall' },
      top: { width: 250, height: 180, depth: 60, label: 'Lid Board' },
      bottom: { width: 250, height: 180, depth: 60, label: 'Base Board' },
      inside_front: { width: 250, height: 60, depth: 180, label: 'Lid Front Wall' },
      inside_back: { width: 250, height: 60, depth: 180, label: 'Lid Back Wall' },
      inside_left: { width: 180, height: 60, depth: 250, label: 'Lid Left Wall' },
      inside_right: { width: 180, height: 60, depth: 250, label: 'Lid Right Wall' },
      inside_top: { width: 250, height: 180, depth: 60, label: 'Inside Lid Board' },
      inside_bottom: { width: 250, height: 180, depth: 60, label: 'Inside Base Board' },
    },
    zones: {
      front: [
        { label: 'Brand Logo', required: true, position: [60, 20, 0] },
        { label: 'Headline', required: false, position: [40, 38, 0] },
      ],
      back: [{ label: 'Product Info', required: false, position: [125, 20, 0] }],
      top: [{ label: 'Brand Mark', required: false, position: [125, 90, 0] }],
      left: [], right: [], bottom: [],
      inside_front: [], inside_back: [], inside_left: [], inside_right: [], inside_top: [], inside_bottom: [],
    },
    rules: {
      moq: 30,
      printing: {
        outside: {
          modes: ['none', 'mono', 'full_color'],
          sides: [1],
          labels: { none: 'No print', mono: '1 colour', full_color: 'Full colour' },
        },
        inside: true,
      },
      finishing: {
        lamination: ['gloss_lamin', 'matte_lamin'],
        coating: [],
        foil: ['foil_gold', 'foil_silver'],
        emboss: false,
        spotUV: true,
      },
      printSides: [1, 2],
      materialOptions: [
        { code: 'chipboard', label: 'Chipboard' },
        { code: 'cardboard-white', label: 'White Glossy (Imported)' },
        { code: 'kraft_liner', label: 'Kraft Liner' },
        { code: 'corrugated-kraft', label: 'Corrugated Kraft' },
      ],
      dimensionConstraints: { unit: 'mm', min: [100, 80, 30], max: [600, 500, 200] },
    },
    boxTypeOptions: [{ value: 'rigid-box', label: 'Rigid Box' }],
    editorFields: ['size', 'material', 'print', 'finish', 'lamination', 'foil', 'quantity'],
  };

  // M8-J rigid-box dieline — Medium 250x180x60mm. Two-piece blank: a base
  // tray (bottom + 4 walls) and a lid tray (lid board + 4 wall boards). Rigid
  // boards are die-cut and glued, not creased, so every physical board carries
  // cut edges only; the inside_* mirror boards overlay the base/lid boards for
  // 2-side print. No overlap across both trays (960x420mm sheet).
  const RIGID_BOX_DIELINE_TEMPLATE = {
    schemaVersion: 1,
    boxType: 'rigid-box',
    faceOrder: ['left', 'front', 'right', 'back', 'top', 'bottom'],
    panels: {
      back: {
        faceId: 'back',
        x: 0, y: 0, w: 250, h: 60,
        rotation: 0,
        edges: { top: { class: 'cut' }, right: { class: 'cut' }, bottom: { class: 'cut' }, left: { class: 'cut' } },
      },
      left: {
        faceId: 'left',
        x: 260, y: 0, w: 180, h: 60,
        rotation: 0,
        edges: { top: { class: 'cut' }, right: { class: 'cut' }, bottom: { class: 'cut' }, left: { class: 'cut' } },
      },
      bottom: {
        faceId: 'bottom',
        x: 0, y: 120, w: 250, h: 180,
        rotation: 0,
        edges: { top: { class: 'cut' }, right: { class: 'cut' }, bottom: { class: 'cut' }, left: { class: 'cut' } },
      },
      front: {
        faceId: 'front',
        x: 0, y: 300, w: 250, h: 60,
        rotation: 0,
        edges: { top: { class: 'cut' }, right: { class: 'cut' }, bottom: { class: 'cut' }, left: { class: 'cut' } },
      },
      right: {
        faceId: 'right',
        x: 260, y: 360, w: 180, h: 60,
        rotation: 0,
        edges: { top: { class: 'cut' }, right: { class: 'cut' }, bottom: { class: 'cut' }, left: { class: 'cut' } },
      },
      top: {
        faceId: 'top',
        x: 520, y: 120, w: 250, h: 180,
        rotation: 0,
        edges: { top: { class: 'cut' }, right: { class: 'cut' }, bottom: { class: 'cut' }, left: { class: 'cut' } },
      },
      inside_back: {
        faceId: 'inside_back',
        x: 520, y: 0, w: 250, h: 60,
        rotation: 0,
        edges: {},
      },
      inside_front: {
        faceId: 'inside_front',
        x: 520, y: 300, w: 250, h: 60,
        rotation: 0,
        edges: {},
      },
      inside_left: {
        faceId: 'inside_left',
        x: 780, y: 0, w: 180, h: 60,
        rotation: 0,
        edges: {},
      },
      inside_right: {
        faceId: 'inside_right',
        x: 780, y: 360, w: 180, h: 60,
        rotation: 0,
        edges: {},
      },
      inside_top: {
        faceId: 'inside_top',
        x: 520, y: 120, w: 250, h: 180,
        rotation: 0,
        edges: {},
      },
      inside_bottom: {
        faceId: 'inside_bottom',
        x: 0, y: 120, w: 250, h: 180,
        rotation: 0,
        edges: {},
      },
    },
    outline: { w: 960, h: 420 },
  };

  const PIZZA_BOX_STRUCTURE = {
    type: 'box',
    brand: 'PackagePro',
    boxType: 'pizza-box',
    defaultSizes: [
      { code: 's', label: 'Small (25x25x4)', dims: { length: 250, width: 250, height: 40 } },
      { code: 'm', label: 'Medium (33x33x4.5)', dims: { length: 330, width: 330, height: 45 } },
      { code: 'l', label: 'Large (40x40x5)', dims: { length: 400, width: 400, height: 50 } },
    ],
    faces: {
      front: { width: 330, height: 45, depth: 330, label: 'Front Panel' },
      back: { width: 330, height: 45, depth: 330, label: 'Back Panel' },
      left: { width: 330, height: 45, depth: 330, label: 'Left Panel' },
      right: { width: 330, height: 45, depth: 330, label: 'Right Panel' },
      top: { width: 330, height: 330, depth: 45, label: 'Deck Board' },
      bottom: { width: 330, height: 330, depth: 45, label: 'Lid Board' },
      inside_front: { width: 330, height: 45, depth: 330, label: 'Inside Front' },
      inside_back: { width: 330, height: 45, depth: 330, label: 'Inside Back' },
      inside_left: { width: 330, height: 45, depth: 330, label: 'Inside Left' },
      inside_right: { width: 330, height: 45, depth: 330, label: 'Inside Right' },
      inside_top: { width: 330, height: 330, depth: 45, label: 'Inside Deck' },
      inside_bottom: { width: 330, height: 330, depth: 45, label: 'Inside Lid' },
    },
    zones: {
      front: [
        { label: 'Brand Logo', required: true, position: [165, 12, 0] },
        { label: 'Headline', required: false, position: [120, 25, 0] },
      ],
      back: [{ label: 'Product Info', required: false, position: [165, 12, 0] }],
      top: [{ label: 'Brand Mark', required: false, position: [165, 120, 0] }],
      left: [], right: [], bottom: [],
      inside_front: [], inside_back: [], inside_left: [], inside_right: [], inside_top: [], inside_bottom: [],
    },
    rules: {
      moq: 30,
      printing: {
        outside: {
          modes: ['none', 'mono', 'full_color'],
          sides: [1],
          labels: { none: 'No print', mono: '1 colour', full_color: 'Full colour' },
        },
        inside: true,
      },
      finishing: {
        lamination: ['matte_lamin'],
        coating: [],
        foil: [],
        emboss: false,
        spotUV: false,
      },
      printSides: [1, 2],
      materialOptions: [
        { code: 'corrugated-kraft', label: 'Corrugated Kraft' },
        { code: 'kraft', label: 'Kraft Board' },
        { code: 'corrugated-white', label: 'Corrugated White' },
        { code: 'cardboard-white', label: 'White Glossy (Imported)' },
      ],
      dimensionConstraints: { unit: 'mm', min: [200, 200, 20], max: [600, 600, 100] },
    },
    boxTypeOptions: [{ value: 'pizza-box', label: 'Pizza Box' }],
    editorFields: ['size', 'material', 'print', 'finish', 'lamination', 'quantity'],
  };

  // M8-J pizza-box dieline — Medium 330x330x45mm. Single-piece cruciform
  // blank: lid board with a hinged back panel leading to the deck board, and
  // front/left/right walls folding up around the deck. Flat blank fits
  // 990x750mm with no panel overlap.
  const PIZZA_BOX_DIELINE_TEMPLATE = {
    schemaVersion: 1,
    boxType: 'pizza-box',
    faceOrder: ['left', 'front', 'right', 'back', 'top', 'bottom'],
    panels: {
      bottom: {
        faceId: 'bottom',
        x: 330, y: 0, w: 330, h: 330,
        rotation: 0,
        edges: { top: { class: 'cut' }, right: { class: 'cut' }, bottom: { class: 'cut' }, left: { class: 'cut' } },
      },
      back: {
        faceId: 'back',
        x: 330, y: 330, w: 330, h: 45,
        rotation: 0,
        edges: {
          top: { class: 'fold', to: 'bottom' },
          right: { class: 'cut' },
          bottom: { class: 'fold', to: 'top' },
          left: { class: 'cut' },
        },
      },
      top: {
        faceId: 'top',
        x: 330, y: 375, w: 330, h: 330,
        rotation: 0,
        edges: {
          top: { class: 'fold', to: 'back' },
          right: { class: 'fold', to: 'right' },
          bottom: { class: 'fold', to: 'front' },
          left: { class: 'fold', to: 'left' },
        },
      },
      front: {
        faceId: 'front',
        x: 330, y: 705, w: 330, h: 45,
        rotation: 0,
        edges: {
          top: { class: 'fold', to: 'top' },
          right: { class: 'cut' },
          bottom: { class: 'cut' },
          left: { class: 'cut' },
        },
      },
      left: {
        faceId: 'left',
        x: 0, y: 375, w: 330, h: 45,
        rotation: 0,
        edges: {
          top: { class: 'cut' },
          right: { class: 'fold', to: 'top' },
          bottom: { class: 'cut' },
          left: { class: 'cut' },
        },
      },
      right: {
        faceId: 'right',
        x: 660, y: 375, w: 330, h: 45,
        rotation: 0,
        edges: {
          top: { class: 'cut' },
          right: { class: 'cut' },
          bottom: { class: 'cut' },
          left: { class: 'fold', to: 'top' },
        },
      },
      inside_front: {
        faceId: 'inside_front',
        x: 330, y: 705, w: 330, h: 45,
        rotation: 0,
        edges: {},
      },
      inside_back: {
        faceId: 'inside_back',
        x: 330, y: 330, w: 330, h: 45,
        rotation: 0,
        edges: {},
      },
      inside_left: {
        faceId: 'inside_left',
        x: 0, y: 375, w: 330, h: 45,
        rotation: 0,
        edges: {},
      },
      inside_right: {
        faceId: 'inside_right',
        x: 660, y: 375, w: 330, h: 45,
        rotation: 0,
        edges: {},
      },
      inside_top: {
        faceId: 'inside_top',
        x: 330, y: 375, w: 330, h: 330,
        rotation: 0,
        edges: {},
      },
      inside_bottom: {
        faceId: 'inside_bottom',
        x: 330, y: 0, w: 330, h: 330,
        rotation: 0,
        edges: {},
      },
    },
    outline: { w: 990, h: 750 },
  };

  const CATALOG_PRODUCTS: CatalogProductDef[] = [
    {
      id: 'prod-mailer-box',
      subcategoryId: 'sub-mailer-boxes',
      slug: 'custom-mailer-box',
      name: 'Custom Mailer Box',
      shortDescription: 'Self-locking mailer box with full-colour printing for e-commerce and subscription brands.',
      description: 'A self-locking mailer that ships flat and assembles in seconds, printed outside with full-colour brand artwork.',
      productType: 'box',
      boxType: 'mailer-box',
      moq: 30,
      sizeUnit: 'cm',
      sizes: [
        { code: 'f42', name: 'Size F42 (115x70)', length: 11.5, width: 7, height: 3.8 },
        { code: 'f52', name: 'Size F52 (153x102)', length: 15.3, width: 10.2, height: 5.1 },
        { code: 'f62', name: 'Size F62 (196x127)', length: 19.6, width: 12.7, height: 6.4 },
        { code: 'f72', name: 'Size F72 (235x140)', length: 23.5, width: 14, height: 7.6 },
      ],
      minDims: { length: 2, width: 2, height: 1 },
      maxDims: { length: 60, width: 50, height: 40 },
      priceFrom: 14,
      // No honest product photo on file — neutral placeholder, never a
      // mismatched stock image (previous stock photo showed food).
      thumbnail: null,
      gallery: [],
      // Unverified eco certifications removed; null until supplier evidence exists.
      ecoFlags: null,
      filters: { industries: ['ecommerce', 'retail', 'cosmetics', 'subscription', 'apparel'], sizes: ['f42', 'f52', 'f62', 'f72'] },
      editorDefaults: { boxType: 'mailer-box', defaultMaterial: 'cardboard-kraft', defaultColor: 'one_colour', defaultPrint: 'outside', adhesiveStrip: 'none', finishing: 'none', lamination: 'none', fluteType: 'E', structure: MAILER_BOX_STRUCTURE, prepress: { caliperMm: 0.5, fluteType: 'E', glueFlapToleranceMm: 1.5 }, schemaVersion: 1, unit: 'mm', dieline: MAILER_DIELINE_TEMPLATE, support: 'supported' },
      defaultVariant: { materialCode: 'kraft', color: 'kraft', printMode: 'none', printSides: 'outside_only', finish: 'none' },
      options: [OPTION_MATERIAL_BOX, OPTION_PRINT_COLORS, OPTION_PRINT_SIDES, OPTION_FINISH],
      conversion: 8,
      margin: 0.35,
    },
    {
      id: 'prod-product-box',
      subcategoryId: 'sub-product-boxes',
      slug: 'custom-product-box',
      name: 'Custom Product Box',
      shortDescription: 'Folding carton product boxes with custom inserts, print and finishes for retail.',
      description: 'A folding carton built around your product. Choose from kraft to white boards, add gloss or matte lamination and print inside and out.',
      productType: 'box',
      boxType: 'folding-carton',
      moq: 30,
      sizeUnit: 'cm',
      sizes: [
        { code: 's', name: 'Small (10x6x3)', length: 10, width: 6, height: 3 },
        { code: 'm', name: 'Medium (15x10x5)', length: 15, width: 10, height: 5 },
        { code: 'l', name: 'Large (20x15x8)', length: 20, width: 15, height: 8 },
      ],
      minDims: { length: 3, width: 2, height: 1 },
      maxDims: { length: 40, width: 30, height: 20 },
      priceFrom: 12,
      thumbnail: null,
      gallery: [],
      ecoFlags: null,
      filters: { industries: ['retail', 'cosmetics', 'food', 'electronics'], sizes: ['s', 'm', 'l'] },
      editorDefaults: { boxType: 'folding-carton', defaultMaterial: 'cardboard-white', defaultColor: 'one_colour', defaultPrint: 'outside', adhesiveStrip: 'none', finishing: 'none', lamination: 'none', fluteType: 'E', structure: FOLDING_CARTON_STRUCTURE, prepress: { caliperMm: 0.45, fluteType: 'E', glueFlapToleranceMm: 1.5 }, schemaVersion: 1, unit: 'mm', dieline: FOLDING_CARTON_DIELINE_TEMPLATE, support: 'supported' },
      defaultVariant: { materialCode: 'kraft', color: 'kraft', printMode: 'none', printSides: 'outside_only', finish: 'none' },
      options: [
        OPTION_MATERIAL_BOX,
        OPTION_PRINT_COLORS,
        OPTION_PRINT_SIDES,
        OPTION_FINISH,
      ],
      conversion: 7,
      margin: 0.4,
    },
    {
      id: 'prod-shipping-box',
      subcategoryId: 'sub-shipping-boxes',
      slug: 'custom-shipping-box',
      name: 'Custom Shipping Box',
      shortDescription: 'Corrugated shipping boxes for larger loads.',
      description: 'RSC-style corrugated shipping box in kraft or white. Ideal for wholesale, fulfilment and protective outer packaging.',
      productType: 'box',
      boxType: 'shipping-box',
      moq: 30,
      sizeUnit: 'cm',
      sizes: [
        { code: 's', name: 'Small (25x20x15)', length: 25, width: 20, height: 15 },
        { code: 'm', name: 'Medium (40x30x25)', length: 40, width: 30, height: 25 },
        { code: 'l', name: 'Large (60x40x40)', length: 60, width: 40, height: 40 },
        { code: 'xl', name: 'XL (80x60x60)', length: 80, width: 60, height: 60 },
      ],
      minDims: { length: 10, width: 10, height: 5 },
      maxDims: { length: 120, width: 80, height: 80 },
      priceFrom: 9,
      thumbnail: null,
      gallery: [],
      ecoFlags: null,
      filters: { industries: ['wholesale', 'fulfilment', 'ecommerce', 'manufacturing'], sizes: ['s', 'm', 'l', 'xl'] },
      editorDefaults: { boxType: 'shipping-box', defaultMaterial: 'corrugated-kraft', defaultColor: 'one_colour', defaultPrint: 'outside', adhesiveStrip: 'none', finishing: 'none', lamination: 'none', fluteType: 'B', structure: SHIPPING_BOX_STRUCTURE, prepress: { caliperMm: 0.75, fluteType: 'B', glueFlapToleranceMm: 1.5 }, schemaVersion: 1, unit: 'mm', dieline: SHIPPING_BOX_DIELINE_TEMPLATE, support: 'supported' },
      defaultVariant: { materialCode: 'corrugated-kraft', color: 'kraft', printMode: 'none', printSides: 'outside_only', finish: 'none' },
      options: [
        {
          key: 'material', label: 'Material', control: 'select', required: true,
          values: [
            { label: 'Kraft Cardboard', value: 'cardboard-kraft' },
            { label: 'Corrugated Kraft', value: 'corrugated-kraft' },
            { label: 'Kraft Board', value: 'kraft' },
            { label: 'White Kraft Board', value: 'white-kraft' },
          ],
        },
        OPTION_PRINT_COLORS,
        {
          key: 'finish', label: 'Finish', control: 'select', required: false,
          values: [
            { label: 'None', value: 'none', priceDelta: 0, isDefault: true },
            { label: 'Gloss lamination', value: 'gloss_lamin', priceDelta: 2 },
          ],
        },
      ],
      conversion: 5,
      margin: 0.32,
    },
    {
      id: 'prod-rigid-box',
      subcategoryId: 'sub-rigid-boxes',
      slug: 'custom-rigid-box',
      name: 'Custom Rigid Box',
      shortDescription: 'Two-piece rigid boxes with a wrapped lid and base for gifting.',
      description: 'A two-piece rigid box: glued chipboard base tray and separate lid tray, wrapped in paper with foiling and soft-touch lamination options. The M8-J dieline treats the lid and base as a two-piece blank.',
      productType: 'box',
      boxType: 'rigid-box',
      moq: 30,
      sizeUnit: 'cm',
      sizes: [
        { code: 's', name: 'Small (20x15x5)', length: 20, width: 15, height: 5 },
        { code: 'm', name: 'Medium (25x18x6)', length: 25, width: 18, height: 6 },
        { code: 'l', name: 'Large (30x22x8)', length: 30, width: 22, height: 8 },
      ],
      minDims: { length: 10, width: 8, height: 3 },
      maxDims: { length: 60, width: 50, height: 20 },
      priceFrom: 35,
      // Gift-box photo verified to match a rigid gift box; gallery trimmed
      // to that verified image only.
      thumbnail: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&h=600&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&h=600&fit=crop',
      ],
      ecoFlags: null,
      filters: { industries: ['gifting', 'retail', 'luxury', 'cosmetics'], sizes: ['s', 'm', 'l'] },
      editorDefaults: { boxType: 'rigid-box', defaultMaterial: 'chipboard', defaultColor: 'one_colour', defaultPrint: 'outside', adhesiveStrip: 'glue', finishing: 'none', lamination: 'matte_lamin', fluteType: 'none', structure: RIGID_BOX_STRUCTURE, prepress: { caliperMm: 1.5, fluteType: 'none', glueFlapToleranceMm: 1.0 }, schemaVersion: 1, unit: 'mm', dieline: RIGID_BOX_DIELINE_TEMPLATE, support: 'supported' },
      defaultVariant: { materialCode: 'chipboard', color: 'kraft', printMode: 'none', printSides: 'outside_only', finish: 'none' },
      options: [
        {
          key: 'material', label: 'Material', control: 'select', required: true,
          values: [
            { label: 'Chipboard', value: 'chipboard' },
            { label: 'White Glossy (Imported)', value: 'cardboard-white' },
            { label: 'Kraft Liner', value: 'kraft_liner' },
            { label: 'Corrugated Kraft', value: 'corrugated-kraft' },
          ],
        },
        OPTION_PRINT_COLORS,
        OPTION_PRINT_SIDES,
        OPTION_FINISH,
      ],
      conversion: 15,
      margin: 0.45,
    },
    {
      id: 'prod-pizza-box',
      subcategoryId: 'sub-pizza-boxes',
      slug: 'custom-pizza-box',
      name: 'Custom Pizza Box',
      shortDescription: 'Corrugated single-piece pizza boxes with ventilation and full-colour branding.',
      description: 'A single-piece corrugated pizza box that ships flat and locks in seconds. The M8-J dieline uses a cruciform blank: hinged lid plus deck with folding front, back and side walls.',
      productType: 'box',
      boxType: 'pizza-box',
      moq: 30,
      sizeUnit: 'cm',
      sizes: [
        { code: 's', name: 'Small (25x25x4)', length: 25, width: 25, height: 4 },
        { code: 'm', name: 'Medium (33x33x4.5)', length: 33, width: 33, height: 4.5 },
        { code: 'l', name: 'Large (40x40x5)', length: 40, width: 40, height: 5 },
      ],
      minDims: { length: 20, width: 20, height: 2 },
      maxDims: { length: 60, width: 60, height: 10 },
      priceFrom: 10,
      // Pizza photo verified to match the pizza box; gallery trimmed to it.
      thumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
      ],
      ecoFlags: null,
      filters: { industries: ['food', 'restaurants', 'catering', 'beverage'], sizes: ['s', 'm', 'l'] },
      editorDefaults: { boxType: 'pizza-box', defaultMaterial: 'corrugated-kraft', defaultColor: 'one_colour', defaultPrint: 'outside', adhesiveStrip: 'none', finishing: 'none', lamination: 'none', fluteType: 'E', structure: PIZZA_BOX_STRUCTURE, prepress: { caliperMm: 0.6, fluteType: 'E', glueFlapToleranceMm: 1.0 }, schemaVersion: 1, unit: 'mm', dieline: PIZZA_BOX_DIELINE_TEMPLATE, support: 'supported' },
      defaultVariant: { materialCode: 'corrugated-kraft', color: 'kraft', printMode: 'none', printSides: 'outside_only', finish: 'none' },
      options: [
        {
          key: 'material', label: 'Material', control: 'select', required: true,
          values: [
            { label: 'Corrugated Kraft', value: 'corrugated-kraft' },
            { label: 'Kraft Board', value: 'kraft' },
            { label: 'Corrugated White', value: 'corrugated-white' },
            { label: 'White Glossy (Imported)', value: 'cardboard-white' },
          ],
        },
        OPTION_PRINT_COLORS,
        OPTION_PRINT_SIDES,
        OPTION_FINISH,
      ],
      conversion: 4,
      margin: 0.35,
    },
    {
      id: 'prod-paper-bag',
      subcategoryId: 'sub-carrier-bags',
      slug: 'custom-paper-bag',
      name: 'Custom Paper Bag',
      shortDescription: 'Kraft and white paper carrier bags with custom print and handle options.',
      description: 'Carrier bags in kraft or white paper. Pick a twisted-paper, ribbon or cotton-rope handle and brand both sides.',
      productType: 'bag',
      boxType: 'paper-bag',
      moq: 50,
      sizeUnit: 'cm',
      sizes: [
        { code: 's', name: 'Small (18x14x6)', length: 18, width: 14, height: 6 },
        { code: 'm', name: 'Medium (25x18x8)', length: 25, width: 18, height: 8 },
        { code: 'l', name: 'Large (32x24x10)', length: 32, width: 24, height: 10 },
      ],
      minDims: { length: 10, width: 8, height: 3 },
      maxDims: { length: 50, width: 40, height: 20 },
      priceFrom: 8,
      thumbnail: null,
      gallery: [],
      ecoFlags: null,
      filters: { industries: ['retail', 'food', 'fashion', 'boutique'], sizes: ['s', 'm', 'l'] },
      editorDefaults: { boxType: 'paper-bag', defaultMaterial: 'kraft', defaultColor: 'one_colour', defaultPrint: 'outside', handle: 'none', support: 'deferred', supportReason: 'Bag = 2+2 side panels with a gusseted base — non-rectangular gusset authoring is unsafe in M8 (spec §14); deferred to post-M8, never shipped with fake geometry.' },
      defaultVariant: { materialCode: 'kraft', color: 'kraft', printMode: 'none', printSides: 'outside_only', finish: 'none' },
      options: [
        {
          key: 'material', label: 'Material', control: 'select', required: true,
          values: [
            { label: 'Kraft Board', value: 'kraft' },
            { label: 'White Kraft Board', value: 'white-kraft' },
            { label: 'Silk Finish Paper', value: 'paper-silk' },
            { label: 'Soft Touch Paper', value: 'paper-soft-touch' },
          ],
        },
        OPTION_PRINT_COLORS,
        {
          key: 'finish', label: 'Finish', control: 'select', required: false,
          values: [
            { label: 'None', value: 'none', priceDelta: 0, isDefault: true },
            { label: 'Gloss lamination', value: 'gloss_lamin', priceDelta: 2 },
            { label: 'Matte lamination', value: 'matte_lamin', priceDelta: 2.4 },
          ],
        },
        {
          key: 'handle', label: 'Handle', control: 'select', required: true,
          values: [
            { label: 'No handle', value: 'none', priceDelta: 0, isDefault: true },
            { label: 'Twisted paper', value: 'twisted_paper', priceDelta: 4, appliesTo: { materials: ['kraft', 'white-kraft'] } },
            { label: 'Cotton ropes', value: 'cotton_ropes', priceDelta: 8 },
            { label: 'Ribbon', value: 'ribbon', priceDelta: 9 },
          ],
        },
      ],
      conversion: 3,
      margin: 0.33,
    },
    {
      id: 'prod-poly-mailer',
      subcategoryId: 'sub-mailing-bags',
      slug: 'custom-poly-mailer',
      name: 'Custom Poly Mailer',
      shortDescription: 'Lightweight LDPE poly mailers with your brand printed across the bag.',
      description: 'Lightweight poly mailers in LDPE. Self-adhesive peel-and-seal closure with a tamper-evident option.',
      productType: 'bag',
      boxType: 'poly-mailer',
      moq: 50,
      sizeUnit: 'cm',
      sizes: [
        { code: 's', name: 'Small (25x18)', length: 25, width: 18, height: 2 },
        { code: 'm', name: 'Medium (35x24)', length: 35, width: 24, height: 2 },
        { code: 'l', name: 'Large (40x30)', length: 40, width: 30, height: 2 },
      ],
      minDims: { length: 10, width: 10, height: 1 },
      maxDims: { length: 60, width: 60, height: 5 },
      priceFrom: 5,
      thumbnail: null,
      gallery: [],
      ecoFlags: null,
      filters: { industries: ['ecommerce', 'apparel', 'subscription'], sizes: ['s', 'm', 'l'] },
      editorDefaults: { boxType: 'poly-mailer', defaultMaterial: 'poly', defaultColor: 'one_colour', defaultPrint: 'outside', handle: 'none', support: 'deferred', supportReason: 'Single-face + back LDPE self-seal pouch — physically not a box; no generic box blueprint/deferral per spec §14.' },
      defaultVariant: { materialCode: 'poly', color: 'clear', printMode: 'none', printSides: 'outside_only', finish: 'none' },
      options: [
        {
          key: 'material', label: 'Material', control: 'select', required: true,
          values: [{ label: 'LDPE Poly Mailer', value: 'poly' }],
        },
        OPTION_PRINT_COLORS,
        {
          key: 'closure', label: 'Closure', control: 'select', required: true,
          values: [
            { label: 'Peel & seal', value: 'peel_seal', priceDelta: 0, isDefault: true },
            { label: 'Tamper evident', value: 'tamper_evident', priceDelta: 0.6 },
          ],
        },
      ],
      conversion: 0.6,
      margin: 0.35,
    },
    {
      id: 'prod-sticker-label',
      subcategoryId: 'sub-label-stickers',
      slug: 'custom-label-sticker',
      name: 'Custom Labels & Stickers',
      shortDescription: 'Die-cut labels and stickers in paper or vinyl for products, mailing and retail.',
      description: 'Die-cut to any shape in glossy, matte or kraft papers or vinyl. For product labels, stickers and mailer seals.',
      productType: 'label',
      boxType: 'label',
      moq: 25,
      sizeUnit: 'cm',
      sizes: [
        { code: 'sq50', name: 'Square 5x5', length: 5, width: 5, height: 0.1 },
        { code: 'r75x50', name: 'Landscape 7.5x5', length: 7.5, width: 5, height: 0.1 },
        { code: 'r100x75', name: 'Landscape 10x7.5', length: 10, width: 7.5, height: 0.1 },
        { code: 'r150x100', name: 'Landscape 15x10', length: 15, width: 10, height: 0.1 },
      ],
      minDims: { length: 2, width: 2, height: 0.1 },
      maxDims: { length: 30, width: 20, height: 0.1 },
      priceFrom: 1.5,
      thumbnail: null,
      gallery: [],
      ecoFlags: null,
      filters: { industries: ['retail', 'food', 'cosmetics', 'mailing'], sizes: ['sq50', 'r75x50', 'r100x75', 'r150x100'] },
      editorDefaults: { boxType: 'label', defaultMaterial: 'paper', defaultColor: 'full_color', defaultPrint: 'outside', dieCut: 'rectangle', support: 'deferred', supportReason: 'Flat 1-panel die-cut with zones on a single face — deferred until non-rectangular die-cut path authoring (spec §14).' },
      defaultVariant: { materialCode: 'paper', color: 'white', printMode: 'none', printSides: 'outside_only', finish: 'none' },
      options: [
        {
          key: 'material', label: 'Material', control: 'select', required: true,
          values: [
            { label: 'Paper', value: 'paper' },
            { label: 'Vinyl', value: 'vinyl' },
            { label: 'Kraft Board', value: 'kraft' },
          ],
        },
        OPTION_PRINT_COLORS,
        OPTION_FINISH,
      ],
      conversion: 0.4,
      margin: 0.5,
    },
    {
      // Business card, hand-seeded so the editor receives its real flat
      // structure (front/back faces only, BUSINESS_CARD_STRUCTURE above)
      // instead of the generic catalogue-expansion entry, which carries
      // no structure and leaves the editor with six box faces. Nothing
      // else changes versus that expansion entry: no product-specific
      // rates exist (priceFrom null, quote on request), no min/max size
      // bounds are invented (null), and production dieline geometry
      // stays deferred — support is not upgraded.
      id: 'prod-business-card',
      subcategoryId: 'sub-cards',
      slug: 'custom-business-card',
      name: 'Custom Business Card',
      shortDescription: 'Premium business cards',
      description: null,
      productType: 'label',
      boxType: 'business-card',
      moq: 50,
      sizeUnit: 'mm',
      sizes: [{ code: 'default', name: 'Custom Business Card', length: 85, width: 1, height: 55 }],
      minDims: null as unknown as CatalogDims,
      maxDims: null as unknown as CatalogDims,
      priceFrom: null,
      thumbnail: null,
      gallery: [],
      ecoFlags: null,
      filters: null,
      editorDefaults: { boxType: 'business-card', defaultMaterial: 'card-stock-white', defaultColor: 'full_color', defaultPrint: 'outside', structure: BUSINESS_CARD_STRUCTURE, support: 'deferred', supportReason: 'Flat two-sided card: the front/back preview is wired through the editor structure, but production dieline geometry is deferred — no blueprint is shipped for this product.' },
      defaultVariant: { materialCode: 'card-stock-white', color: 'natural', printMode: 'none', printSides: 'outside_only', finish: 'none' },
      options: [],
    },
  ];

  // Unified catalogue expansion: picker-listed products without a seeded
  // storefront entry join the catalogue from the canonical registry. They are
  // classified and quotable-by-request, but carry NO product-specific rates
  // (priceFrom null, no scoped pricing rules — nothing invented) and keep an
  // explicit deferred production status instead of fake geometry.
  for (const entry of CATALOGUE_PRODUCTS) {
    if (CATALOG_PRODUCTS.some((p) => p.id === entry.productId)) continue;
    // Candidate materials are catalogue intent from the picker data, not a
    // legacy-cardboard fallback: the default variant uses the product's own
    // first candidate code (e.g. poly-white, foil-matte, paper-coated-white).
    const defaultMaterial =
      CATALOGUE_CANDIDATE_MATERIALS[entry.id]?.[0] ??
      (entry.pricingFamily === 'box' ? 'cardboard-kraft'
      : entry.pricingFamily === 'bag' ? 'kraft'
      : 'paper');
    CATALOG_PRODUCTS.push({
      id: entry.productId,
      subcategoryId: `sub-${entry.subcategory}`,
      slug: entry.slug,
      name: entry.name.en,
      shortDescription: entry.description.en,
      // No invented marketing copy; the one honest line stays in
      // shortDescription until real product copy exists.
      description: null,
      productType: entry.pricingFamily,
      boxType: entry.boxType,
      moq: entry.moq,
      sizeUnit: 'mm',
      sizes: [{ code: 'default', name: entry.name.en, ...entry.defaultDimensions }],
      minDims: null as unknown as CatalogDims,
      maxDims: null as unknown as CatalogDims,
      priceFrom: null,
      thumbnail: null,
      gallery: [],
      ecoFlags: null,
      filters: null,
      editorDefaults: {
        boxType: entry.boxType,
        // Explicitly qualified card slices receive two-face previews.
        // No production blueprint, rates or sibling support is inferred.
        ...(entry.id === 'loyalty_card' ? {structure: loyaltyPreviewStructure(entry.defaultDimensions)} : {}),
        ...(entry.id === 'thank_you_card' ? {structure: thankYouPreviewStructure(entry.defaultDimensions)} : {}),
        support: 'deferred',
        supportReason: entry.supportReason,
      },
      defaultVariant: {
        materialCode: defaultMaterial,
        color: 'natural',
        printMode: 'none',
        printSides: 'outside_only',
        finish: 'none',
      },
      options: [],
    });
  }

  // Join every seeded product to its canonical registry entry: attach the
  // editor picker id, the three-axis readiness verdict and the preview
  // family routing. The registry is the single source for these fields;
  // hand-written structure/dieline/prepress literals stay untouched.
  for (const def of CATALOG_PRODUCTS) {
    const entry = CATALOGUE_PRODUCTS.find((e) => e.productId === def.id);
    if (!entry) {
      throw new Error(`Catalogue product "${def.id}" is missing from shared/catalog/products.ts`);
    }
    def.editorDefaults = {
      ...(def.editorDefaults as Record<string, unknown>),
      editorType: entry.id,
      readiness: entry.readiness,
      ...(entry.previewFamily ? { previewFamily: entry.previewFamily } : {}),
      ...(entry.plannedFamily ? { plannedFamily: entry.plannedFamily } : {}),
      // Candidate material codes (catalogue intent, not compatibility
      // approval); the renderer filters to these and labels them pending
      // supplier confirmation.
      ...(CATALOGUE_CANDIDATE_MATERIALS[entry.id]
        ? { candidateMaterials: CATALOGUE_CANDIDATE_MATERIALS[entry.id] }
        : {}),
    };
  }

  for (const cat of CATEGORIES) {
    await prisma.productCategory.upsert({
      where: { id: cat.id },
      update: { slug: cat.slug, name: cat.name, description: cat.description, sortOrder: cat.sortOrder, isActive: true },
      create: { id: cat.id, slug: cat.slug, name: cat.name, description: cat.description, sortOrder: cat.sortOrder, isActive: true },
    });
  }
  for (const sub of SUBCATEGORIES) {
    await prisma.productSubcategory.upsert({
      where: { id: sub.id },
      update: { categoryId: sub.categoryId, slug: sub.slug, name: sub.name, sortOrder: sub.sortOrder, isActive: true },
      create: { id: sub.id, categoryId: sub.categoryId, slug: sub.slug, name: sub.name, sortOrder: sub.sortOrder, isActive: true },
    });
  }

  let catalogProducts = 0;
  let catalogVariants = 0;
  let catalogOptions = 0;

  for (const p of CATALOG_PRODUCTS) {
    const skuModel = p.boxType;

    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        subcategoryId: p.subcategoryId,
        slug: p.slug,
        name: p.name,
        shortDescription: p.shortDescription,
        description: p.description,
        customisation: 'custom',
        productType: p.productType,
        boxType: p.boxType,
        moq: p.moq,
        sizeUnit: p.sizeUnit,
        baseSizes: p.sizes,
        minDimensions: p.minDims,
        maxDimensions: p.maxDims,
        priceFrom: p.priceFrom,
        thumbnail: p.thumbnail,
        gallery: p.gallery,
        // Nullable Json column: plain null means "leave unchanged" to Prisma;
        // DbNull actually clears unverified eco claims.
        ecoFlags: p.ecoFlags ?? Prisma.DbNull,
        filters: p.filters,
        editorDefaults: p.editorDefaults,
        isActive: true,
        isBestseller: p.id === 'prod-mailer-box',
        isNew: p.id === 'prod-poly-mailer',
      },
      create: {
        id: p.id,
        subcategoryId: p.subcategoryId,
        slug: p.slug,
        name: p.name,
        shortDescription: p.shortDescription,
        description: p.description,
        customisation: 'custom',
        productType: p.productType,
        boxType: p.boxType,
        moq: p.moq,
        sizeUnit: p.sizeUnit,
        baseSizes: p.sizes,
        minDimensions: p.minDims,
        maxDimensions: p.maxDims,
        priceFrom: p.priceFrom,
        thumbnail: p.thumbnail,
        gallery: p.gallery,
        ecoFlags: p.ecoFlags ?? Prisma.DbNull,
        filters: p.filters,
        editorDefaults: p.editorDefaults,
        isActive: true,
        isBestseller: p.id === 'prod-mailer-box',
        isNew: p.id === 'prod-poly-mailer',
      },
    });

    // Reset derived catalog rows for this product (idempotent reseeding).
    await prisma.productOptionValue.deleteMany({ where: { productId: p.id } });
    await prisma.productOption.deleteMany({ where: { productId: p.id } });
    await prisma.productVariant.deleteMany({ where: { productId: p.id } });

    // Options + their priced values.
    let oi = 0;
    for (const opt of p.options) {
      oi += 1;
      await prisma.productOption.create({
        data: {
          id: `opt-${p.id}-${opt.key}`,
          productId: p.id,
          key: opt.key,
          label: opt.label,
          control: opt.control,
          required: opt.required ?? false,
          sortOrder: oi,
          values: {
            create: opt.values.map((v, vi) => ({
              id: `opv-${p.id}-${opt.key}-${v.value}`,
              productId: p.id,
              label: v.label,
              value: v.value,
              priceDelta: v.priceDelta,
              priceType: v.priceType ?? 'per_unit',
              appliesTo: v.appliesTo,
              isDefault: v.isDefault ?? false,
              sortOrder: vi,
            })),
          },
        },
      });
      catalogOptions += opt.values.length;
    }

    // One seeded variant per size preset (unprinted base config). The
    // configurator synthesizes full SKUs at quote time (M5).
    for (let si = 0; si < p.sizes.length; si += 1) {
      const size = p.sizes[si];
      const sku = [
        p.productType,
        skuModel,
        size.code,
        p.defaultVariant.materialCode,
        `print-${p.defaultVariant.printMode}`,
        `finish-${p.defaultVariant.finish}`,
      ].join('--');
      await prisma.productVariant.create({
        data: {
          productId: p.id,
          sku,
          sizeCode: size.code,
          materialCode: p.defaultVariant.materialCode,
          color: p.defaultVariant.color,
          printMode: p.defaultVariant.printMode,
          printSides: p.defaultVariant.printSides,
          finish: p.defaultVariant.finish,
          dimensions: { length: size.length, width: size.width, height: size.height, unit: p.sizeUnit },
          isActive: true,
          isDefault: si === 0,
        },
      });
      catalogVariants += 1;
    }

    // Scoped pricing rules for this product — only when the registry entry
    // carries real rate data. quote_required products intentionally get none:
    // no invented conversion/margin/tier rates reach the pricing engine.
    if (p.conversion != null && p.margin != null) {
      await prisma.pricingRule.upsert({
        where: { id: `rule-${p.id}-conversion` },
        update: { productType: p.productType, ruleType: 'conversion', value: p.conversion, scope: 'product', scopeId: p.id, isActive: true },
        create: { id: `rule-${p.id}-conversion`, productType: p.productType, ruleType: 'conversion', value: p.conversion, scope: 'product', scopeId: p.id, isActive: true },
      });
      await prisma.pricingRule.upsert({
        where: { id: `rule-${p.id}-margin` },
        update: { productType: p.productType, ruleType: 'margin', value: p.margin, scope: 'product', scopeId: p.id, isActive: true },
        create: { id: `rule-${p.id}-margin`, productType: p.productType, ruleType: 'margin', value: p.margin, scope: 'product', scopeId: p.id, isActive: true },
      });
      for (const tier of TIER_LADDER) {
        if (tier.min <= p.moq) continue;
        const ruleId = `rule-${p.id}-tier-${tier.min}`;
        await prisma.pricingRule.upsert({
          where: { id: ruleId },
          update: { productType: p.productType, ruleType: 'discount_tier', value: tier.factor, minQuantity: tier.min, scope: 'product', scopeId: p.id, isActive: true },
          create: { id: ruleId, productType: p.productType, ruleType: 'discount_tier', value: tier.factor, minQuantity: tier.min, scope: 'product', scopeId: p.id, isActive: true },
        });
      }
    }
    catalogProducts += 1;
  }

  console.log(`Created/updated ${catalogProducts} catalog products, ${catalogVariants} variants, ${catalogOptions} option values, ${TIER_LADDER.length} discount tiers`);

  // Create sample vendor (local testing only). No credentials are committed:
  // the account is only created when SEED_SAMPLE_VENDOR_PASSWORD is set, and
  // its password is hashed at seed time. Skipped silently otherwise.
  const sampleVendorPassword = process.env.SEED_SAMPLE_VENDOR_PASSWORD;
  if (sampleVendorPassword) {
    if (sampleVendorPassword.length < 8) {
      throw new Error('SEED_SAMPLE_VENDOR_PASSWORD must be at least 8 characters.');
    }
    const sampleVendorHash = await bcrypt.hash(sampleVendorPassword, 12);
    const vendorUser = await prisma.user.upsert({
      where: { email: 'vendor@example.com' },
      update: {},
      create: {
        email: 'vendor@example.com',
        passwordHash: sampleVendorHash,
        role: 'VENDOR',
        firstName: 'Test',
        lastName: 'Vendor',
        emailVerified: true,
      },
    });

    const vendor = await prisma.vendor.upsert({
      where: { userId: vendorUser.id },
      update: {},
      create: {
        userId: vendorUser.id,
        companyName: 'Test Printing Co.',
        address: '123 Industrial St',
        city: 'Cairo',
        country: 'Egypt',
        postalCode: '11511',
        latitude: 30.0444,
        longitude: 31.2357,
        phone: '+20 123 456 7890',
        email: 'vendor@example.com',
        isActive: true,
        qualityRating: 4.5,
        averageLeadTime: 5,
        minOrderQuantity: 100,
      },
    });

    console.log('Created sample vendor:', vendor.companyName);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
