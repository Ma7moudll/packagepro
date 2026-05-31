"use client"

import { BoxStructure, MaterialProperties } from "./types"

export class MaterialThicknessSimulator {
  /**
   * Apply material thickness to box structure
   */
  applyThickness(structure: BoxStructure): BoxStructure {
    const { thickness } = structure.material
    const updatedFaces = structure.faces.map((face) => {
      // Adjust face dimensions based on thickness
      let adjustedWidth = face.width
      let adjustedHeight = face.height

      // For faces that share edges, reduce dimensions
      if (face.type === "front" || face.type === "back") {
        adjustedWidth = face.width - thickness * 2
        adjustedHeight = face.height - thickness * 2
      } else if (face.type === "left" || face.type === "right") {
        adjustedWidth = face.width - thickness * 2
        adjustedHeight = face.height - thickness * 2
      } else if (face.type === "top" || face.type === "bottom") {
        adjustedWidth = face.width - thickness * 2
        adjustedHeight = face.height - thickness * 2
      }

      return {
        ...face,
        width: Math.max(0, adjustedWidth),
        height: Math.max(0, adjustedHeight),
      }
    })

    return {
      ...structure,
      faces: updatedFaces,
    }
  }

  /**
   * Calculate material volume
   */
  calculateMaterialVolume(structure: BoxStructure): number {
    const { thickness } = structure.material
    let volume = 0

    // Calculate volume for each face
    structure.faces.forEach((face) => {
      volume += face.width * face.height * thickness
    })

    // Add flaps
    structure.flaps.forEach((flap) => {
      volume += flap.width * flap.height * thickness
    })

    // Add glue tabs
    structure.glueTabs?.forEach((tab) => {
      volume += tab.width * tab.height * thickness
    })

    return volume
  }

  /**
   * Calculate material weight
   */
  calculateMaterialWeight(structure: BoxStructure): number {
    const volume = this.calculateMaterialVolume(structure)
    const { density } = structure.material // kg/m³

    // Convert volume to m³ (assuming dimensions are in mm)
    const volumeM3 = volume / 1000000000

    return volumeM3 * density
  }

  /**
   * Simulate material deformation
   */
  simulateDeformation(
    structure: BoxStructure,
    load: number
  ): { deformation: number; stress: number } {
    const { stiffness } = structure.material
    const { width, height, depth } = structure.dimensions

    // Simple beam deflection calculation
    const area = width * height
    const stress = load / area
    const deformation = (load * Math.pow(height, 3)) / (3 * stiffness * area)

    return {
      deformation: Math.max(0, deformation),
      stress,
    }
  }

  /**
   * Get material properties for common materials
   */
  getMaterialProperties(materialType: string): MaterialProperties {
    const materials: Record<string, MaterialProperties> = {
      cardboard: {
        thickness: 0.5,
        density: 700, // kg/m³
        stiffness: 2000000, // N/m²
        color: "#f5f5dc",
        texture: "cardboard",
      },
      "corrugated-cardboard": {
        thickness: 3.0,
        density: 150,
        stiffness: 5000000,
        color: "#d4a574",
        texture: "corrugated",
      },
      "kraft-paper": {
        thickness: 0.2,
        density: 800,
        stiffness: 1000000,
        color: "#d2b48c",
        texture: "kraft",
      },
      "white-cardboard": {
        thickness: 0.8,
        density: 900,
        stiffness: 3000000,
        color: "#ffffff",
        texture: "smooth",
      },
    }

    return (
      materials[materialType] || {
        thickness: 0.5,
        density: 700,
        stiffness: 2000000,
        color: "#f5f5dc",
      }
    )
  }

  /**
   * Visualize material thickness in 3D
   */
  getThicknessVisualization(structure: BoxStructure): {
    faces: Array<{
      id: string
      outer: { width: number; height: number }
      inner: { width: number; height: number }
      thickness: number
    }>
  } {
    const { thickness } = structure.material

    return {
      faces: structure.faces.map((face) => ({
        id: face.id,
        outer: {
          width: face.width,
          height: face.height,
        },
        inner: {
          width: Math.max(0, face.width - thickness * 2),
          height: Math.max(0, face.height - thickness * 2),
        },
        thickness,
      })),
    }
  }
}

