// Pure, bounded contract shared with the editor. Not a production-print certificate.
export const REVIEW_ROLE = 'f42-artwork-review-v1';
export const REVIEW_FILE_TYPE = 'artwork_review';
export const REVIEW_DPI = 300;
export const REVIEW_FACES = ['left', 'front', 'right', 'back', 'top', 'bottom'] as const;
// SHA-256 of the canonical saved F42 geometry, pinned by fixture tests.
export const F42_GEOMETRY_SHA256 = 'b90e27fa0d8336695d45e1fc9012c5c2931321d0ca7e679c87afcfff24de1876';

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).filter((key) => record[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
}

// Include every printable input, but not camera/selection changes during rendering.
export function reviewSnapshot(data: any): string {
  return stableJson({
    schemaVersion: data?.schemaVersion, manifestSource: data?.manifestSource,
    reproducibility: data?.reproducibility, manifest: data?.manifest,
    product: data?.product, canvas: data?.canvas, layers: data?.layers,
    model: { dimensions: data?.model?.dimensions, printCoverage: data?.model?.printCoverage, faces: data?.model?.faces },
  });
}

const fail = (reason: string): never => { throw new Error(`Review PDF unavailable: ${reason}`); };
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const color = (value: unknown) => typeof value === 'string' && /^(#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\([\d.,%\s]+\)|transparent)$/i.test(value);

export function assertReviewInput(data: any): void {
  if (data?.schemaVersion !== 2 || data?.manifestSource !== 'blueprint' || data?.reproducibility !== 'exact') fail('an exact saved geometry snapshot is required');
  if (data?.product?.slug !== 'custom-mailer-box' || data?.product?.support !== 'supported' || data?.product?.boxType !== 'mailer-box') fail('only the supported F42 mailer is available');
  if (data?.model?.printCoverage !== 'outside') fail('outside-only print is required');
  for (const [axis, expected] of Object.entries({length:115,width:70,height:38})) {
    if (data?.model?.dimensions?.[axis] !== expected || data?.manifest?.variant?.dimensions?.[axis] !== expected) fail('F42 dimensions must be 115 x 70 x 38 mm');
  }
  if (data?.manifest?.variant?.dimensions?.unit !== 'mm') fail('saved millimetre units are required');
  const geometry = data?.manifest?.dieline;
  if (!geometry?.panels || !Array.isArray(geometry.faceRelationships)) fail('saved canonical geometry is missing');
  if (Object.values(geometry.panels).some((p: any) => p.rotation !== 0)) fail('rotated panels are not supported');
  if (data?.canvas?.backgroundImage) fail('canvas background images are not supported');
  if (!color(data?.canvas?.backgroundColor)) fail('a supported solid background color is required');
  if (!Array.isArray(data?.model?.faces) || data.model.faces.length !== 6 || REVIEW_FACES.some((id) => data.model.faces.filter((f:any) => f.id === id).length !== 1)) fail('exactly six outside faces are required');
  if (!Array.isArray(data?.layers) || data.layers.length > 200) fail('a maximum of 200 layers is supported');
  if (!data.layers.some((l:any) => l.visible)) fail('add visible artwork first');
  for (const layer of data.layers.filter((l:any) => l.visible)) {
    const label = String(layer.name || layer.id || 'layer').slice(0,80);
    const reject = (reason: string) => fail(`${label}: ${reason}`);
    if (!REVIEW_FACES.includes(layer.faceId)) reject('unsupported or inside face');
    if (![layer.position?.x,layer.position?.y,layer.rotation,layer.scale?.x,layer.scale?.y,layer.opacity].every(finite) || layer.scale.x <= 0 || layer.scale.y <= 0 || layer.opacity < 0 || layer.opacity > 1) reject('invalid transform');
    if (layer.blendMode && !['normal','source-over'].includes(layer.blendMode)) reject('blend mode is not supported');
    if (layer.raisedPrint) reject('raised print needs a production specification');
    if (layer.type === 'text') {
      const p = layer.textProperties;
      if (!p || typeof p.content !== 'string' || !p.content.trim() || /[\r\n]/.test(p.content) || p.content.length > 1000) reject('single-line nonempty text is required');
      if (!finite(p.fontSize) || p.fontSize <= 0 || p.fontSize > 500 || ![100,200,300,400,500,600,700,800,900].includes(p.fontWeight)) reject('unsupported font size/weight');
      if (!['Arial','sans-serif','serif','monospace'].includes(p.fontFamily)) reject('font is outside the tested browser-font subset');
      if (p.shadow || p.stroke || p.curveRadius || p.letterSpacing) reject('text effects/spacing are not supported');
      if (!color(p.color)) reject('unsupported text color');
    } else if (layer.type === 'shape') {
      const p=layer.shapeProperties;
      if (!p || !['rect','circle'].includes(p.shape)) reject('only rectangles and circles are supported');
      if ((p.cornerRadius !== undefined && (!finite(p.cornerRadius) || p.cornerRadius < 0 || p.cornerRadius > 100)) || !color(p.fill) || (p.stroke && !color(p.stroke)) || !finite(p.strokeWidth) || p.strokeWidth < 0 || p.strokeWidth > 100) reject('unsupported shape style');
    } else if (layer.type === 'image') {
      const p=layer.imageProperties;
      if (!p || typeof p.src !== 'string' || !/^data:image\/(png|jpeg);base64,[a-z0-9+/=]+$/i.test(p.src) || p.src.length > 8_000_000) reject('embed a PNG/JPEG image before exporting');
      if (p.filters && Object.entries(p.filters).some(([key,value]) => value !== (['brightness','contrast','saturation'].includes(key)?100:0))) reject('image filters are not supported');
    } else reject('unsupported layer type');
  }
}
