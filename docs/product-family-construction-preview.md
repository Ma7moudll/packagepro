# Construction preview checkpoint

These are in-progress visual models, not approved manufacturing drawings or stock specifications. Only the clear-cup preview is newly marked in progress in the cup checkpoint; its production dieline stays deferred and its pricing stays quote required. No product is newly marked supported.

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

## Cups

Paper cups have a formed rim, separate inner wall, a narrow rear sidewall overlap and a recessed bottom with a lower skirt. The clear cup has transparent moulded-looking walls and small forming rings rather than a paper seam. No lid, straw, liquid volume or capacity rating is inferred.

Clear-cup print uses the original transparent artwork texture as a separate ink surface. It does not use the board compositor, which would make the unprinted area opaque. Through-wall ink is reversed when viewed from behind. The simple transparent material is not a physically validated refraction model. Selective text relief is disabled for clear cups until it has its own treatment.

Wall gauge, rim section, recess depth, forming details and optical response remain illustrative. Front/back half-wrap UVs are preview mapping, not a production conical unroll. No food-contact, heat, leakage, grade or recycling certification is claimed. The clear-cup catalogue preview is in progress; its dieline remains deferred and its price remains quote required.

Construction references, not approval of this model or its stock:

- Paper cup maker, formed wall joined to a flat bottom and rolled rim: https://pvp-peters.de/wp-content/uploads/2016/01/Catalog-English.pdf
- Cup-forming machine reporting, vertical side seams and recessed bottoms: https://www.packworld.com/leaders-new/machinery/converting-equipment/article/13375593/controller-makes-cupforming-machine-stand-out
- Manufacturer examples of transparent cold-drink cups in different plastics. These do not identify the user's cup grade: https://www.huhtamaki.com/en/foodservice/products/plastic-cold-drinks-cups-and-lids/

## Verification boundaries

Geometry and route/unit tests check finite surfaces, raw-edge-only core rendering, real punched holes, inside UV orientation and face metadata. Local editor checks cover product/material/handle identity, artwork retention, dimensions and physical face picking. Opening interpolation is checked separately from visual smoothness. Passing these checks is not visual or production approval. Real-device performance remains a separate check.

## Unresolved performance regression

The same local software-rendered ordinary-motion probe took 10.42 seconds to reach its settled sampling condition, versus 6.67 seconds at checkpoint `72ed631`. Reducing thin-liner and flute detail improved an earlier 13.55-second result but did not remove the regression. These timings include stable-pose sampling and are not real-device frame-rate measurements. Motion usability and the remaining performance regression are open, not an accepted realism tradeoff.
