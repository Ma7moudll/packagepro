"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Bounds, OrbitControls, Grid, useBounds } from "@react-three/drei"
import * as THREE from "three"
import { MailerConstruction } from "@/components/design-editor/models/MailerConstruction"
import { generateExperimentalAssembly, experimentalAssemblyPose, type AssemblyInput, type ExperimentalAssembly } from "@/lib/box-generator/experimental/assembly"

const COLORS = ["#eab15c", "#769cb2", "#d18571", "#89a47d", "#c4c8cb"]
const NAMES = ["Top / علوي", "Side / جانب", "Bottom / سفلي", "Side / جانب", "Glue / لصق"]
// Independent illustrative inputs, not derived manufacturing allowances.
const EXAMPLE: AssemblyInput = { mailerMm: { length: 200, width: 150, height: 60 }, sleeve: { length: 206, width: 68, height: 110, glueFlap: 15, caliperMm: 0.5, unit: "mm" }, slideAxis: "width" }

function SleeveSurfaces({ assembly, removal }: { assembly: ExperimentalAssembly; removal: number }) {
  const panels = useMemo(() => experimentalAssemblyPose(assembly, removal, 0).panels.map(panel => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(panel.points.flatMap(p => [p.x / 100, p.y / 100, p.z / 100]), 3))
    geometry.setIndex([0, 1, 2, 0, 2, 3]); geometry.computeVertexNormals()
    return { id: panel.id, geometry }
  }), [assembly, removal])
  useEffect(() => () => panels.forEach(p => p.geometry.dispose()), [panels])
  return <group name="experimental-sleeve-surfaces">{panels.map((panel, index) => <mesh key={panel.id} geometry={panel.geometry}>
    <meshStandardMaterial color={COLORS[index]} roughness={0.8} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={index === 4 ? -1 : 0} />
  </mesh>)}</group>
}

function FitAssembly({ assembly, removal, opening }: { assembly: ExperimentalAssembly; removal: number; opening: number }) {
  const bounds = useBounds(), size = useThree(state => state.size)
  const pending = useRef(1.4)
  useEffect(() => { pending.current = 1.4 }, [assembly, removal, opening, size])
  useFrame((_, delta) => {
    if (pending.current <= 0) return
    pending.current -= delta
    // Observe the actual animated Mailer and sleeve meshes, never the floor.
    // Reframe briefly while the existing lid animation settles, then leave
    // orbit/zoom entirely with the viewer until the next geometry/pose edit.
    bounds.refresh().clip().fit()
  })
  return null
}

function AssemblyScene({ assembly, removal, requestedOpen }: { assembly: ExperimentalAssembly; removal: number; requestedOpen: number }) {
  const outside = useMemo(() => new THREE.MeshStandardMaterial({ color: "#bd9b6e", roughness: 0.95 }), [])
  const inside = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d9bf94", roughness: 1 }), [])
  useEffect(() => () => { outside.dispose(); inside.dispose() }, [outside, inside])
  const pose = experimentalAssemblyPose(assembly, removal, requestedOpen)
  const { length, width, height } = assembly.mailerMm
  return <>
    <ambientLight intensity={1.4} /><directionalLight position={[5, 8, 4]} intensity={2.8} /><directionalLight position={[-4, 3, -3]} intensity={1.2} />
    <Bounds margin={1.35} maxDuration={0.1}>
    <MailerConstruction l={length / 100} w={width / 100} h={height / 100} open={pose.actualOpen}
      outside={outside} inside={inside} front={outside} back={outside} left={outside} right={outside} top={outside} bottom={outside} tone="kraft" />
    <SleeveSurfaces assembly={assembly} removal={removal} />
    <FitAssembly assembly={assembly} removal={removal} opening={pose.actualOpen} />
    </Bounds>
    <Grid position={[0, -0.045, 0]} args={[14, 14]} cellSize={0.5} sectionSize={1} fadeDistance={18} cellColor="#c3c7cb" sectionColor="#a9b1b8" />
    <OrbitControls makeDefault target={[0, 0.6, 0]} />
  </>
}

function DimensionField({ label, value, set, step = 1 }: { label: string; value: number; set: (n: number) => void; step?: number }) {
  return <label className="grid min-w-0 gap-1 text-sm">{label}<input className="min-w-0 w-full rounded border border-slate-300 bg-white p-2" type="number" step={step} value={Number.isFinite(value) ? value : ""} onChange={e => set(e.target.value === "" ? NaN : Number(e.target.value))} /></label>
}

