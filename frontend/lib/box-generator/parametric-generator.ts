"use client"

import { nanoid } from "nanoid"
import {
  BoxDimensions,
  BoxStructure,
  BoxFace,
  BoxFlap,
  GlueTab,
  MaterialProperties,
} from "./types"

export class ParametricBoxGenerator {
  /**
   * Generate a regular box structure
   */
  generateRegularBox(
    dimensions: BoxDimensions,
    material: MaterialProperties,
    options: {
      hasTopFlap?: boolean
      hasBottomFlap?: boolean
      flapHeight?: number
      glueTabWidth?: number
    } = {}
  ): BoxStructure {
    const {
      hasTopFlap = true,
      hasBottomFlap = true,
      flapHeight = dimensions.depth * 0.3,
      glueTabWidth = 20,
    } = options

    const { width, height, depth } = dimensions
    const faces: BoxFace[] = []
    const flaps: BoxFlap[] = []
    const glueTabs: GlueTab[] = []

    // Front face
    const frontFace: BoxFace = {
      id: nanoid(),
      type: "front",
      width,
      height,
      position: { x: 0, y: 0, z: depth / 2 },
      rotation: { x: 0, y: 0, z: 0 },
    }
    faces.push(frontFace)

    // Back face
    const backFace: BoxFace = {
      id: nanoid(),
      type: "back",
      width,
      height,
      position: { x: 0, y: 0, z: -depth / 2 },
      rotation: { x: 0, y: Math.PI, z: 0 },
    }
    faces.push(backFace)

    // Left face
    const leftFace: BoxFace = {
      id: nanoid(),
      type: "left",
      width: depth,
      height,
      position: { x: -width / 2, y: 0, z: 0 },
      rotation: { x: 0, y: -Math.PI / 2, z: 0 },
    }
    faces.push(leftFace)

    // Right face
    const rightFace: BoxFace = {
      id: nanoid(),
      type: "right",
      width: depth,
      height,
      position: { x: width / 2, y: 0, z: 0 },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
    }
    faces.push(rightFace)

    // Top face
    const topFace: BoxFace = {
      id: nanoid(),
      type: "top",
      width,
      height: depth,
      position: { x: 0, y: height / 2, z: 0 },
      rotation: { x: -Math.PI / 2, y: 0, z: 0 },
    }
    faces.push(topFace)

    // Bottom face
    const bottomFace: BoxFace = {
      id: nanoid(),
      type: "bottom",
      width,
      height: depth,
      position: { x: 0, y: -height / 2, z: 0 },
      rotation: { x: Math.PI / 2, y: 0, z: 0 },
    }
    faces.push(bottomFace)

    // Top flap
    if (hasTopFlap) {
      const topFlap: BoxFlap = {
        id: nanoid(),
        type: "top",
        width,
        height: flapHeight,
        position: { x: 0, y: height / 2 + flapHeight / 2, z: 0 },
      }
      flaps.push(topFlap)
    }

    // Bottom flap
    if (hasBottomFlap) {
      const bottomFlap: BoxFlap = {
        id: nanoid(),
        type: "bottom",
        width,
        height: flapHeight,
        position: { x: 0, y: -height / 2 - flapHeight / 2, z: 0 },
      }
      flaps.push(bottomFlap)
    }

    // Glue tab on right face
    const glueTab: GlueTab = {
      id: nanoid(),
      faceId: rightFace.id,
      width: glueTabWidth,
      height,
      position: { x: width / 2 + glueTabWidth / 2, y: 0, z: 0 },
    }
    glueTabs.push(glueTab)

    return {
      id: nanoid(),
      name: "Regular Box",
      type: "regular",
      dimensions,
      material,
      faces,
      flaps,
      glueTabs,
    }
  }

  /**
   * Generate a tray box structure
   */
  generateTrayBox(
    dimensions: BoxDimensions,
    material: MaterialProperties,
    options: {
      wallHeight?: number
      cornerRadius?: number
    } = {}
  ): BoxStructure {
    const { wallHeight = dimensions.depth * 0.5, cornerRadius = 5 } = options
    const { width, height, depth } = dimensions

    // Similar to regular box but with lower walls
    const structure = this.generateRegularBox(
      {
        ...dimensions,
        depth: wallHeight,
      },
      material,
      { hasTopFlap: false, hasBottomFlap: false }
    )

    structure.type = "tray"
    structure.name = "Tray Box"

    return structure
  }

  /**
   * Generate a sleeve box structure
   */
  generateSleeveBox(
    dimensions: BoxDimensions,
    material: MaterialProperties,
    options: {
      innerBox?: BoxDimensions
      gap?: number
    } = {}
  ): BoxStructure {
    const { gap = 2 } = options
    const { width, height, depth } = dimensions

    // Sleeve is essentially a box with open top and bottom
    const structure = this.generateRegularBox(
      dimensions,
      material,
      { hasTopFlap: false, hasBottomFlap: false }
    )

    // Remove top and bottom faces
    structure.faces = structure.faces.filter(
      (face) => face.type !== "top" && face.type !== "bottom"
    )

    structure.type = "sleeve"
    structure.name = "Sleeve Box"

    return structure
  }

  /**
   * Update box dimensions
   */
  updateDimensions(
    structure: BoxStructure,
    newDimensions: Partial<BoxDimensions>
  ): BoxStructure {
    const updatedDimensions = {
      ...structure.dimensions,
      ...newDimensions,
    }

    // Regenerate structure with new dimensions
    if (structure.type === "regular") {
      return this.generateRegularBox(updatedDimensions, structure.material)
    } else if (structure.type === "tray") {
      return this.generateTrayBox(updatedDimensions, structure.material)
    } else if (structure.type === "sleeve") {
      return this.generateSleeveBox(updatedDimensions, structure.material)
    }

    return structure
  }

  /**
   * Update material properties
   */
  updateMaterial(
    structure: BoxStructure,
    newMaterial: Partial<MaterialProperties>
  ): BoxStructure {
    return {
      ...structure,
      material: {
        ...structure.material,
        ...newMaterial,
      },
    }
  }

  /**
   * Calculate box volume
   */
  calculateVolume(dimensions: BoxDimensions): number {
    const { width, height, depth, unit } = dimensions
    let volume = width * height * depth

    // Convert to cubic meters
    if (unit === "mm") {
      volume = volume / 1000000000
    } else if (unit === "cm") {
      volume = volume / 1000000
    } else if (unit === "inch") {
      volume = volume * 0.0000163871
    }

    return volume
  }

  /**
   * Calculate box surface area
   */
  calculateSurfaceArea(dimensions: BoxDimensions): number {
    const { width, height, depth } = dimensions
    return 2 * (width * height + width * depth + height * depth)
  }

  /**
   * Calculate material usage
   */
  calculateMaterialUsage(structure: BoxStructure): number {
    let area = this.calculateSurfaceArea(structure.dimensions)

    // Add flap areas
    structure.flaps.forEach((flap) => {
      area += flap.width * flap.height
    })

    // Add glue tab areas
    structure.glueTabs?.forEach((tab) => {
      area += tab.width * tab.height
    })

    return area
  }
}

