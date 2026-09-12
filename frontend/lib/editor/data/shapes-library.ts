"use client"

export interface ShapeItem {
  id: string
  name: { en: string; ar: string }
  category: string
  svg: string
  tags: string[]
}

function svg(content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`
}

function svgFilled(content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${content}</svg>`
}

export const SHAPE_CATEGORIES = [
  { id: "arrows", name: { en: "Arrows", ar: "أسهم" }, icon: "➡️" },
  { id: "badges", name: { en: "Badges & Stars", ar: "شارات ونجوم" }, icon: "⭐" },
  { id: "borders", name: { en: "Borders & Frames", ar: "حدود وإطارات" }, icon: "☐" },
  { id: "labels", name: { en: "Labels & Tags", ar: "ملصقات وبطاقات" }, icon: "🏷️" },
  { id: "food", name: { en: "Food & Drink", ar: "طعام وشراب" }, icon: "🍕" },
  { id: "nature", name: { en: "Nature & Plants", ar: "طبيعة ونباتات" }, icon: "🌿" },
  { id: "industry", name: { en: "Industry & Tools", ar: "صناعة وأدوات" }, icon: "⚙️" },
  { id: "medical", name: { en: "Medical & Safety", ar: "طبي وسلامة" }, icon: "🏥" },
  { id: "logistics", name: { en: "Transport & Logistics", ar: "نقل ولوجستيات" }, icon: "🚚" },
  { id: "business", name: { en: "Office & Business", ar: "مكتب وأعمال" }, icon: "💼" },
  { id: "tech", name: { en: "Technology", ar: "تقنية" }, icon: "💻" },
  { id: "cleaning", name: { en: "Cleaning & Hygiene", ar: "تنظيف ونظافة" }, icon: "🧹" },
  { id: "beauty", name: { en: "Beauty & Fashion", ar: "جمال وأزياء" }, icon: "💄" },
  { id: "sports", name: { en: "Sports & Fitness", ar: "رياضة ولياقة" }, icon: "⚽" },
  { id: "home", name: { en: "Home & Living", ar: "منزل ومعيشة" }, icon: "🏠" },
  { id: "animals", name: { en: "Animals & Pets", ar: "حيوانات أليفة" }, icon: "🐾" },
  { id: "travel", name: { en: "Travel & Places", ar: "سفر وأماكن" }, icon: "✈️" },
  { id: "music", name: { en: "Music & Arts", ar: "موسيقى وفن" }, icon: "🎵" },
  { id: "education", name: { en: "Education", ar: "تعليم" }, icon: "📚" },
  { id: "celebration", name: { en: "Celebration", ar: "احتفالات" }, icon: "🎉" },
  { id: "flags", name: { en: "Flags", ar: "أعلام" }, icon: "🚩" },
  { id: "packaging", name: { en: "Packaging", ar: "تغليف" }, icon: "📦" },
]

