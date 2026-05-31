import { generateProductJsonLd, generateOrganizationJsonLd, type SEOOptions } from "@/lib/seo"

interface SeoHeadProps extends SEOOptions {
  includeProduct?: object
  includeOrganization?: boolean
}

export function SeoHead({
  ...props
}: SeoHeadProps) {
  const jsonLdScripts = []

  if (props.includeOrganization) {
    jsonLdScripts.push(generateOrganizationJsonLd())
  }

  if (props.includeProduct) {
    jsonLdScripts.push(generateProductJsonLd(props.includeProduct as Parameters<typeof generateProductJsonLd>[0]))
  }

  if (props.jsonLd) {
    jsonLdScripts.push(props.jsonLd)
  }

  return (
    <>
      {jsonLdScripts.map((script, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(script) }} />
      ))}
    </>
  )
}
