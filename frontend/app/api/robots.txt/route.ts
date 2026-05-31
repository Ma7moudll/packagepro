import { NextResponse } from "next/server"

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  const robots = `# PackagePro Robots.txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/
Disallow: /cart/
Disallow: /checkout/
Disallow: /*.json$
Disallow: /*?*sort=
Disallow: /*?*filter=

# Crawl-delay for respectful crawling
Crawl-delay: 1

# Sitemaps
Sitemap: ${baseUrl}/api/sitemap.xml

# Specific rules for search engines
User-agent: Googlebot
Allow: /
Crawl-delay: 0

User-agent: Bingbot
Allow: /
Crawl-delay: 1`

  return new NextResponse(robots, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, s-maxage=86400",
    },
  })
}
