"use client"
import dynamic from "next/dynamic"
const Lab = dynamic(() => import("@/components/editor/experimental/SleeveAssemblyLab").then(m => m.SleeveAssemblyLab), { ssr: false, loading: () => <p className="p-8">Loading experimental assembly lab...</p> })
export default function ExperimentalSleevePage() { return <Lab /> }
