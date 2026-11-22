# Construction preview checkpoint

These are in-progress visual models, not approved manufacturing drawings or stock specifications. Catalogue readiness does not change in this checkpoint.

## Shipping box

The RSC-like preview uses separate outside and inside liners, a waved paper core at exposed cut-edge depths, four moving top flaps, folded bottom flaps and an inside joint. The existing outside/inside artwork IDs remain distinct. Top artwork is cropped across the two long flaps instead of repeating a whole design on each flap.

Internal flute geometry is not drawn behind covered liners. Rendering it there produced visible periodic raster artifacts. A closed, unpickable shadow envelope avoids thin-liner shadow-map artifacts without adding a visible surface or stealing artwork selection.

Caliper, flute pitch, fold allowances and seam dimensions are illustrative. Custom dimension ratios are allowed for visual editing and do not establish compliance with a particular FEFCO style. No strength, sealing, shipping or material certification is implied.

Reference for the RSC fold arrangement only: Fibre Box Association, Box Styles Basics, 0201 RSC, hosted by IoPP:
https://www.iopp.org/files/Fibrebox_Association_Box-Styles_Basics.pdf

## Paper carrier

Front/back paper faces bow slightly. Side gussets open out at the bottom rather than staying rigidly folded all the way down. The turned top follows the same punched-hole outline as the body where applicable.

The illustrative configurations are:

- No handle: no punched openings or handle hardware.
- Twisted paper: paper loops with inside reinforcing patches, not rope knots.
- Cotton rope: threaded loops with inside stops.
- Ribbon: flat twisting strips with flat-band inside stops, not round tubes.

Attachment methods can vary independently of handle material in real production. The current preview choices are illustrative. Patch size, punch placement, knots/stops, paper gauge, strength, adhesives and handle sizes still require supplier confirmation. The UI retains quote-required treatment and does not invent extra prices.

The two sides of gussets have distinct winding and U direction so inside artwork is not mirrored. Uniform triangle subdivision keeps the bowed paper conforming and avoids diagonal selection outlines and cracks caused by T-junctions.

Reference for common attachment constructions only, not strength or grade claims:
https://pakoro.com/blog/how-to-add-handles-to-paper-bags/

## Verification boundaries

Geometry and route/unit tests check finite surfaces, raw-edge-only core rendering, real punched holes, inside UV orientation and face metadata. Local editor checks cover product/material/handle identity, artwork retention, dimensions and physical face picking. Opening interpolation is checked separately from visual smoothness. Passing these checks is not visual or production approval. Real-device performance remains a separate check.

## Unresolved performance regression

The same local software-rendered ordinary-motion probe took 10.42 seconds to reach its settled sampling condition, versus 6.67 seconds at checkpoint `72ed631`. Reducing thin-liner and flute detail improved an earlier 13.55-second result but did not remove the regression. These timings include stable-pose sampling and are not real-device frame-rate measurements. Motion usability and the remaining performance regression are open, not an accepted realism tradeoff.
