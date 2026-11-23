import createDOMPurify from 'dompurify'

/** Fabric5 has known unsafe SVG attribute serialization. Sanitize at every
 * application export boundary while retaining the current editor API.
 * This is application defense, not a claim that Fabric5 itself is patched.
 */
export function sanitizeEditorSvg(svg: string): string {
  return createDOMPurify(window).sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed', 'style'],
  })
}
