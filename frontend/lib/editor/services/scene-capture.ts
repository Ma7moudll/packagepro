import type { ModelState, Layer } from "../state/types"

export type SceneImage = {blob: Blob; url: string; width: number; height: number; revision: string}
export type SceneCapture = () => Promise<SceneImage>
let capture: SceneCapture | undefined
export function installSceneCapture(handler: SceneCapture) {
  capture = handler
  return () => { if (capture === handler) capture = undefined }
}
export async function captureLiveScene() {
  if (!capture) throw new Error("Open the 3D view and wait for the model before capturing.")
  return capture()
}
export function sceneRevision(model: ModelState, layers: Layer[], canvas: unknown, open: unknown) {
  return JSON.stringify({model, layers, canvas, open})
}
