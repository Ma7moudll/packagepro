// Shared flag: DesignCanvas3D sets it while face textures regenerate after a
// design change; the export dialog reads it so users cannot export artwork
// that has not been applied to the preview yet.
let pending = false
const listeners = new Set<() => void>()

export function setTexturesPending(value: boolean) {
  if (pending !== value) {
    pending = value
    listeners.forEach((l) => l())
  }
}

export function isTexturesPending() {
  return pending
}

export function subscribeTexturesPending(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
