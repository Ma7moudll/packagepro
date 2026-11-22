# Local RGB face-preview export correction

Status: local review patch only. No merge, deployment or publication. The full production build is not yet verified.

## Scope

This patch corrects the older browser-only, unsaved preview exporter. It does not change the saved F42 review artifact, certification, approval, purchase orders, pricing, payments or private storage.

- PDF has one correctly sized page per selected printed face. Every face starts at the same 30 mm artwork origin; later pages no longer inherit an index offset. Top/bottom use length by width.
- PNG/JPEG download one chosen printed face. JPEG contains JPEG bytes and uses a white backing for transparency.
- Sampling uses model millimetres and the selected 72/150/300/600 PPI. Raster dimensions are verified, and PNG/JPEG carry output-density metadata.
- SVG embeds raster artwork, with escaped labels and separate face sections. It is not editable vector artwork or a registered net.
- Inside/outside/both coverage is checked before rendering. Both-side output requires matching saved faces.
- CMYK conversion, production bleed, editable artwork layers and AI/EPS are explicitly unavailable. Reference marks are not cutting instructions.
- An immutable local snapshot is captured once. Unsupported layers/effects, broken images, invalid transforms and excessive output sizes fail closed with an inline error instead of a partial download.
- Strict image loading and rounded-up dimensions are opt-in for this exporter. Default 3D texture behavior is unchanged.

## Supported preview subset

Single-line text in Arial or generic sans-serif/serif/monospace, ordinary transforms/opacity, loaded images without filters, rectangles and circles. Groups, raised printing, text effects/spacing and other shapes are rejected. The canvas must have a supported solid background. Browser fonts and colors are reference output, not a font-embedding or color-management guarantee.

Limits: 12 faces, 200 visible layers, 8192 pixels per side, 12 million pixels per face and 48 million total output pixels. Model dimensions must be positive and at most 2000 mm. Decoded source images are limited to 25 million pixels. Font/image waiting is bounded.

## Verification

- Frontend TypeScript: passed.
- Frontend unit suite: 226/226 passed, including seven new preview-contract/density tests.
- Focused ESLint: zero errors, 20 warnings. Nineteen are explicit-any annotations in browser fixture manipulation; one is an existing unused Face import in the texture renderer.
- Four Chromium integration cases passed individually against the locally built app and an isolated database that was restored after each run:
  1. Six-page PDF and explicit review-only dialog.
  2. PNG at 72/600 PPI, real JPEG at 300 PPI, selected top-face dimensions and density metadata.
  3. SVG label escaping, 12-page both-side PDF and six-page inside-only PDF.
  4. Unsupported group, broken image and deliberately malformed persisted both-side coverage produce errors and no download.
- Inspected the actual browser six-page PDF contact sheet, JPEG and desktop/mobile dialog screenshots. All six faces contain the intended fixture artwork; no clipped or blank later pages. The Arabic sample remains joined.
- Browser output top-face dimensions: 326 x 199 at 72 PPI, 2717 x 1654 at 600 PPI, JPEG 1359 x 827 at 300 PPI. PNG density rounding follows pixels/metre metadata.
- A native canvas/jsPDF probe independently decoded PNG/JPEG and checked PDF raster density and dimensions.

The first combined browser test exceeded its 90-second budget. The matrix was split into focused cases and download-close state was awaited before reopening. No forced clicks or production workaround was added. The malformed-coverage case bypasses the editor normalizer deliberately because ordinary editor changes create the matching inside faces.

## Unresolved full-build verification

Compilation emitted success, but bounded local commands interrupted build-trace finalization. An earlier generation completed successfully and supplied the app used for browser verification. The latest compilation again emitted success, then was stopped at 115 seconds during tracing. Generation after that interruption failed because `.next/next-server.js.nft.json` was missing. This is neither a clean full-build pass nor evidence of an exporter compilation failure.

A clean, uninterrupted production build and independent delta review remain required before publication. No production configuration changes are included to bypass the check. The current local `.next` output is incomplete and should be rebuilt before another browser run.

## Not delivered by this patch

Production masters, registered manufacturing artwork, production bleed, CMYK/ICC conversion, font outlining/embedding, manufacturing tolerances, selective coating/raised-print plates, storage readiness and changes to the user's separate blank-2D reproduction remain outside this correction.