export function SleeveAssemblyLab() {
  const [input, setInput] = useState<AssemblyInput>(EXAMPLE)
  const [removal, setRemoval] = useState(0)
  const [opening, setOpening] = useState(0)
  // No stale last-valid geometry: invalid values remove the whole preview.
  const result = useMemo(() => { try { return { assembly: generateExperimentalAssembly(input), error: null } } catch (e) { return { assembly: null, error: e instanceof Error ? e.message : "Invalid dimensions" } } }, [input])
  const assembly = result.assembly
  const pose = assembly ? experimentalAssemblyPose(assembly, removal, opening) : null
  const setMailer = (key: keyof AssemblyInput["mailerMm"], value: number) => setInput(prev => ({ ...prev, mailerMm: { ...prev.mailerMm, [key]: value } }))
  const setSleeve = (key: "length" | "width" | "height" | "glueFlap" | "caliperMm", value: number) => setInput(prev => ({ ...prev, sleeve: { ...prev.sleeve, [key]: value } }))
  const changeRemoval = (value: number) => { setRemoval(value); if (value !== 1) setOpening(0) }
  return <div data-testid="assembly-lab" className="min-h-screen bg-slate-100 p-4 text-slate-900 max-sm:pr-20 md:p-7">
    <header className="mx-auto mb-5 max-w-7xl">
      <p className="text-sm font-bold uppercase tracking-widest text-amber-800">PackagePro / Experimental geometry lab</p>
      <h1 className="mt-2 text-2xl font-bold">Mailer + removable sleeve <span lang="ar" dir="rtl">علبة وغلاف تجريبي</span></h1>
      <p className="mt-2 max-w-4xl text-sm">Original sleeve around the existing hinged Mailer preview. Separate lab, not the standard artwork editor. لا توجد موافقة تصنيع أو ملاءمة فعلية.</p>
      <div role="note" className="mt-3 rounded border border-amber-400 bg-amber-50 p-3 text-sm font-medium">Illustrative example only. All dimensions are independently editable. Score-to-score sleeve sizes are NOT inside fit sizes. No automatic allowance, production export, pricing or checkout.</div>
    </header>
    <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[320px_1fr]">
      <section className="rounded-xl border bg-white p-4" aria-label="Assembly controls">
        <h2 className="font-bold">Independent dimensions / mm</h2>
        <p className="my-2 text-xs text-slate-600">Mailer: renderer references, not measured filled-pack exterior. Software review limits only.</p>
        <div className="grid grid-cols-2 gap-2">{(["length", "width", "height"] as const).map(key => <DimensionField key={key} label={`Mailer ${key}`} value={input.mailerMm[key]} set={v => setMailer(key, v)} />)}</div>
        <label className="mt-4 grid gap-1 text-sm">Open ends / slide direction<select className="rounded border p-2" value={input.slideAxis} onChange={e => { setInput(prev => ({ ...prev, slideAxis: e.target.value as "length" | "width" })); changeRemoval(0) }}><option value="width">Along Mailer width (Z)</option><option value="length">Along Mailer length (X)</option></select></label>
        <p className="mb-2 mt-4 text-xs text-slate-600">Sleeve: score-to-score cross-section and open-axis band depth. Changing the axis does not resize the sleeve.</p>
        <div className="grid grid-cols-2 gap-2">
          <DimensionField label="Sleeve cross span" value={input.sleeve.length} set={v => setSleeve("length", v)} />
          <DimensionField label="Sleeve cross height" value={input.sleeve.width} set={v => setSleeve("width", v)} />
          <DimensionField label="Sleeve band depth" value={input.sleeve.height} set={v => setSleeve("height", v)} />
          <DimensionField label="Glue flap" value={input.sleeve.glueFlap} set={v => setSleeve("glueFlap", v)} />
          <DimensionField label="Caliper (record only)" step={0.1} value={input.sleeve.caliperMm} set={v => setSleeve("caliperMm", v)} />
        </div>
        <label className="mt-5 grid gap-2 text-sm font-medium">Sleeve removal / سحب الغلاف: {Math.round(removal * 100)}%<input aria-label="Sleeve removal" type="range" min="0" max="100" value={removal * 100} onChange={e => changeRemoval(Number(e.target.value) / 100)} /></label>
        <label className="mt-4 grid gap-2 text-sm font-medium">Mailer lid / فتح الغطاء: {Math.round(opening * 100)}%<input aria-label="Mailer lid" type="range" min="0" max="100" disabled={!pose || pose.lidBlocked} value={opening * 100} onChange={e => setOpening(Number(e.target.value) / 100)} /></label>
        <p className="mt-2 text-xs text-slate-600" data-testid="opening-status">{!pose ? "Preview blocked. Correct the dimensions to enable controls." : pose.lidBlocked ? "Remove the sleeve fully before opening. Sequence guard, not collision simulation." : "Sleeve fully removed. Lid control unlocked."}</p>
        <button className="mt-5 rounded border px-3 py-2 text-sm" onClick={() => { setInput(EXAMPLE); changeRemoval(0); setOpening(0) }}>Reset illustrative example</button>
      </section>
      <section className="min-w-0 space-y-4">
        {result.error && <p role="alert" className="rounded border border-red-500 bg-red-50 p-4">Preview blocked: {result.error}</p>}
        {assembly && pose && <>
          <div className="relative h-[430px] overflow-hidden rounded-xl border bg-[#e8edf0]" data-testid="assembly-preview" data-axis={assembly.slideAxis} data-offset-mm={pose.offsetMm} data-open={pose.actualOpen}>
            <Canvas camera={{ position: [5, 4, 6], fov: 45 }} gl={{ preserveDrawingBuffer: true }}><AssemblyScene assembly={assembly} removal={removal} requestedOpen={opening} /></Canvas>
            <p className="pointer-events-none absolute left-3 top-3 rounded bg-white/90 px-2 py-1 text-xs font-bold">EXPERIMENTAL / ZERO-THICKNESS SLEEVE / NOT FIT APPROVED</p>
            <p className="pointer-events-none absolute bottom-3 left-3 rounded bg-white/90 px-2 py-1 text-xs">Drag to orbit. Sleeve colors match the net below.</p>
          </div>
          <div className={`rounded border p-3 text-sm ${assembly.nominalOverlap ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"}`} data-testid="nominal-comparison">
            Nominal score-reference differences: span {assembly.nominalGapMm.horizontal.toFixed(2)} mm, height {assembly.nominalGapMm.vertical.toFixed(2)} mm. {assembly.nominalOverlap ? "Nominal overlap or zero gap detected." : "Positive reference gaps do not prove physical fit."} No collision check or caliper allowance.
          </div>
          <div className="rounded-xl border bg-white p-4">
            <h2 className="font-bold">Same sleeve geometry, flat / نفس فردة الغلاف</h2>
            <p className="my-2 text-xs text-slate-600">Red: one cut contour. Blue dashed: crease centers. Grey: glue flap. Colors identify matching surfaces, not artwork.</p>
            <svg role="img" aria-label="Experimental sleeve flat net" className="h-auto max-h-[270px] w-full" viewBox={`-5 -5 ${assembly.sleeve.blank.width + 10} ${assembly.sleeve.blank.height + 10}`}>
              <defs><clipPath id="experimental-sleeve-cut"><path d={assembly.sleeve.cut.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ") + " Z"} /></clipPath></defs>
              <g clipPath="url(#experimental-sleeve-cut)">{assembly.sleeve.panels.map((panel, index) => <g key={panel.id}><rect x={panel.x} width={panel.width} height={assembly.sleeve.blank.height} fill={COLORS[index]} fillOpacity="0.5" /><text x={panel.x + panel.width / 2} y={assembly.sleeve.blank.height / 2} textAnchor="middle" fontSize="5">{index === 4 ? "Glue" : NAMES[index].split(" / ")[0]}</text></g>)}</g>
              <path d={assembly.sleeve.cut.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ") + " Z"} fill="none" stroke="#be2634" strokeWidth="0.7" />
              {assembly.sleeve.creases.map(crease => <path key={crease.x} d={`M${crease.x} 0 V${crease.y1}`} stroke="#155eaa" strokeDasharray="2 1" strokeWidth="0.5" />)}
            </svg>
            <p className="mt-2 text-xs">Blank {assembly.sleeve.blank.width.toFixed(1)} × {assembly.sleeve.blank.height.toFixed(1)} mm. Geometric reference only, no artwork or export.</p>
          </div>
          <ul className="list-disc space-y-1 rounded-xl border bg-white py-4 pl-8 pr-4 text-xs text-slate-700">{assembly.warnings.map(w => <li key={w}>{w}</li>)}</ul>
        </>}
      </section>
    </div>
  </div>
}
