import * as THREE from "three"

export type MaterialType =
  | "cardboard-natural"
  | "cardboard-white"
  | "kraft"
  | "corrugated"
  | "glossy"
  | "matte"

export interface MaterialProperties {
  color: string | number
  metalness: number
  roughness: number
  texture?: string
}

export class MaterialSystem {
  private static textureLoader = new THREE.TextureLoader()

  /**
   * Get material properties for a specific material type
   */
  static getMaterialProperties(type: MaterialType): MaterialProperties {
    const materials: Record<MaterialType, MaterialProperties> = {
      "cardboard-natural": {
        color: "#d4a574", // Natural brown cardboard
        metalness: 0.1,
        roughness: 0.7,
      },
      "cardboard-white": {
        color: "#ffffff", // White cardboard
        metalness: 0.05,
        roughness: 0.8,
      },
      kraft: {
        color: "#b87333", // Kraft paper brown
        metalness: 0.08,
        roughness: 0.75,
      },
      corrugated: {
        color: "#c9a96e", // Corrugated cardboard
        metalness: 0.12,
        roughness: 0.65,
      },
      glossy: {
        color: "#ffffff",
        metalness: 0.5,
        roughness: 0.2,
      },
      matte: {
        color: "#ffffff",
        metalness: 0.0,
        roughness: 0.9,
      },
    }

    return materials[type] || materials["cardboard-natural"]
  }

  /**
   * Create a Three.js material from material type
   */
  static createMaterial(
    type: MaterialType,
    textureUrl?: string,
    customColor?: string | number
  ): THREE.MeshStandardMaterial {
    const properties = this.getMaterialProperties(type)
    const color = customColor || properties.color

    const material = new THREE.MeshStandardMaterial({
      color: typeof color === "string" ? new THREE.Color(color) : color,
      metalness: properties.metalness,
      roughness: properties.roughness,
    })

    if (textureUrl) {
      const texture = this.textureLoader.load(textureUrl)
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      material.map = texture
    }

    return material
  }

  /**
   * Create material with CMYK color support
   */
  static createCMYKMaterial(
    c: number,
    m: number,
    y: number,
    k: number,
    materialType: MaterialType = "cardboard-white"
  ): THREE.MeshStandardMaterial {
    // Convert CMYK to RGB
    const r = Math.round(255 * (1 - c) * (1 - k))
    const g = Math.round(255 * (1 - m) * (1 - k))
    const b = Math.round(255 * (1 - y) * (1 - k))

    const rgbColor = new THREE.Color(r / 255, g / 255, b / 255)
    const properties = this.getMaterialProperties(materialType)

    return new THREE.MeshStandardMaterial({
      color: rgbColor,
      metalness: properties.metalness,
      roughness: properties.roughness,
    })
  }

  /**
   * Create material with Pantone color
   * Note: This is a simplified implementation. Full Pantone support would require a color database.
   */
  static createPantoneMaterial(
    pantoneCode: string,
    materialType: MaterialType = "cardboard-white"
  ): THREE.MeshStandardMaterial {
    // Simplified Pantone color mapping
    // In production, this should query a Pantone color database
    const pantoneColors: Record<string, string> = {
      "PANTONE 286 C": "#0033a0",
      "PANTONE 186 C": "#c8102e",
      "PANTONE 116 C": "#ffcd00",
      "PANTONE 361 C": "#00b04f",
      // Add more Pantone colors as needed
    }

    const color = pantoneColors[pantoneCode] || "#ffffff"
    const properties = this.getMaterialProperties(materialType)

    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness: properties.metalness,
      roughness: properties.roughness,
    })
  }

  /**
   * Apply texture to existing material
   */
  static applyTexture(
    material: THREE.MeshStandardMaterial,
    textureUrl: string,
    repeatX: number = 1,
    repeatY: number = 1
  ): void {
    const texture = this.textureLoader.load(textureUrl)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(repeatX, repeatY)
    material.map = texture
    material.needsUpdate = true
  }
}

