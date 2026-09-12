"use client"

import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise } from "@react-three/postprocessing"

interface PostProcessingEffectsProps {
  enabled?: boolean
}

/**
 * Post-processing effects for 3D canvas
 * Provides visual enhancements like bloom, chromatic aberration, vignette, and noise
 */
export function PostProcessingEffects({ enabled = true }: PostProcessingEffectsProps) {
  if (!enabled) return null

  return (
    <EffectComposer>
      {/* Bloom effect for glowing highlights */}
      <Bloom
        intensity={0.5}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.9}
      />

      {/* Chromatic aberration for subtle color separation */}
      <ChromaticAberration
        offset={[0.001, 0.001] as any}
        radialModulation={false}
        modulationOffset={0.15}
      />

      {/* Vignette for depth */}
      <Vignette
        eskil={false}
        offset={0.1}
        darkness={0.5}
      />

      {/* Subtle noise for realism */}
      <Noise opacity={0.02} />

      {/* Depth of field (optional, can be expensive) - uncomment if needed */}
      {/* <DepthOfField
        focusDistance={0.02}
        focalLength={0.02}
        bokehScale={2}
        height={480}
      /> */}
    </EffectComposer>
  )
}

