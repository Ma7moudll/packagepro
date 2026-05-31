import { NextResponse } from "next/server"

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"

    // Static pages
    const staticPages = [
      { url: "", priority: 1, changefreq: "weekly" },
      { url: "/products", priority: 0.9, changefreq: "daily" },
      { url: "/about", priority: 0.7, changefreq: "monthly" },
      { url: "/contact", priority: 0.7, changefreq: "monthly" },
      { url: "/b2b", priority: 0.8, changefreq: "weekly" },
      { url: "/faq", priority: 0.6, changefreq: "monthly" },
      { url: "/blog", priority: 0.8, changefreq: "weekly" },
      { url: "/privacy", priority: 0.5, changefreq: "yearly" },
      { url: "/terms", priority: 0.5, changefreq: "yearly" },
    ]

    // Generate XML sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`

    return new NextResponse(sitemap, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
      },
    })
  } catch (error) {
    console.error("Sitemap generation error:", error)
    return NextResponse.json({ error: "Failed to generate sitemap" }, { status: 500 })
  }
}
