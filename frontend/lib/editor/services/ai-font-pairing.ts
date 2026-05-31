"use client"

export interface FontPair {
  heading: string
  body: string
  description: string
  category: "modern" | "classic" | "playful" | "elegant" | "bold"
}

/**
 * Predefined font pairing suggestions
 * Based on design best practices and common combinations
 */
export const FONT_PAIRINGS: FontPair[] = [
  {
    heading: "Playfair Display",
    body: "Open Sans",
    description: "Elegant serif with clean sans-serif",
    category: "elegant",
  },
  {
    heading: "Montserrat",
    body: "Merriweather",
    description: "Modern sans-serif with readable serif",
    category: "modern",
  },
  {
    heading: "Roboto",
    body: "Roboto Slab",
    description: "Geometric sans with slab serif",
    category: "modern",
  },
  {
    heading: "Oswald",
    body: "Lato",
    description: "Bold condensed with friendly sans",
    category: "bold",
  },
  {
    heading: "Raleway",
    body: "Lora",
    description: "Elegant sans with calligraphic serif",
    category: "elegant",
  },
  {
    heading: "Poppins",
    body: "Source Sans Pro",
    description: "Geometric sans with neutral sans",
    category: "modern",
  },
  {
    heading: "Bebas Neue",
    body: "Roboto",
    description: "Bold display with versatile sans",
    category: "bold",
  },
  {
    heading: "Crimson Text",
    body: "Lato",
    description: "Classic serif with modern sans",
    category: "classic",
  },
  {
    heading: "Futura",
    body: "Georgia",
    description: "Geometric sans with traditional serif",
    category: "classic",
  },
  {
    heading: "Comfortaa",
    body: "Raleway",
    description: "Rounded friendly with elegant sans",
    category: "playful",
  },
]

/**
 * Get font pairing suggestions based on design context
 */
export function getFontPairings(
  category?: FontPair["category"],
  limit: number = 5
): FontPair[] {
  if (category) {
    return FONT_PAIRINGS.filter((pair) => pair.category === category).slice(0, limit)
  }
  return FONT_PAIRINGS.slice(0, limit)
}

/**
 * Get font pairing suggestions based on existing font
 */
export function getFontPairingsForFont(fontFamily: string): FontPair[] {
  // Find pairs that include the font
  const matching = FONT_PAIRINGS.filter(
    (pair) => pair.heading.toLowerCase() === fontFamily.toLowerCase() || pair.body.toLowerCase() === fontFamily.toLowerCase()
  )

  if (matching.length > 0) {
    return matching
  }

  // Return complementary suggestions
  return FONT_PAIRINGS.slice(0, 3)
}

/**
 * Check if font pair has good contrast and readability
 */
export function validateFontPair(heading: string, body: string): {
  valid: boolean
  score: number
  issues: string[]
} {
  const issues: string[] = []
  let score = 100

  // Check if fonts are too similar
  if (heading.toLowerCase() === body.toLowerCase()) {
    issues.push("Heading and body fonts are identical")
    score -= 30
  }

  // Check for common good combinations
  const isKnownPair = FONT_PAIRINGS.some(
    (pair) =>
      (pair.heading.toLowerCase() === heading.toLowerCase() &&
        pair.body.toLowerCase() === body.toLowerCase()) ||
      (pair.heading.toLowerCase() === body.toLowerCase() &&
        pair.body.toLowerCase() === heading.toLowerCase())
  )

  if (!isKnownPair) {
    issues.push("Font combination not in recommended list")
    score -= 10
  }

  return {
    valid: score >= 70,
    score,
    issues,
  }
}