export const SHAPES: ShapeItem[] = [
  // ============ ARROWS (25) ============
  ...([
    ["arrow-right", "Arrow Right", "سهم يمين", "M10 50h70M55 25l25 25-25 25"],
    ["arrow-left", "Arrow Left", "سهم يسار", "M90 50H20M45 25L20 50l25 25"],
    ["arrow-up", "Arrow Up", "سهم أعلى", "M50 90V20M25 45l25-25 25 25"],
    ["arrow-down", "Arrow Down", "سهم أسفل", "M50 10v70M25 55l25 25 25-25"],
    ["arrow-up-right", "Arrow Up Right", "سهم أعلى يمين", "M25 25l50 50M75 25H50m25 0v25"],
    ["arrow-down-left", "Arrow Down Left", "سهم أسفل يسار", "M75 75L25 25M25 75h25m-25 0V50"],
    ["arrow-circle-right", "Circle Arrow Right", "سهم دائري يمين", "M50 10a40 40 0 110 80 40 40 0 010-80M45 35l15 15-15 15"],
    ["arrow-circle-left", "Circle Arrow Left", "سهم دائري يسار", "M50 10a40 40 0 110 80 40 40 0 010-80M55 35l-15 15 15 15"],
    ["arrow-circle-up", "Circle Arrow Up", "سهم دائري أعلى", "M50 10a40 40 0 110 80 40 40 0 010-80M35 55l15-15 15 15"],
    ["arrow-circle-down", "Circle Arrow Down", "سهم دائري أسفل", "M50 10a40 40 0 110 80 40 40 0 010-80M35 45l15 15 15-15"],
    ["chevron-right", "Chevron Right", "زاوية يمين", "M35 25l25 25-25 25"],
    ["chevron-left", "Chevron Left", "زاوية يسار", "M65 25l-25 25 25 25"],
    ["chevron-up", "Chevron Up", "زاوية أعلى", "M25 65l25-25 25 25"],
    ["chevron-down", "Chevron Down", "زاوية أسفل", "M25 35l25 25 25-25"],
    ["double-arrow-right", "Double Arrow Right", "سهم مزدوج يمين", "M30 25l25 25-25 25M55 25l25 25-25 25"],
    ["double-arrow-left", "Double Arrow Left", "سهم مزدوج يسار", "M70 25l-25 25 25 25M45 25l-25 25 25 25"],
    ["arrow-return", "Return Arrow", "سهم رجوع", "M85 70H35a20 20 0 010-40h30M55 45l15-15-15-15"],
    ["arrow-split", "Split Arrow", "سهم تفرع", "M50 10v35M50 45L35 65M50 45l15 20M20 80l15-15M80 80l-15-15"],
    ["arrow-merge", "Merge Arrow", "سهم دمج", "M50 10v35M35 45l15-15 15 15M20 80l15-20M80 80l-15-20"],
    ["arrow-swap", "Swap Arrow", "سهم تبادل", "M25 65l-15-15 15-15M75 35l15 15-15 15M15 50h60M25 50h-5"],
    ["arrow-sync", "Sync Arrow", "سهم تزامن", "M35 75A35 35 0 1065 75M40 65l-5 15-15-5"],
    ["arrow-corner-right", "Corner Arrow Right", "سهم زاوية يمين", "M25 75V35a10 10 0 0110-10h40M50 50l25-25-25-25"],
    ["arrow-corner-left", "Corner Arrow Left", "سهم زاوية يسار", "M75 75V35a10 10 0 00-10-10H25M50 50l-25-25 25-25"],
    ["expand", "Expand", "توسيع", "M15 45V15h30M85 55v30H55M15 55v20a10 10 0 0010 10h20M85 45V25a10 10 0 00-10-10H55"],
    ["collapse", "Collapse", "طي", "M35 15v30H15M65 85V55h30M35 55H15a10 10 0 0010 10h20M65 45h20a10 10 0 01-10-10H55"],
  ] as const).map(([id, en, ar, d], i) => ({
    id: `arrow-${i}`,
    name: { en, ar },
    category: "arrows",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "arrow", "direction"],
  })),

  // ============ BADGES & STARS (20) ============
  ...([
    ["star-5-point", "5-Point Star", "نجمة خماسية", "M50 5l14 28 31 4-22 21 5 31-28-15-28 15 5-31-22-21 31-4z"],
    ["star-4-point", "4-Point Star", "نجمة رباعية", "M50 5l13 32 32 13-32 13-13 32-13-32-32-13 32-13z"],
    ["star-6-point", "6-Point Star", "نجمة سداسية", "M50 5l13 32 32 13-32 13-13 32-13-32-32-13 32-13z", true],
    ["star-outline", "Star Outline", "نجمة فارغة", "M50 15l8 18 20 3-14 13 3 20-17-9-17 9 3-20-14-13 20-3z"],
    ["star-badge", "Star Badge", "وسام نجمة", "M50 10l10 20 22 3-16 15 4 22-20-10-20 10 4-22-16-15 22-3z"],
    ["shield", "Shield", "درع", "M50 5l40 15v25c0 25-40 45-40 45S10 70 10 45V20z"],
    ["shield-check", "Shield Check", "درع بعلامة", "M50 5l40 15v25c0 25-40 45-40 45S10 70 10 45V20zM35 50l10 10 20-20"],
    ["ribbon", "Ribbon", "شريط", "M20 10h60v50L50 45 20 60z"],
    ["medal", "Medal", "ميدالية", "M50 10l10 20h20l-15 15 5 25-20-10-20 10 5-25-15-15h20z"],
    ["crown", "Crown", "تاج", "M15 75l10-40 15 20 10-40 10 40 15-20 10 40v5H15z"],
    ["trophy", "Trophy", "كأس", "M35 20h30v10a25 25 0 01-15 23 25 25 0 01-15-23V20zM30 70h40M50 53v17"],
    ["circle-badge", "Circle Badge", "شارة دائرية", "M50 10a40 40 0 110 80 40 40 0 010-80M50 30v20l15 15"],
    ["rosette", "Rosette", "وردة", "M50 10c-15 0-25 10-25 25s10 25 25 25 25-10 25-25S65 10 50 10zM50 30l10 10-10 15-10-15z"],
    ["award", "Award", "جائزة", "M35 30h30v25l-15 10-15-10V30zM25 50l-5 20 15-5M75 50l5 20-15-5"],
    ["checkmark-badge", "Checkmark Badge", "شارة صح", "M50 10a40 40 0 110 80 40 40 0 010-80M35 50l10 10 20-25"],
    ["cross-badge", "Cross Badge", "شارة خطأ", "M50 10a40 40 0 110 80 40 40 0 010-80M35 35l30 30M65 35l-30 30"],
    ["heart-badge", "Heart Badge", "شارة قلب", "M50 12a30 30 0 0130 30c0 22-30 43-30 43S20 64 20 42a30 30 0 0130-30z"],
    ["number-1", "Number 1 Badge", "رقم 1", "M50 10a40 40 0 110 80 40 40 0 010-80M42 50l8-20v30"],
    ["number-2", "Number 2 Badge", "رقم 2", "M50 10a40 40 0 110 80 40 40 0 010-80M35 45c0-10 8-18 15-18s15 8 15 18-15 18-15 18 15 0 15 15H35"],
    ["number-3", "Number 3 Badge", "رقم 3", "M50 10a40 40 0 110 80 40 40 0 010-80M35 35h15M35 50h15M35 65h15"],
  ] as const).map(([id, en, ar, d, filled]: any, i) => ({
    id: `badge-${i}`,
    name: { en, ar },
    category: "badges",
    svg: filled ? svgFilled(`<path d="${d}"/>`) : svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "badge", "star"],
  })),

  // ============ BORDERS & FRAMES (15) ============
  ...([
    ["border-square", "Square Border", "حدود مربعة", "M15 15h70v70H15z"],
    ["border-rounded", "Rounded Border", "حدود مدورة", "M25 15h50a10 10 0 0110 10v50a10 10 0 01-10 10H25a10 10 0 01-10-10V25a10 10 0 0110-10z"],
    ["border-circle", "Circle Border", "حدود دائرية", "M50 15a35 35 0 110 70 35 35 0 010-70z"],
    ["border-dashed-square", "Dashed Square", "مربع متقطع", "M15 15h70v70H15z", "stroke-dasharray: 5 5"],
    ["border-double-square", "Double Square", "مربع مزدوج", "M12 12h76v76H12zM22 22h56v56H22z"],
    ["border-corner", "Corner Brackets", "زوايا", "M20 15h-5v70h5M80 15h5v70h-5M15 20v-5h70v5M15 80v5h70v-5"],
    ["border-top", "Top Border", "حدود علوية", "M15 15h70M15 35h70M55 15v60"],
    ["border-thick", "Thick Border", "حدود سميكة", "M12 12h76v76H12z", "stroke-width:4"],
    ["border-ornate", "Ornate Corner", "زوايا مزخرفة", "M20 10h-5v3M10 20h-3v-5M90 20h3v-5M80 10h5v3M20 90h-5v-3M10 80h-3v5M90 80h3v5M80 90h5v-3"],
    ["frame-letter", "Letter Frame", "إطار بريدي", "M10 20h80v60H10zM10 35h80M35 20v60"],
    ["frame-diamond", "Diamond Frame", "إطار ماسي", "M50 10l40 40-40 40L10 50z"],
    ["frame-hexagon", "Hexagon Frame", "إطار سداسي", "M50 10l35 20v40L50 90 15 70V30z"],
    ["frame-octagon", "Octagon Frame", "إطار مثمن", "M30 10h40l20 20v40l-20 20H30L10 70V30z"],
    ["frame-scalloped", "Scalloped Frame", "إطار مموج", "M15 35c0-10 5-15 15-10s15 10 15 0 5-15 15-10 15 10 15 0 5-15 15-10 15 10 15 0v40c0 10-5 15-15 10s-15-10-15 0-5 15-15 10-15-10-15 0-5 15-15 10-15-10-15 0V35z"],
    ["frame-cloud", "Cloud Frame", "إطار سحابي", "M25 30c0-10 8-18 18-18h14c10 0 18 8 18 18 8 0 15 7 15 15s-7 15-15 15H25c-8 0-15-7-15-15s7-15 15-15z"],
  ] as const).map(([id, en, ar, d, style]: any, i) => ({
    id: `border-${i}`,
    name: { en, ar },
    category: "borders",
    svg: svg(`<path d="${d}"${style ? ` style="${style}"` : ""}/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "border", "frame"],
  })),

  // ============ LABELS & TAGS (15) ============
  ...([
    ["tag-rectangle", "Rectangle Tag", "بطاقة مستطيلة", "M15 35h70v40H15zM35 35V25a10 10 0 0130 0v10"],
    ["tag-flag", "Flag Tag", "بطاقة علم", "M15 15h60l-15 25 15 25H15V15z"],
    ["tag-round", "Round Tag", "بطاقة دائرية", "M50 20a25 25 0 110 50 25 25 0 010-50zM30 45h15l5-10 5 10h15"],
    ["tag-ribbon", "Ribbon Tag", "بطاقة شريط", "M20 10h60l-10 15 10 15H20l10-15z"],
    ["tag-price", "Price Tag", "بطاقة سعر", "M15 45l30-30 40 40-30 30-40-40zM45 25l5 5M30 40l5 5"],
    ["label-round", "Round Label", "ملصق دائري", "M50 15a35 35 0 110 70 35 35 0 010-70zM30 50h25l10-15"],
    ["label-oval", "Oval Label", "ملصق بيضاوي", "M30 20c-15 0-20 10-20 30s5 30 20 30 20-10 20-30-5-30-20-30zM70 20c15 0 20 10 20 30s-5 30-20 30"],
    ["label-hex", "Hex Label", "ملصق سداسي", "M50 15l25 15v30l-25 15-25-15V30z"],
    ["seal", "Seal Stamp", "ختم", "M50 10c-8 0-15 5-20 12a25 25 0 00-18 18c-7 5-12 12-12 20s5 15 12 20a25 25 0 0018 18c5 7 12 12 20 12s15-5 20-12a25 25 0 0018-18c7-5 12-12 12-20s-5-15-12-20a25 25 0 00-18-18c-5-7-12-12-20-12z"],
    ["seal-approval", "Approval Stamp", "ختم موافقة", "M50 15a35 35 0 110 70 35 35 0 010-70zM35 55l10 10 20-25"],
    ["badge-bestseller", "Bestseller Badge", "وسام الأكثر مبيعاً", "M20 10h60v60l-30 20-30-20V10zM40 30l10-10 10 10-10 10-10-10z"],
    ["badge-new", "New Badge", "وسام جديد", "M20 10h60v60l-30 20-30-20V10zM50 25v30M35 40h30"],
    ["badge-sale", "Sale Badge", "وسام تخفيض", "M20 10h60v60l-30 20-30-20V10zM35 30h30L50 50"],
    ["stamp-circle", "Circle Stamp", "ختم دائري", "M50 12a38 38 0 110 76 38 38 0 010-76zM50 30v20H35M55 50l12 15"],
    ["stamp-corner", "Corner Stamp", "ختم زاوية", "M70 20L50 40V20h20zM30 80L50 60v20H30zM80 30L60 50h20V30zM20 70L40 50H20v20z"],
    ["label-string", "String Tag", "بطاقة بخيط", "M70 35l10-15 5 3-10 15M25 15c0 0-15 0-15 15s25 10 25 10 5 15 20 15 15-10 15-10"],
  ] as const).map(([id, en, ar, d]: any, i) => ({
    id: `label-${i}`,
    name: { en, ar },
    category: "labels",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "label", "tag"],
  })),

  // ============ FOOD & DRINK (15) ============
  ...([
    ["coffee-cup", "Coffee Cup", "كوب قهوة", "M25 30h35l-5 45H30l-5-45zM60 40h10a10 10 0 010 20H60"],
    ["pizza-slice", "Pizza Slice", "شريحة بيتزا", "M50 15L15 80h70L50 15zM35 55l5 5M50 50l5 10M40 40l3 5"],
    ["burger", "Burger", "برجر", "M15 35h70M15 50h70M15 60h70M15 65h70M25 35v-10h50v10"],
    ["hotdog", "Hot Dog", "هوت دوج", "M20 35h60l8 15-8 15H20l-8-15z"],
    ["fries", "Fries", "بطاطس مقلية", "M50 90V40M35 85V50M65 85V50M25 75V60M75 75V60M20 40h60l-5 15H25z"],
    ["donut", "Donut", "دونات", "M50 30a20 20 0 110 40 20 20 0 010-40zM50 40a10 10 0 110 20 10 10 0 010-20z"],
    ["ice-cream", "Ice Cream", "آيس كريم", "M35 30h30v25a25 25 0 01-30 0V30zM45 10h10l-5 20z"],
    ["bottle", "Bottle", "زجاجة", "M35 15h30v15l-10 10v35H35V40L25 30V15zM35 65h30"],
    ["can", "Can", "علبة", "M30 20h40v60a5 5 0 01-5 5H35a5 5 0 01-5-5V20zM30 35h40M30 55h40"],
    ["apple", "Apple", "تفاحة", "M50 20c-15-5-25 5-25 20s10 30 25 35 25-20 25-35S65 15 50 20zM50 20l5 10"],
    ["leaf-herb", "Herb Leaf", "ورقة نبات", "M50 90V50c0-20 15-35 35-40-5 20-20 30-35 35"],
    ["bread", "Bread", "خبز", "M20 40c0-10 10-20 30-20s30 10 30 20v5H20v-5zM20 45h60v5a10 10 0 01-10 10H30a10 10 0 01-10-10v-5z"],
    ["egg", "Egg", "بيضة", "M50 15c-15 0-25 15-25 30s10 35 25 35 25-20 25-35-10-30-25-30z"],
    ["wine-glass", "Wine Glass", "كأس نبيذ", "M40 10h20l-5 40a15 15 0 01-10 0L40 10zM45 55v25h10V55"],
    ["cocktail", "Cocktail", "كوكتيل", "M25 15h50L50 50v30h-5M35 80h30"],
  ] as const).map(([id, en, ar, d]: any, i) => ({
    id: `food-${i}`,
    name: { en, ar },
    category: "food",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "food", "drink"],
  })),

  // ============ NATURE & PLANTS (15) ============
  ...([
    ["tree", "Tree", "شجرة", "M50 10l-25 35h15v30h20V45h15L50 10z"],
    ["flower", "Flower", "زهرة", "M50 40a15 15 0 015 25 15 15 0 01-5-25zM50 55v25M35 50l-20 10M65 50l20 10M35 50l-15-15M65 50l15-15"],
    ["leaf", "Leaf", "ورقة", "M85 15c-5 30-25 50-55 70l5-15c25-15 40-35 50-55z"],
    ["mountain", "Mountain", "جبل", "M10 80l25-45 15 20 15-30 25 55H10z"],
    ["sun", "Sun", "شمس", "M50 30a20 20 0 110 40 20 20 0 010-40zM50 10v5M50 85v5M20 50h-5M85 50h5M30 30l-3-3M73 73l3 3M30 70l-3 3M73 27l3-3"],
    ["moon", "Moon", "قمر", "M55 15a35 35 0 100 70 30 30 0 110-70z"],
    ["cloud", "Cloud", "سحابة", "M30 45a15 15 0 110-30 20 20 0 0138-5 12 12 0 010 35H30z"],
    ["rain", "Rain", "مطر", "M30 35a12 12 0 110-24 16 16 0 0130-4 10 10 0 010 28H30zM25 55v10M50 50v15M75 55v10M35 70v10M60 65v10"],
    ["snowflake", "Snowflake", "ندفة ثلج", "M50 10v80M15 50h70M28 28l44 44M72 28L28 72"],
    ["lightning", "Lightning", "برق", "M45 10l-25 45h20l-5 35 30-50H45z"],
    ["rainbow", "Rainbow", "قوس قزح", "M15 65a35 35 0 0170 0M25 65a25 25 0 0150 0M35 65a15 15 0 0130 0"],
    ["palm-tree", "Palm Tree", "نخلة", "M48 90V50M48 50c-20 0-30 15-35 25 10-10 20-15 35-15M48 50c20 0 30 15 35 25-10-10-20-15-35-15M40 30l10 10 10-10"],
    ["cactus", "Cactus", "صبار", "M45 90V30a10 10 0 1110 0v60H45zM35 50h-5a5 5 0 110-10h5M60 40h5a5 5 0 010 10h-5"],
    ["seedling", "Seedling", "شتلة", "M50 85V40M50 40c-15 0-28 10-35 25 5-25 20-40 35-40s30 15 35 40c-7-15-20-25-35-25z"],
    ["water-drop", "Water Drop", "قطرة ماء", "M50 15L25 55c-5 15 5 30 25 30s30-15 25-30L50 15z"],
  ] as const).map(([id, en, ar, d]: any, i) => ({
    id: `nature-${i}`,
    name: { en, ar },
    category: "nature",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "nature", "plant"],
  })),

  // ============ INDUSTRY & TOOLS (15) ============
  ...([
    ["gear", "Gear", "ترس", "M50 30a20 20 0 110 40 20 20 0 010-40zM50 15a35 35 0 000 70 35 35 0 000-70M50 12v6M50 82v6M18 30l5 3M77 67l5 3M18 70l5-3M77 33l5-3"],
    ["wrench", "Wrench", "مفتاح ربط", "M30 75l35-35a10 10 0 0014-14L65 40 50 25l15 15-15 15 10 10 5-5a10 10 0 00-14 14L25 70l-5 5z"],
    ["hammer", "Hammer", "مطرقة", "M50 25l-25 25L15 40 40 15l10 10zM25 50l-10 35 15 5 10-30"],
    ["screwdriver", "Screwdriver", "مفك براغي", "M50 15v50l-10 20h20L50 65M40 80h20"],
    ["factory", "Factory", "مصنع", "M10 85V35l30 20V35l30 20V35l20 15v35H10zM10 55h80M10 70h80"],
    ["tools", "Tools", "أدوات", "M25 25l15 15-15 15M55 15v50l-15 15h30L55 65"],
    ["paint-bucket", "Paint Bucket", "دلو طلاء", "M35 15l25 25-25 25L20 40l15-25zM30 45l40 10a5 5 0 01-5 5H40a10 10 0 010-15z"],
    ["ruler", "Ruler", "مسطرة", "M25 15h50v10H30v5h45v10H30v5h45v10H30v5h45v10H25V15z"],
    ["compass", "Compass", "فرجار", "M50 15a35 35 0 110 70 35 35 0 010-70zM50 50l20-20M50 50l-10 30"],
    ["drill", "Drill", "مثقاب", "M30 50l40-30a10 10 0 0114 14L54 64l-10-14M45 55l25 25M30 50l-5 20h15l-5-15"],
    ["pliers", "Pliers", "كماشة", "M25 25l20 20-20 20 10 10 25-30-10-10-15-15-10 5zM25 25L15 15"],
    ["saw", "Saw", "منشار", "M85 50c0 20-35 35-60 35-10 0-15-5-15-10s5-10 15-10h20l10-15h20l10-15-15-10 15-10 10 10v10z"],
    ["welding", "Welding", "لحام", "M40 30c-10 15-15 30-10 40s15 15 30 10M60 30l5 10M15 15l70 70"],
    ["cog", "Cog", "ترس صغير", "M50 35a15 15 0 110 30 15 15 0 010-30zM50 20v5M50 75v5M25 35l4 3M71 62l4 3M25 65l4-3M71 38l4-3"],
    ["microscope", "Microscope", "مجهر", "M40 70h20l-5 15H45l-5-15zM45 50c0-10 10-15 10-25s-10-15-10-15 10 5 10 15-10 15-10 25z"],
  ] as const).map(([id, en, ar, d]: any, i) => ({
    id: `industry-${i}`,
    name: { en, ar },
    category: "industry",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "industry", "tool"],
  })),

  // ============ MEDICAL & SAFETY (12) ============
  ...([
    ["cross", "Medical Cross", "صليب طبي", "M35 15h30v20h20v30H65v20H35V65H15V35h20V15z"],
    ["heart-pulse", "Heart Pulse", "نبض قلب", "M50 20a32 32 0 0132 32c0 24-32 42-32 42S18 76 18 52a32 32 0 0132-32zM10 52h20l5-15 10 30 10-25 5 10h30"],
    ["bandage", "Bandage", "ضمادة", "M30 30l40 40M25 40l35-10M35 80l40-35M20 50l40-15"],
    ["pill", "Pill", "حبة دواء", "M35 30a20 20 0 0130-30 20 20 0 01-30 30zM45 20l20 20M40 25l10 10"],
    ["syringe", "Syringe", "حقنة", "M50 15v50l-10 10h20l-10-10V15M45 10h10M30 70h40"],
    ["stethoscope", "Stethoscope", "سماعة", "M15 60c0 15 15 25 30 25s30-10 30-25c0-10-8-18-18-18h-4c-10 0-18 8-18 18"],
    ["safety-glasses", "Safety Glasses", "نظارات أمان", "M15 45h15l10-15h20l10 15h15a10 10 0 010 20H15a10 10 0 010-20z"],
    ["hard-hat", "Hard Hat", "خوذة أمان", "M20 60h60v10H20V60zM30 60V40a20 20 0 0140 0v20"],
    ["fire-extinguisher", "Fire Extinguisher", "طفاية حريق", "M40 15h20v20H40V15zM35 35h30v5l10 40c0 5-5 10-10 10H35c-5 0-10-5-10-10l10-40V35z"],
    ["first-aid", "First Aid Kit", "حقيبة إسعاف", "M30 20h40v8h15v52H15V28h15v-8zM45 35h10v12h12v10H55v12H45V57H33V47h12V35z"],
    ["biohazard", "Biohazard", "خطر بيولوجي", "M50 35a15 15 0 110 30 15 15 0 010-30zM50 12v8M50 80v8M18 50h8M74 50h8M28 28l6 6M66 66l6 6M28 72l6-6M66 34l6-6"],
    ["radiation", "Radiation", "إشعاع", "M50 35a15 15 0 110 30 15 15 0 010-30zM50 65v15M35 50l-20 10M65 50l20 10M35 50L15 40M65 50L85 40"],
  ] as const).map(([id, en, ar, d]: any, i) => ({
    id: `medical-${i}`,
    name: { en, ar },
    category: "medical",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "medical", "safety"],
  })),

  // ============ TRANSPORT & LOGISTICS (12) ============
  ...([
    ["truck", "Truck", "شاحنة", "M15 60h10v-5l-10-5v10zM25 65a10 10 0 1020 0 10 10 0 00-20 0zM40 50h35l10 15H40V50zM65 65a10 10 0 1020 0 10 10 0 00-20 0zM25 35h25v15H25V35z"],
    ["package-box", "Package Box", "صندوق", "M30 20h40l15 20v40H15V40l15-20zM15 40h70M40 20v60"],
    ["airplane", "Airplane", "طائرة", "M60 50l20-5 10 5-10 10-20-5zM50 55l-15 15h-5l5-15H15l-5 5v-10l5 5h35l-5-15h5z"],
    ["ship", "Ship", "سفينة", "M15 70c10-10 25-5 35-5s25-5 35 5H15zM30 65l5-30h30l5 30M40 15v20M50 25l10-10"],
    ["bicycle", "Bicycle", "دراجة", "M45 70a15 15 0 11-30 0 15 15 0 0130 0zM85 70a15 15 0 11-30 0 15 15 0 0130 0zM25 55l25 15 20-30H55M40 70l10-15 15-10"],
    ["car", "Car", "سيارة", "M20 55h-5a5 5 0 00-5 5v10h10M80 55h5a5 5 0 015 5v10H80M25 65a8 8 0 1016 0 8 8 0 00-16 0zM59 65a8 8 0 1016 0 8 8 0 00-16 0zM30 40h40l10 15H30V40z"],
    ["forklift", "Forklift", "رافعة شوكية", "M10 50h60v30H10V50zM30 50V35M50 50V35M70 35h15v25H70M15 65h50"],
    ["warehouse", "Warehouse", "مستودع", "M15 80V40l35-25 35 25v40H65V55H35v25H15z"],
    ["anchor", "Anchor", "مرساة", "M50 15v55a15 15 0 0030 0M50 15a15 15 0 00-30 0M50 85V70M35 30h30M10 40h20M70 40h20"],
    ["compass-rose", "Compass Rose", "وردة البوصلة", "M50 10l5 35 35 5-35 5-5 35-5-35-35-5 35-5z"],
    ["globe", "Globe", "كرة أرضية", "M50 10a40 40 0 110 80 40 40 0 010-80zM20 30h60M20 70h60M10 50h80M30 15c-5 15-5 55 0 70M70 15c5 15 5 55 0 70"],
    ["route", "Route", "مسار", "M25 30a10 10 0 110-20 10 10 0 010 20zM75 70a10 10 0 110-20 10 10 0 010 20zM25 20c5 20 25 30 30 50"],
  ] as const).map(([id, en, ar, d]: any, i) => ({
    id: `logistics-${i}`,
    name: { en, ar },
    category: "logistics",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "transport", "logistics"],
  })),

  // ============ OFFICE & BUSINESS (12) ============
  ...([
    ["briefcase", "Briefcase", "حقيبة", "M30 30V20a10 10 0 0110-10h20a10 10 0 0110 10v10h15v50H15V30h15zM30 30h40"],
    ["chart-bar", "Bar Chart", "مخطط عمودي", "M15 75h70M20 65v-30h15v30M40 65V25h15v40M60 65V35h15v30"],
    ["chart-line", "Line Chart", "مخطط خطي", "M15 75h70M20 65l25-30 15 15 25-35"],
    ["chart-pie", "Pie Chart", "مخطط دائري", "M50 10a40 40 0 110 80 40 40 0 010-80zM50 50L28 28M50 50l30-15a40 40 0 01-15 35z"],
    ["clipboard", "Clipboard", "حافظة", "M40 15h20a5 5 0 015 5v5H35v-5a5 5 0 015-5zM30 25h40v55H30V25zM35 35h30M35 45h25M35 55h30"],
    ["document", "Document", "مستند", "M30 15h25l20 20v45a5 5 0 01-5 5H30a5 5 0 01-5-5V20a5 5 0 015-5zM55 15v20h20"],
    ["folder", "Folder", "مجلد", "M15 25a5 5 0 015-5h22l8 10h35a5 5 0 015 5v35a5 5 0 01-5 5H20a5 5 0 01-5-5V25z"],
    ["envelope", "Envelope", "ظرف", "M15 25h70v50H15V25zM15 30l35 25 35-25"],
    ["printer", "Printer", "طابعة", "M25 35h50v25H25V35zM30 60v20h40V60M30 20h40v15H30V20z"],
    ["calculator", "Calculator", "آلة حاسبة", "M25 15h50v70H25V15zM30 30h40M30 40h10v15H30V40zM50 45l20-20M60 40l10-15M70 40l-15-15M30 65h40v15H30V65z"],
    ["safe", "Safe", "خزنة", "M25 20h50v55H25V20zM50 30a15 15 0 110 30 15 15 0 010-30zM50 40v10M45 45h10M40 75h20"],
    ["bank", "Bank", "بنك", "M10 40l40-25 40 25H10zM20 40v30h15V40zM45 40v30h10V40zM65 40v30h15V40zM15 75h70"],
  ] as const).map(([id, en, ar, d]: any, i) => ({
    id: `business-${i}`,
    name: { en, ar },
    category: "business",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "office", "business"],
  })),

  // ============ TECHNOLOGY (10) ============
  ...([
    ["laptop", "Laptop", "حاسوب محمول", "M15 25h70v45H15V25zM15 70h70l-5 10H20l-5-10z"],
    ["monitor", "Monitor", "شاشة", "M20 20h60v40H20V20zM20 60h60H20zM40 60v15h20V60"],
    ["smartphone", "Smartphone", "هاتف ذكي", "M35 15h30v70H35V15zM48 72h4"],
    ["tablet", "Tablet", "جهاز لوحي", "M30 15h40v70H30V15zM48 72h4"],
    ["camera", "Camera", "كاميرا", "M25 30h15l10-10h20l10 10h15v40H25V30zM50 40a15 15 0 110 30 15 15 0 010-30z"],
    ["headphones", "Headphones", "سماعات", "M30 45v-5a20 20 0 0140 0v5M25 55a10 10 0 00-10 10v10a10 10 0 0020 0V55zM75 55a10 10 0 0110 10v10a10 10 0 01-20 0V55z"],
    ["wifi", "WiFi", "واي فاي", "M25 45a35 35 0 0150 0M35 55a25 25 0 0130 0M45 65a15 15 0 0110 0M50 75a5 5 0 110 0"],
    ["bluetooth", "Bluetooth", "بلوتوث", "M35 25l30 25-30 25V35l30 25M50 10v80"],
    ["usb", "USB", "USB", "M40 15h20v30l-10 10v30H40V55L50 45V15z"],
    ["battery", "Battery", "بطارية", "M35 25h40v5h10v40h-10v5H35V25zM40 35h30v30H40V35zM40 45h30"],
  ] as const).map(([id, en, ar, d]: any, i) => ({
    id: `tech-${i}`,
    name: { en, ar },
    category: "tech",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "technology"],
  })),

  // ============ CLEANING & HYGIENE (10) ============
  ...([
    ["trash", "Trash Can", "سلة مهملات", "M30 25h40v55a5 5 0 01-5 5H35a5 5 0 01-5-5V25zM25 25h50M40 25V15h20v10"],
    ["broom", "Broom", "مكنسة", "M70 15l-40 50M75 25L25 85M15 85l60-60M20 80l10-10"],
    ["spray", "Spray Bottle", "زجاجة رش", "M40 15h20v20l10 10v40H30V45l10-10V15zM30 45h40M35 60h30"],
    ["soap", "Soap", "صابون", "M30 20h40l5 25v35c0 5-5 10-10 10H35c-5 0-10-5-10-10V45l5-25zM30 50h40M35 10h30v10H35V10z"],
    ["tissue", "Tissue Box", "علبة مناديل", "M30 25h40l10 20v25H20V45l10-20zM20 70h60M30 35h40"],
    ["hand-wash", "Hand Wash", "غسيل يدين", "M40 15h20l5 15H35l5-15zM30 35h40v30c0 10-8 18-18 18H44a15 15 0 01-14-15V35z"],
    ["shower", "Shower", "دش", "M40 30h20v25c0 10-5 15-10 20H50c-5-5-10-10-10-20V30zM30 80h40M50 85v5"],
    ["toilet", "Toilet", "مرحاض", "M35 30a15 15 0 0130 0v25a10 10 0 01-10 10H45a10 10 0 01-10-10V30zM40 65h20l5 15H35l5-15z"],
    ["detergent", "Detergent", "منظف", "M35 15h30l5 20v40c0 5-5 10-10 10H40c-5 0-10-5-10-10V35l5-20zM35 45h30M40 70h20"],
    ["gloves", "Gloves", "قفازات", "M20 30c0-15 5-25 15-25s15 10 15 25v5M50 30c0-15 5-25 15-25s15 10 15 25v5M20 35h60v20L60 85H40L20 55V35z"],
  ] as const).map(([id, en, ar, d]: any, i) => ({
    id: `cleaning-${i}`,
    name: { en, ar },
    category: "cleaning",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "cleaning", "hygiene"],
  })),

  // ============ BEAUTY & FASHION (10) ============
  ...([
    ["lipstick", "Lipstick", "أحمر شفاه", "M45 15h10l5 20v-5h20l5 20v30c0 5-5 10-10 10H35c-5 0-10-5-10-10V50l5-20h20v5"],
    ["perfume", "Perfume", "عطر", "M40 20h20v10l10 10v40c0 5-5 10-10 10H40c-5 0-10-5-10-10V40l10-10V20zM35 50h30M50 20V10"],
    ["mirror", "Mirror", "مرآة", "M50 15a30 30 0 110 60 30 30 0 010-60zM50 25a10 10 0 100 20 10 10 0 000-20zM35 60l-10 15M65 60l10 15"],
    ["comb", "Comb", "مشط", "M15 70V30a20 20 0 1140 0v40M25 70V30M35 70V30M45 70V30M15 70h40M20 85h30v5H20z"],
    ["scissors", "Scissors", "مقص", "M25 30a15 15 0 1122 22L40 60a15 15 0 11-8-8l7-14a15 15 0 01-14-8zM60 35l25-25M75 40l-15-15"],
    ["needle", "Needle & Thread", "إبرة وخيط", "M60 25c10-15 25-15 25-5S65 40 50 55M75 20L20 75M25 80c5 5 12-2 10-10"],
    ["hanger", "Hanger", "شماعة", "M50 25a15 15 0 0115 15c0 8-5 12-15 20L15 75h70"],
    ["dress", "Dress", "فستان", "M50 15c-10 0-18 8-15 20l-15 20h15v30h30V55h15L65 35c3-12-5-20-15-20z"],
    ["shoe", "Shoe", "حذاء", "M25 55L15 70h20v15h30V70h25L70 55H25zM25 50V35a10 10 0 0110-10h30a10 10 0 0110 10v15"],
    ["bag-shopping", "Shopping Bag", "حقيبة تسوق", "M35 20h30l10 45c0 5-5 10-10 10H35c-5 0-10-5-10-10l10-45zM50 30v20M40 40h20"],
  ] as const).map(([id, en, ar, d]: any, i) => ({
    id: `beauty-${i}`,
    name: { en, ar },
    category: "beauty",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "beauty", "fashion"],
  })),

  // ============ SPORTS & FITNESS (10) ============
  ...([
    ["soccer-ball", "Soccer Ball", "كرة قدم", "M50 10a40 40 0 110 80 40 40 0 010-80zM22 30h56M22 70h56M15 50h70L50 90M50 10l-25 65M50 10l25 65"],
    ["basketball", "Basketball", "كرة سلة", "M50 10a40 40 0 110 80 40 40 0 010-80zM15 50h70M50 10l-20 35 20 35 20-35"],
    ["dumbbell", "Dumbbell", "دمبل", "M15 35h10v30H15V35zM30 30h5v40h-5V30zM65 30h5v40h-5V30zM75 35h10v30H75V35zM35 40h30v20H35V40z"],
    ["running", "Running", "جري", "M55 15a10 10 0 11-20 0 10 10 0 0120 0zM35 40l-10 15 10 10M35 40l10-10 15 10 10 25M30 80l10-20 15 10 10 15"],
    ["bicycle-2", "Cycling", "ركوب دراجة", "M30 65a15 15 0 11-30 0 15 15 0 0130 0zM90 65a15 15 0 11-30 0 15 15 0 0130 0zM25 55l20 10 15-25H55M45 65l10-15 15-10"],
    ["swimming", "Swimming", "سباحة", "M20 55h60v5c0 10-8 20-20 20H40c-12 0-20-10-20-20v-5zM35 40c10-10 20 5 10 15M60 30H40l5-10h20l-5 10z"],
    ["tent", "Tent", "خيمة", "M15 80l35-55 35 55H15zM35 80V60a10 10 0 0130 0v20"],
    ["target", "Target", "هدف", "M50 10a40 40 0 110 80 40 40 0 010-80zM50 25a25 25 0 110 50 25 25 0 010-50zM50 38a12 12 0 110 24 12 12 0 010-24z"],
    ["medal-2", "Medal Sport", "ميدالية رياضية", "M35 45l-20-35h25l10 20M65 45l20-35H65L50 30M50 30L40 10h20L50 30zM50 50a20 20 0 110 40 20 20 0 010-40z"],
    ["whistle", "Whistle", "صفارة", "M25 55c0-10 8-18 18-18s18 8 18 18-8 18-18 18-18-8-18-18zM58 55h22a10 10 0 010 20H65"],
  ] as const).map(([id, en, ar, d]: any, i) => ({
    id: `sports-${i}`,
    name: { en, ar },
    category: "sports",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "sports", "fitness"],
  })),

  // ============ HOME & LIVING (10) ============
  ...([
    ["house", "House", "منزل", "M50 10L15 40v45h70V40L50 10zM35 85V55h30v30"],
    ["lamp", "Lamp", "مصباح", "M40 45h20L50 15l-10 30zM45 60h10v15H45zM35 75h30v5H35z"],
    ["sofa", "Sofa", "أريكة", "M20 55h-5a5 5 0 00-5 5v15h15M80 55h5a5 5 0 015 5v15H85M25 55h50v20H25V55zM25 55V40a10 10 0 0110-10h30a10 10 0 0110 10v15"],
    ["bed", "Bed", "سرير", "M15 30h70v40H15V30zM15 55h70M25 55v15M75 55v15M25 40h20v10H25V40z"],
    ["chair", "Chair", "كرسي", "M30 20h40v15H30V20zM25 55h50l-5 25H30l-5-25zM45 80v5h10v-5"],
    ["table", "Table", "طاولة", "M15 65h70v10H15V65zM35 20h30v45H35V20z"],
    ["clock", "Clock", "ساعة", "M50 10a40 40 0 110 80 40 40 0 010-80zM50 30v20l15 15"],
    ["keys", "Keys", "مفاتيح", "M25 50a15 15 0 1122 13l-12 12 10 10 10-10M25 50l10 10M50 30h20M55 40h15"],
    ["lightbulb", "Lightbulb", "مصباح كهربائي", "M50 10c-15 0-25 10-25 25 0 10 5 18 12 25h26c7-7 12-15 12-25 0-15-10-25-25-25zM40 65h20v5H40v-5zM42 75h16v5H42v-5z"],
    ["plant-pot", "Plant Pot", "أصيص نبات", "M35 50h30l-5 30H40l-5-30zM50 20V10M35 30h30M40 50v10M55 55V50M60 50v5"],
  ] as const).map(([id, en, ar, d]: any, i) => ({
    id: `home-${i}`,
    name: { en, ar },
    category: "home",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "home", "living"],
  })),

  // ============ ANIMALS & PETS (10) ============
  ...([
    ["dog", "Dog", "كلب", "M30 30c-10 10-15 25-10 35l-5 10h15l5-10h10v10h15V55l10-5c0-15-10-25-20-25s-15 5-20 5z"],
    ["cat", "Cat", "قطة", "M25 25l10 15-5 5v15l10 10v20l10-5v-15h10v-5l5-5V40l15-15M35 55h30"],
    ["bird", "Bird", "طائر", "M45 20c-20 0-30 15-30 30 0 15 10 25 20 30l-10 5h30l-5-10c15-5 25-20 25-35 0-15-10-30-30-30-5 0-10 5-15 10"],
    ["fish", "Fish", "سمكة", "M40 50c0-25 35-40 55-15S95 75 40 50zM40 50L15 35v30l25-15zM20 45h5v10h-5z"],
    ["paw", "Paw Print", "بصمة مخلب", "M30 30a10 10 0 11-20 0 10 10 0 0120 0zM90 30a10 10 0 11-20 0 10 10 0 0120 0zM60 20a10 10 0 11-20 0 10 10 0 0120 0zM50 45a20 20 0 11-40 0 20 20 0 0140 0z"],
    ["rabbit", "Rabbit", "أرنب", "M30 35c15-20 40-10 45 10s-5 25-15 35l15 10H35l-10-15c-10-15-5-35 5-40z"],
    ["elephant", "Elephant", "فيل", "M25 40c0-15 20-25 40-25s30 15 30 30v15l-10 5v15h-10V70H35v15H25V60l-10-5V45l10-5z"],
    ["butterfly", "Butterfly", "فراشة", "M50 50c-10-20-30-30-40-20s5 30 40 20zM50 50c10-20 30-30 40-20s-5 30-40 20zM50 50v40"],
    ["snail", "Snail", "حلزون", "M55 60c-15 0-25-5-25-20s10-20 25-20 25 5 25 20-10 20-25 20zM15 75c15-15 30-5 35 5S35 90 15 75z"],
    ["bee", "Bee", "نحلة", "M50 20c10 0 18 8 18 18 0 5-2 10-5 14h-26c-3-4-5-9-5-14 0-10 8-18 18-18zM30 40c10-5 30-5 40 0l5 10-45-5zM45 52l-15 15M55 52l15 15"],
  ] as const).map(([id, en, ar, d]: any, i) => ({
    id: `animals-${i}`,
    name: { en, ar },
    category: "animals",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "animal", "pet"],
  })),

  // ============ TRAVEL & PLACES (10) ============
  ...([
    ["suitcase", "Suitcase", "حقيبة سفر", "M30 30V20a10 10 0 0110-10h20a10 10 0 0110 10v10h15v50H15V30h15zM30 50h40M30 65h40"],
    ["passport", "Passport", "جواز سفر", "M30 20h40v50a10 10 0 01-10 10H40a10 10 0 01-10-10V20zM35 30h30M35 40h30M35 50h15"],
    ["map", "Map", "خريطة", "M15 20l20-5 30 10 20-5v60l-20 5-30-10-20 5V20zM35 15v50M65 25v50"],
    ["camera-travel", "Travel Camera", "كاميرا سفر", "M25 35h15l10-10h20l10 10h15v35H25V35zM50 45a15 15 0 110 30 15 15 0 010-30z"],
    ["beach", "Beach", "شاطئ", "M15 80c15-10 35-10 50-10s20-5 35 10M30 80V60M85 70V30M40 70V50M70 65V35M20 65L10 50M50 75V55M60 55c0-10 15-15 25-10"],
    ["mountain-2", "Mountain Range", "سلسلة جبال", "M5 80l15-40 10 15 15-35 10 15 15-30 10 15 15-25v85H5z"],
    ["island", "Island", "جزيرة", "M30 65c0-15 10-25 20-25s20 10 20 25M15 80c10-10 25-5 35-5s25-5 35 5"],
    ["hotel", "Hotel", "فندق", "M25 80V30l25-20 25 20v50H25zM35 80V50h30v30M45 60h10v20H45z"],
    ["monument", "Monument", "نصب تذكاري", "M45 20v-5h10v5l15 20v40H30V40l15-20zM20 80h60M35 60h30M40 45h20"],
    ["campfire", "Campfire", "نار مخيم", "M50 50c-15-15-10-35 0-40 10 5 15 25 0 40zM30 65c0-10 10-15 20-15s20 5 20 15M20 75h60"],
  ] as const).map(([id, en, ar, d]: any, i) => ({
    id: `travel-${i}`,
    name: { en, ar },
    category: "travel",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "travel", "place"],
  })),

  // ============ MUSIC & ARTS (10) ============
  ...([
    ["music-note", "Music Note", "نوتة موسيقية", "M40 70V15l40-5v60M40 70a15 15 0 11-30 0 15 15 0 0130 0zM80 65a15 15 0 11-30 0 15 15 0 0130 0z"],
    ["music-notes", "Music Notes", "نوتات موسيقية", "M35 65V20l45-5v50M35 65a12 12 0 11-24 0 12 12 0 0124 0zM80 60a12 12 0 11-24 0 12 12 0 0124 0z"],
    ["microphone", "Microphone", "ميكروفون", "M40 20c0-8 10-15 10-15s10 7 10 15v20c0 8-10 15-10 15s-10-7-10-15V20zM30 45c-5 20 10 35 20 35s25-15 20-35M45 80v10h10V80"],
    ["palette-art", "Art Palette", "لوحة ألوان", "M50 15c-25 0-40 15-40 35s15 35 35 35c10 0 18-5 18-12 0-3-2-8-2-10 0-5 5-8 10-8h8c15 0 21-15 21-30 0-20-20-30-50-30zM25 40a8 8 0 110 16 8 8 0 010-16z"],
    ["brush", "Paint Brush", "فرشاة رسم", "M55 15c-15 15-25 30-15 40s25 0 40-15c10-10 5-25-10-25s-15 0-15 0zM40 55L15 85"],
    ["camera-art", "Art Camera", "كاميرا فنية", "M25 25h15l10-10h20l10 10h15v40H25V25z"],
    ["film", "Film Strip", "شريط فيلم", "M20 20h60v60H20V20zM25 25h10v10H25V25zM65 25h10v10H65V25zM25 65h10v10H25V65zM65 65h10v10H65V65z"],
    ["theater", "Theater Masks", "أقنعة مسرح", "M30 35c-10 0-18 12-18 25s8 20 18 20 18-7 18-20-8-25-18-25zM70 35c10 0 18 12 18 25s-8 20-18 20-18-7-18-20 8-25 18-25z"],
    ["guitar", "Guitar", "غيتار", "M45 85V30l-15-5M45 30l15-5M55 25v60M55 85a8 8 0 01-16 0M45 25a8 8 0 0116 0"],
    ["piano", "Piano", "بيانو", "M15 50h70v25H15V50zM25 50v15M35 50v15M45 50v15M55 50v15M65 50v15M75 50v15"],
  ] as const).map(([id, en, ar, d]: any, i) => ({
    id: `music-${i}`,
    name: { en, ar },
    category: "music",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "music", "art"],
  })),

  // ============ EDUCATION (10) ============
  ...([
    ["book", "Book", "كتاب", "M25 15h50v70H25V15zM25 15v70M25 50h50"],
    ["books", "Books", "كتب", "M20 70V20l20-5v55M40 65V15l20-5v55M60 60V10l20-5v55"],
    ["graduation", "Graduation Cap", "قبعة تخرج", "M50 15L10 45l40 25 40-25-40-30zM20 55v15c0 10 30 20 30 20s30-10 30-20V55"],
    ["pencil", "Pencil", "قلم رصاص", "M65 15l-50 55-5 20 20-5 50-55-15-15zM55 25l15 15"],
    ["pen", "Pen", "قلم", "M55 25l-35 45-5 15 20-5 35-45-15-10zM65 15l10 10M85 5l-15 25"],
    ["ruler-triangle", "Triangle Ruler", "مسطرة مثلثة", "M15 80h70L50 15 15 80zM50 15v65M40 45l10-15 10 15"],
    ["globe-education", "Globe", "كرة تعليمية", "M50 15a35 35 0 110 70 35 35 0 010-70zM22 50h56M35 25c-5 15-5 45 0 60M65 25c5 15 5 45 0 60"],
    ["atom", "Atom", "ذرة", "M50 50m-5 0a5 5 0 1110 0 5 5 0 01-10 0zM25 25c15-10 35-10 50 0M25 75c15 10 35 10 50 0M15 50c-10-15-10-35 0-50M85 50c10-15 10-35 0-50"],
    ["beaker", "Beaker", "دورق", "M35 15h30l-5 20v30l15 15v5H25v-5l15-15V35l-5-20zM30 65h40"],
    ["magnifier", "Magnifying Glass", "عدسة مكبرة", "M40 15a25 25 0 110 50 25 25 0 010-50zM58 58l22 22"],
  ] as const).map(([id, en, ar, d]: any, i) => ({
    id: `education-${i}`,
    name: { en, ar },
    category: "education",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "education"],
  })),

  // ============ CELEBRATION (10) ============
  ...([
    ["confetti", "Confetti", "قصاصات", "M50 10v80M30 20l-10-5M70 35l15 10M25 55l-10-5M80 60l10 15M35 80l-5-10M65 75l5 15M15 30l5 10M85 30l-5-15"],
    ["gift", "Gift Box", "صندوق هدية", "M30 30h40v55H30V30zM50 30v55M30 30a15 15 0 0130 0 15 15 0 0130-15v-5z"],
    ["balloon", "Balloon", "بالون", "M50 25c-15 0-25 15-25 30s10 25 25 25 25-10 25-25-10-30-25-30zM50 70v15M40 85h20"],
    ["cake", "Cake", "كعكة", "M30 50h40v25H30V50zM25 55l-5 10h60l-5-10M35 40h30v10H35V40zM50 30V20M45 35h10L50 15z"],
    ["fireworks", "Fireworks", "ألعاب نارية", "M50 50L30 15M50 50L70 15M50 50L15 35M50 50L85 35M50 50L15 65M50 50L85 65M50 50L30 85M50 50L70 85M50 50h30M50 50V15"],
    ["party-hat", "Party Hat", "قبعة حفلة", "M30 70l20-50 20 50H30zM35 70l15-40 15 40"],
    ["sparkles", "Sparkles", "بريق", "M50 15l5 10 10-5-5 15 15 5-15 5 5 15-10-5-5 10-5-10-10 5 5-15-15-5 15-5-5-15 10 5z"],
    ["ribbon-2", "Ribbon Bow", "شريط زينة", "M50 50c-10-15-30-20-40-10s0 40 40 10zM50 50c10-15 30-20 40-10s0 40-40 10zM50 50v35"],
    ["candle", "Candle", "شمعة", "M45 15c0-5 5-10 5-10s5 5 5 10v10H45V15zM40 45h20l-5 35H45l-5-35z"],
    ["balloons", "Balloons", "بالونات", "M30 30c-10 0-18 10-18 22s8 18 18 18 18-6 18-18-8-22-18-22zM70 25c10 0 18 10 18 22s-8 18-18 18-18-6-18-18 8-22 18-22zM40 65l-10 20M60 65l10 20"],
  ] as const).map(([id, en, ar, d]: any, i) => ({
    id: `celebration-${i}`,
    name: { en, ar },
    category: "celebration",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "celebration"],
  })),

  // ============ PACKAGING (10) ============
  ...([
    ["box-simple", "Simple Box", "صندوق بسيط", "M30 25h40l10 15v35H20V40l10-15zM20 40h60M35 25v50"],
    ["box-opened", "Opened Box", "صندوق مفتوح", "M30 25h40l10 15v35H20V40l10-15zM20 40h60M35 25v50M50 25v50M20 55h60"],
    ["box-heart", "Box with Heart", "صندوق بقلب", "M30 25h40l10 15v35H20V40l10-15zM50 35c-5-8-15-8-15 0s15 12 15 12 15-4 15-12-10-8-15 0z"],
    ["box-stack", "Stacked Boxes", "صناديق مكدسة", "M25 30h40l5 10v25H20V40l5-10zM15 55h60l5 10v15H10V65l5-10zM30 70h30"],
    ["bag-paper", "Paper Bag", "حقيبة ورقية", "M30 20h40v5l10 15v40H20V40l10-15V20zM30 40h40M35 20v20M65 20v20"],
    ["bag-pouch", "Pouch", "كيس", "M25 25h50v50a10 10 0 01-10 10H35a10 10 0 01-10-10V25zM30 50h40M35 35h30"],
    ["bottle-pack", "Bottle Packaging", "تغليف زجاجة", "M30 20h40v60a10 10 0 01-10 10H40a10 10 0 01-10-10V20zM35 40h30M35 55h30"],
    ["tube-pack", "Tube", "أنبوب", "M30 15h40v70H30V15zM35 25h30M35 75h30"],
    ["label-sticker", "Sticker", "ملصق", "M50 15c20 0 35 15 35 35s-15 35-35 35S15 70 15 50 30 15 50 15zM35 50l10 10 20-20"],
    ["seal-sticker", "Seal Sticker", "ختم ملصق", "M70 30L50 10 30 30l-10 30 10 30 20 20 20-20 10-30-10-30zM50 35l5 15 15 5-15 5-5 15-5-15-15-5 15-5z"],
  ] as const).map(([id, en, ar, d]: any, i) => ({
    id: `packaging-${i}`,
    name: { en, ar },
    category: "packaging",
    svg: svg(`<path d="${d}"/>`),
    tags: [en.toLowerCase().replace(/\s+/g, "-"), "packaging"],
  })),
]

export const ALL_SHAPES: ShapeItem[] = SHAPES

export function getShapesByCategory(categoryId: string): ShapeItem[] {
  return SHAPES.filter((s) => s.category === categoryId)
}

export function searchShapes(query: string): ShapeItem[] {
  const q = query.toLowerCase()
  return SHAPES.filter(
    (s) =>
      s.name.en.toLowerCase().includes(q) ||
      s.name.ar.includes(query) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
  )
}
