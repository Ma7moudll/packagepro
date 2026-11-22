# Original experimental sleeve component

This adds a zero-purchase, dependency-free geometric starting point. It does not add a supported store product or a production export route.

## Why a separate component

At source commit b18bc8314bc3311446351e5488de63b7bb44499b:

- `ParametricBoxGenerator.generateSleeveBox` builds a four-face 3D helper by removing two faces from the regular box. It does not generate a connected flat cut net or normalize its input units; its gap and innerBox options have no effect.
- The canonical `sleeve` product is a **plain mailer box with a custom printed sleeve**. A sleeve alone does not complete that two-part product.
- The current shared blueprint contract requires the canonical box faces and the geometry engine derives their sizes using box face rules. Forcing this sleeve/glue-flap net into that contract would invent missing faces or cut geometry. This module intentionally stays outside it.
- Existing seeded box blueprints and catalogue readiness flags are untouched.

The practical next milestone is to integrate this component as an explicitly experimental sleeve around an independently qualified mailer, with the correct open direction and artwork mapping. Do not mark the catalogue product supported before its complete assembly, editor behavior and dimensions are tested.

## Geometry and dimensions

`generateExperimentalSleeve` takes explicit units (`mm`, `cm`, `inch`), four score-to-score dimensions (length, width, open-axis height, glue flap), and `caliperMm`. It normalizes geometry to mm. Length and width describe the rectangular cross section. Height runs between the two open ends.

The flat strip has consecutive widths `length, width, length, width, glueFlap`. Four vertical creases separate the panels. A single closed cut contour surrounds the strip, with a bevelled glue flap. No flap cuts are added across crease lines. Stable output IDs and ordering make tests and future artwork mapping repeatable.

Caliper is recorded but **does not change the geometry**. There is no inside/outside conversion or automatic clearance. This avoids claiming an unverified bend allowance or glue fit. Software input bounds protect numerical behavior; they are not manufacturer capability limits.

`foldExperimentalSleeve` folds the same chain with successive quarter-turn hinges at completion. The glue flap overlaps the first wall in the ideal zero-thickness model. It returns the actual bevelled flap polygon. Hinge continuity and final rectangular-loop closure are mathematical properties, not proof of physical folding or collision avoidance.

`experimentalSleeveSvg` exports an mm-scaled geometric **review drawing** with separate CUT/CREASE groups. This is not factory-ready artwork, CMYK/spot-color output or a certified knife tool. The SVG has no added bleed, artwork safe areas or glue ink knockout.

## Run

From `frontend/`, Node 22+:

```sh
node --test --experimental-strip-types tests/experimental-sleeve.test.ts
node --experimental-strip-types scripts/experimental-sleeve-evidence.mjs /tmp/sleeve-evidence
```

The evidence command writes `evidence.html`, `sleeve-review.svg` and `sleeve.json`. Open the HTML for flat, 50%, 100% and interactive fold views. The page is local development evidence, not the PackagePro editor. Its dimensions are an example, not a claim that it fits the catalogue mailer.

## Rights and reference boundary

The implementation, formulas, tests and evidence renderer are original for PackagePro. No Pacdora asset, template drawing, standard diagram, downloaded design, third-party source code, image, font or texture is included. No new runtime package is required. There is no external template license to inherit for this implementation. Do not describe it as a certified FEFCO/ECMA design.

Two manufacturer pages were consulted only for general engineering risks, not copied geometry or sizing formulas:

- https://pmpackaging.com/product-catalog/boxes-and-cartons/sleeve-packaging : stock, glue and score configuration influence production.
- https://eastfacepackaging.com/folding-cartons/sleeve-boxes/ : actual filled-pack fit and sample validation matter more than a nominal size alone.

Those pages are not licensed assets and grant no reuse permission. Their fit warnings are consistent with keeping this component experimental.

## Before any production claim

Obtain the target pack and stock, define dimension basis and clearance with the manufacturer, confirm grain, caliper, tooling and adhesive, verify sample closure and sliding fit, add appropriate print separations/bleed/knockout, then test the full assembly and end-to-end editor/export route. Neither the preview nor a passing unit suite substitutes for these steps.
