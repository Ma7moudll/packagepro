# F42 saved artwork review PDF, local review

## Scope

This adds one RGB artwork review PDF for the supported `custom-mailer-box` F42 preset, 115 x 70 x 38 mm, outside only. It is not a production print master, supplier-approved die, PDF/X document, color proof or finishing/raised-print specification.

The canonical geometry fingerprint is pinned to the existing committed mailer seed through a fixture. No second geometry engine was introduced. Unsupported products, geometry, panel rotation, sides, layer types/effects, external images, failed embedded images and artwork outside panel boundaries fail visibly instead of receiving substituted output.

## Flow

1. Capture current editor state and require successful cloud persistence.
2. Generate from the saved v2 snapshot, not a later live state. Verify revision/content identity before upload and download.
3. Use Fabric objects matching the editor's supported single-line text, embedded PNG/JPEG, rectangle and circle subset. Render the six faces at measured output sampling of at least 300 PPI.
4. Position artwork and canonical guides together on a 390 x 218 mm PDF page. The flat geometry occupies 370 x 178 mm plus a review-label margin. No A4 fitting or indexed face-page offsets.
5. Store bytes under the separate `artwork_review` role. Creation is owner-authorized, serialized under the design row lock and idempotent for the snapshot. Store a server-computed byte hash and private storage key.
6. Retrieve through the authenticated owner endpoint, check current snapshot and stored checksum, and download the exact returned bytes. The design Files page uses the same endpoint after navigation/reload.

The artifact role is deliberately ignored by existing production file consumers. No `print_file`, `dieline`, prepress result, approval token, order status, PO, price or rate is created or changed. Generic save cannot inject the reserved artifact role.

## Storage boundary

Local review files are outside the generic public `/files` upload root. S3 writes request a private ACL and return no public/CDN URL; retrieval uses server credentials. The S3 path was not exercised against a real service. Deployment requires a private bucket/prefix policy and durable storage. Local owner-bound storage and retrieval were tested with real PostgreSQL and filesystem bytes.

The review upload is an owner-supplied review artifact, not server attestation that arbitrary client PDF bytes faithfully reproduce editor state. Page dimensions, subject/revision metadata and unsafe catalog actions are checked. Production promotion would require a stronger artifact/render/prepress/approval contract. Existing generic design read access outside this new endpoint was not redesigned.

## Verification

- Backend build passes.
- Backend full suite: 53 files, 493 tests passed, none skipped/failed.
- Backend lint: 0 errors and the same 26 existing warnings.
- Frontend TypeScript passes; 219 frontend unit tests pass.
- Production frontend compile and static generation pass in separate Next build phases with one build worker. Earlier combined attempts hit memory/time limits. Temporary build-worker settings were restored byte-for-byte and are not part of the patch.
- Two real browser integration cases pass: save/export/store/download; Files-page retrieval with exact byte equality; unauthenticated request denied; edit/save makes old artifact return 409; unsupported sides/layer and failed embedded asset produce no download.
- Real PostgreSQL/storage tests cover exact bytes, checksum, owner denial, snapshot staleness, eight concurrent retry requests producing one artifact, malformed/wrong-layout PDFs, reserved-role injection, HTTP authentication and private no-store responses.
- The inspected sample includes six named faces, Arabic/Latin text, an asymmetric embedded PNG, rectangle and circle. Full-sheet pixels and both UI states were inspected. No clipping, blank faces or missing marker was observed.
- Extracted face rasters are 827 x 449, 1359 x 449, or 1359 x 827 pixels, and measure at least 300 PPI at their placed physical sizes. This describes final output sampling, not original-image detail or manufacturing suitability.

Sample saved artifact SHA-256: `bdd84cb8203910dcc4ae98d91e43ec9f7fae3440c091214259c7bda5e43b2c6d`.

All integration data was synthetic and isolated; PostgreSQL snapshots were restored and processes stopped. No real business operation, external upload, publication, merge or deployment was performed.

## Explicitly still open

- Old browser-export clipping, wrong dimensions, ineffective DPI/CMYK controls and JPEG bytes.
- Geometry-only SVG physical-unit defect and its existing certification wording.
- Existing downstream proof plates, first-file selection and order-only approval-token binding.
- Production bleed, inside/both-side registration, other presets/custom dimensions, broad layer effects/fonts, color management/spot separations, finishing and supplier-approved manufacture.

These are not repaired or certified by this slice. Camera/selection fields are excluded from the content fingerprint; saved canvas layout state is conservatively included, so a changed canvas extent can require a new review even without artwork changes.
