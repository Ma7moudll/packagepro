# Experimental Mailer + sleeve assembly lab

This new opt-in route is `/editor/experimental-sleeve`. It is a local/review experiment, not the standard PackagePro artwork editor, a completed catalogue product or manufacturing approval. It does not change catalogue coverage, product readiness, pricing, checkout, saved designs, shared face contracts or exporters.

## Checkpoint and contained changes

Based on PR41 commit `e5d2a39ef8ca20502011de863d43715a5a23029f`. The original sleeve generator and existing Mailer renderer are reused without editing them. New files only: assembly contract/pose module, its tests, this README, one route, one lab component and one browser evidence script. No dependencies or third-party assets added.

## Coordinates and dimension basis

- Mailer renderer references: length X, height Y, width Z. Its existing scene scale is 100 mm = 1 scene unit. These are **not measured outside dimensions** of a real erected/filled pack. The inherited Mailer renderer uses illustrative board thickness and construction proportions.
- Select the sleeve's open axis explicitly: along Mailer length/X or width/Z. Changing that axis does not invent new sleeve dimensions.
- Sleeve inputs remain independent **score-to-score** cross span, cross height and axial band depth. The existing sleeve generator normalizes mm/cm/inch; the lab UI uses mm only. Glue and recorded caliper use the original validation rules.
- The same closed five-panel chain is posed around the Mailer. Its first wall becomes the top, followed by side, bottom, side and glue overlap. The flat cut net and folded surfaces use the same geometry and matching identification colors. Colors are not artwork.
- The assembly centers the sleeve cross section around the Mailer reference height and centers the band along the chosen axis at removal 0. It translates only along positive X or Z. Removal travel is half the sum of nominal axial lengths plus one band depth. That extra band depth is **animation staging**, not a friction or clearance allowance.
- The lab keeps the lid shut until sleeve removal is exactly 100%. Returning the sleeve resets the lid slider to closed. This is an explicit interaction sequence, **not collision detection**. The existing lid animation remains illustrative.
- Nonpositive score-reference gaps are flagged. Positive gaps still cannot approve physical fit. Invalid inputs remove the preview rather than retaining stale geometry. Camera framing observes actual assembly meshes, excluding the floor.

## Example is not a production default

The reset values are independently chosen illustration dimensions only. They are not a recommended fit, stock, glue allowance or compensated sleeve size. Caliper remains recorded, without geometric compensation; the sleeve is zero-thickness. The lab cannot determine friction, interference, retention, board compression, glue strength or physical foldability.

## Fit research, checked 2026-11-22

Physical inputs still required: measured exterior envelope of the actual filled/closed Mailer, chosen slide direction and coverage, stock grade/caliper, grain/flute direction, coating/lamination and surface friction, crease tooling/compensation, seam location, glue area and production variation. A structural sample using both actual components is required before a fit or manufacturing claim.

Sources informed only these constraints. No drawings, templates, code, photographs or other assets were copied:

1. PackTist, sleeve-for-Mailer supplier: erected corrugated boxes vary from nominal dimensions; they measure actual samples. https://packtist.com/products/sleeves-for-mailer-boxes
2. 4OVER4, sleeve sizing guide: inside and outside dimensions must be distinguished; the two pieces need a physical proof. Its numeric sizing example is supplier-specific and is **not adopted here**. https://www.4over4.com/guide/custom-sleeve-boxes-explained
3. PDFImpose, geometry/workflow guide: band depth is independent of wrap length; score-center sketches do not provide a universal production allowance. https://pdfimpose.com/guides/packaging-sleeve-template
4. JetDieline, technical guide: grain/flute direction changes folding and stiffness; material profiles require sample verification. https://www.jetdieline.com/en-US/guides/grain-and-flute-direction/index.html
5. CubitPack, vendor measuring guide: actual assembled exterior and stock/finish matter. Its clearance table and grain recommendation differ from other vendors. They are **not adopted as universal rules**. https://cubitpack.com/guides/how-to-measure-and-choose-board-for-sleeve-boxes
6. Holmen, paperboard manufacturer's manual: tools, machine settings, board type and condition affect die-cutting/creasing. https://www.iggesund.com/insights/paperboard-know-how/paperboard-manual/
7. Holmen, technical information: caliper/thickness and grain are separate recorded properties; environmental conditioning can change board shape. https://www.iggesund.com/insights/paperboard-know-how/general-technical-information/

The vendor pages disagree on numeric clearance and grain orientation. This is preserved as uncertainty, not averaged into a guessed default. The Holmen sources support material-specific conversion controls, not a sleeve fit formula.

## Reproduce

Run the existing locked frontend install, then from `frontend`:

```sh
npm run test:units
npx tsc --noEmit
npx eslint app/editor/experimental-sleeve/page.tsx components/editor/experimental/SleeveAssemblyLab.tsx lib/box-generator/experimental/assembly.ts tests/experimental-assembly.test.ts
```

Start the frontend locally on port 3033 with the normal local build configuration. The lab itself needs no backend or account. For production-build verification, use explicit non-production configuration values as the existing review workflow does; do not connect live services. The existing build skips built-in TypeScript/lint validation, so run the independent checks above.

```sh
# With the frontend already running on localhost:3033:
CHROME_PATH=/path/to/installed/chrome node scripts/experimental-assembly-browser-evidence.mjs /tmp/assembly-evidence
```

Omit CHROME_PATH to use Playwright's installed Chromium. The harness accepts only loopback origins via ASSEMBLY_LAB_URL, checks real route interactions, saves actual screenshots and a results JSON, and closes its browser. It does not start the server or backend. Inspect the actual screenshots yourself. Its selectors/assertions alone do not prove visual correctness.

## Separate remaining work

Independent review, complete standard editor/artwork mapping, two-part dieline/export contracts, persistence and catalogue integration are not supplied by this lab. Manufacturing qualification requires converter-agreed allowances and a physical filled-pack sample. No readiness upgrade follows from passing these tests.
