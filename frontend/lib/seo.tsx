import type { Metadata } from "next"

export interface SEOOptions {
  title?: string
  description?: string
  canonical?: string
  ogImage?: string
  ogType?: string
  twitterHandle?: string
  keywords?: string[]
  robots?: string
  authors?: string[]
  viewport?: string
  jsonLd?: Record<string, unknown>
}

export function generateSEOMetadata(options: SEOOptions): Metadata {
  const {
    title = "PackagePro - B2B Packaging Platform",
    description = "Connect with packaging manufacturers and suppliers in Egypt and the Middle East",
    canonical,
    ogImage = "/og-image.jpg",
    ogType = "website",
    twitterHandle = "@packagepro",
    keywords = [],
    robots = "index, follow",
  } = options

  return {
    title,
    description,
    keywords,
    robots,
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
    openGraph: {
      title,
      description,
      url: canonical,
      type: ogType as any,
      images: [{ url: ogImage }],
      siteName: "PackagePro",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
      creator: twitterHandle,
    },
    alternates: canonical ? { canonical } : undefined,
  }
}

export interface ProductSEOData {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
  rating?: number
  reviews?: number
  inStock: boolean
}

export function generateProductJsonLd(product: ProductSEOData) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image,
    brand: {
      "@type": "Brand",
      name: "PackagePro",
    },
    offers: {
      "@type": "Offer",
      url: `${process.env.NEXT_PUBLIC_APP_URL}/products/${product.id}`,
      priceCurrency: "EGP",
      price: product.price.toString(),
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(product.rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.rating.toString(),
        reviewCount: (product.reviews || 0).toString(),
      },
    }),
  }
}

export function generateOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PackagePro",
    url: process.env.NEXT_PUBLIC_APP_URL,
    logo: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`,
    description: "B2B Packaging Platform connecting manufacturers with traders in Egypt and the Middle East",
    sameAs: [
      "https://www.facebook.com/packagepro",
      "https://www.twitter.com/packagepro",
      "https://www.linkedin.com/company/packagepro",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Business Support",
      telephone: "+20-XXX-XXXX-XXXX",
      email: "support@packagepro.com",
    },
  }
}

export function generateBreadcrumbJsonLd(breadcrumbs: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  }
}

export function generateLocalBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "PackagePro",
    image: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`,
    description: "B2B Packaging Platform - Connecting Manufacturers with Traders",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Cairo",
      addressLocality: "Cairo",
      addressRegion: "Cairo Governorate",
      postalCode: "11571",
      addressCountry: "EG",
    },
    url: process.env.NEXT_PUBLIC_APP_URL,
    telephone: "+20-XXX-XXXX-XXXX",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday"],
        opens: "10:00",
        closes: "16:00",
      },
    ],
    sameAs: [
      "https://www.facebook.com/packagepro",
      "https://www.twitter.com/packagepro",
      "https://www.linkedin.com/company/packagepro",
    ],
  }
}

export function generateFAQJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }
}

export class SEOAnalyzer {
  analyzeTitle(title?: string): { score: number; issues: string[] } {
    const issues: string[] = []
    let score = 100

    if (!title) {
      issues.push("Missing page title")
      score -= 30
    } else if (title.length < 30) {
      issues.push("Title is too short (minimum 30 characters)")
      score -= 15
    } else if (title.length > 60) {
      issues.push("Title is too long (maximum 60 characters)")
      score -= 10
    }

    return { score, issues }
  }

  analyzeDescription(description?: string): { score: number; issues: string[] } {
    const issues: string[] = []
    let score = 100

    if (!description) {
      issues.push("Missing meta description")
      score -= 30
    } else if (description.length < 120) {
      issues.push("Description is too short (minimum 120 characters)")
      score -= 15
    } else if (description.length > 160) {
      issues.push("Description is too long (maximum 160 characters)")
      score -= 10
    }

    return { score, issues }
  }

  analyzeContent(content: string, keywords?: string[]): { score: number; issues: string[] } {
    const issues: string[] = []
    let score = 100

    if (!content || content.length < 300) {
      issues.push("Content is too short (minimum 300 characters)")
      score -= 20
    }

    if (keywords && keywords.length > 0) {
      const contentLower = content.toLowerCase()
      keywords.forEach((keyword) => {
        if (!contentLower.includes(keyword.toLowerCase())) {
          issues.push(`Keyword "${keyword}" not found in content`)
          score -= 5
        }
      })
    }

    return { score, issues }
  }

  analyzeSEO(options: SEOOptions & { content?: string }): {
    score: number
    breakdown: Record<string, number>
    issues: string[]
  } {
    const titleAnalysis = this.analyzeTitle(options.title)
    const descAnalysis = this.analyzeDescription(options.description)
    const contentAnalysis = this.analyzeContent(options.content || "", options.keywords)

    const totalScore = (titleAnalysis.score + descAnalysis.score + contentAnalysis.score) / 3

    return {
      score: Math.round(totalScore),
      breakdown: {
        title: titleAnalysis.score,
        description: descAnalysis.score,
        content: contentAnalysis.score,
      },
      issues: [...titleAnalysis.issues, ...descAnalysis.issues, ...contentAnalysis.issues],
    }
  }
}

export const seoAnalyzer = new SEOAnalyzer()
