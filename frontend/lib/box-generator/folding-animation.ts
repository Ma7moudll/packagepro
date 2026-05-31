"use client"

import { BoxStructure, FoldingState } from "./types"

export class FoldingAnimationController {
  private animationDuration: number = 2000 // milliseconds
  private easingFunction: (t: number) => number = this.easeInOutCubic

  /**
   * Calculate unfolded state (flat pattern)
   */
  calculateUnfoldedState(structure: BoxStructure): FoldingState {
    const faces = structure.faces.map((face) => {
      // Calculate 2D position for flat pattern
      let x = 0
      let y = 0
      let rotationX = 0
      let rotationY = 0
      let rotationZ = 0

      // Layout faces in a flat pattern
      switch (face.type) {
        case "front":
          x = structure.dimensions.width / 2
          y = structure.dimensions.height / 2
          break
        case "back":
          x = structure.dimensions.width * 1.5
          y = structure.dimensions.height / 2
          rotationY = Math.PI
          break
        case "left":
          x = 0
          y = structure.dimensions.height / 2
          rotationY = -Math.PI / 2
          break
        case "right":
          x = structure.dimensions.width
          y = structure.dimensions.height / 2
          rotationY = Math.PI / 2
          break
        case "top":
          x = structure.dimensions.width / 2
          y = 0
          rotationX = -Math.PI / 2
          break
        case "bottom":
          x = structure.dimensions.width / 2
          y = structure.dimensions.height
          rotationX = Math.PI / 2
          break
      }

      return {
        id: face.id,
        rotation: { x: rotationX, y: rotationY, z: rotationZ },
        position: { x, y, z: 0 },
      }
    })

    return {
      isFolded: false,
      progress: 0,
      faces,
    }
  }

  /**
   * Calculate folded state (3D box)
   */
  calculateFoldedState(structure: BoxStructure): FoldingState {
    const faces = structure.faces.map((face) => ({
      id: face.id,
      rotation: face.rotation,
      position: face.position,
    }))

    return {
      isFolded: true,
      progress: 1,
      faces,
    }
  }

  /**
   * Interpolate between unfolded and folded states
   */
  interpolateState(
    unfolded: FoldingState,
    folded: FoldingState,
    progress: number
  ): FoldingState {
    const clampedProgress = Math.max(0, Math.min(1, progress))
    const easedProgress = this.easingFunction(clampedProgress)

    const faces = unfolded.faces.map((unfoldedFace, index) => {
      const foldedFace = folded.faces[index]
      if (!foldedFace) return unfoldedFace

      return {
        id: unfoldedFace.id,
        rotation: {
          x:
            unfoldedFace.rotation.x +
            (foldedFace.rotation.x - unfoldedFace.rotation.x) * easedProgress,
          y:
            unfoldedFace.rotation.y +
            (foldedFace.rotation.y - unfoldedFace.rotation.y) * easedProgress,
          z:
            unfoldedFace.rotation.z +
            (foldedFace.rotation.z - unfoldedFace.rotation.z) * easedProgress,
        },
        position: {
          x:
            unfoldedFace.position.x +
            (foldedFace.position.x - unfoldedFace.position.x) * easedProgress,
          y:
            unfoldedFace.position.y +
            (foldedFace.position.y - unfoldedFace.position.y) * easedProgress,
          z:
            unfoldedFace.position.z +
            (foldedFace.position.z - unfoldedFace.position.z) * easedProgress,
        },
      }
    })

    return {
      isFolded: clampedProgress >= 0.5,
      progress: clampedProgress,
      faces,
    }
  }

  /**
   * Animate folding/unfolding
   */
  async animateFolding(
    structure: BoxStructure,
    targetFolded: boolean,
    onUpdate: (state: FoldingState) => void,
    duration?: number
  ): Promise<void> {
    const unfolded = this.calculateUnfoldedState(structure)
    const folded = this.calculateFoldedState(structure)
    const animDuration = duration || this.animationDuration
    const startTime = Date.now()

    return new Promise((resolve) => {
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(1, elapsed / animDuration)

        const currentState = targetFolded
          ? this.interpolateState(unfolded, folded, progress)
          : this.interpolateState(folded, unfolded, progress)

        onUpdate(currentState)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          resolve()
        }
      }

      animate()
    })
  }

  /**
   * Easing function: ease-in-out cubic
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  /**
   * Set animation duration
   */
  setAnimationDuration(duration: number) {
    this.animationDuration = duration
  }

  /**
   * Set easing function
   */
  setEasingFunction(easing: (t: number) => number) {
    this.easingFunction = easing
  }
}

