"use client"

import {
  BoxStructure,
  StructuralValidation,
  ValidationError,
  ValidationWarning,
} from "./types"

export class StructuralIntegrityValidator {
  /**
   * Validate box structure
   */
  validate(structure: BoxStructure): StructuralValidation {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Check dimensions
    const dimensionCheck = this.validateDimensions(structure)
    errors.push(...dimensionCheck.errors)
    warnings.push(...dimensionCheck.warnings)

    // Check material
    const materialCheck = this.validateMaterial(structure)
    errors.push(...materialCheck.errors)
    warnings.push(...materialCheck.warnings)

    // Check flaps
    const flapCheck = this.validateFlaps(structure)
    errors.push(...flapCheck.errors)
    warnings.push(...flapCheck.warnings)

    // Check glue tabs
    const glueCheck = this.validateGlueTabs(structure)
    errors.push(...glueCheck.errors)
    warnings.push(...glueCheck.warnings)

    // Calculate strength and stability
    const strength = this.calculateStrength(structure)
    const stability = this.calculateStability(structure)

    // Add warnings for low strength/stability
    if (strength < 0.5) {
      warnings.push({
        type: "structure",
        message: "Low structural strength detected",
        suggestion: "Consider increasing material thickness or adding reinforcements",
      })
    }

    if (stability < 0.5) {
      warnings.push({
        type: "structure",
        message: "Low stability detected",
        suggestion: "Consider adjusting dimensions or adding support structures",
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      strength,
      stability,
    }
  }

  /**
   * Validate dimensions
   */
  private validateDimensions(structure: BoxStructure): {
    errors: ValidationError[]
    warnings: ValidationWarning[]
  } {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    const { width, height, depth } = structure.dimensions

    // Check for zero or negative dimensions
    if (width <= 0 || height <= 0 || depth <= 0) {
      errors.push({
        type: "dimension",
        message: "All dimensions must be greater than zero",
        severity: "critical",
      })
    }

    // Check aspect ratios
    const aspectRatio = width / height
    if (aspectRatio > 3 || aspectRatio < 0.33) {
      warnings.push({
        type: "dimension",
        message: "Extreme aspect ratio may affect stability",
        suggestion: "Consider adjusting dimensions for better stability",
      })
    }

    // Check minimum dimensions
    if (width < 50 || height < 50 || depth < 50) {
      warnings.push({
        type: "dimension",
        message: "Very small dimensions may be difficult to manufacture",
        suggestion: "Consider increasing minimum dimensions to 50mm",
      })
    }

    return { errors, warnings }
  }

  /**
   * Validate material properties
   */
  private validateMaterial(structure: BoxStructure): {
    errors: ValidationError[]
    warnings: ValidationWarning[]
  } {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    const { thickness, density, stiffness } = structure.material

    // Check thickness
    if (thickness <= 0) {
      errors.push({
        type: "material",
        message: "Material thickness must be greater than zero",
        severity: "critical",
      })
    }

    if (thickness < 0.2) {
      warnings.push({
        type: "material",
        message: "Very thin material may not provide adequate strength",
        suggestion: "Consider increasing material thickness",
      })
    }

    // Check density
    if (density <= 0) {
      errors.push({
        type: "material",
        message: "Material density must be greater than zero",
        severity: "critical",
      })
    }

    // Check stiffness
    if (stiffness <= 0) {
      errors.push({
        type: "material",
        message: "Material stiffness must be greater than zero",
        severity: "critical",
      })
    }

    return { errors, warnings }
  }

  /**
   * Validate flaps
   */
  private validateFlaps(structure: BoxStructure): {
    errors: ValidationError[]
    warnings: ValidationWarning[]
  } {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    structure.flaps.forEach((flap) => {
      // Check flap dimensions
      if (flap.width <= 0 || flap.height <= 0) {
        errors.push({
          type: "flap",
          message: `Flap ${flap.id} has invalid dimensions`,
          severity: "high",
        })
      }

      // Check if flap is too large
      const { width, height } = structure.dimensions
      if (flap.width > width * 1.5 || flap.height > height * 1.5) {
        warnings.push({
          type: "flap",
          message: `Flap ${flap.id} may be too large`,
          suggestion: "Consider reducing flap size",
        })
      }

      // Check if flap is too small
      if (flap.height < 10) {
        warnings.push({
          type: "flap",
          message: `Flap ${flap.id} may be too small to be functional`,
          suggestion: "Consider increasing flap height",
        })
      }
    })

    return { errors, warnings }
  }

  /**
   * Validate glue tabs
   */
  private validateGlueTabs(structure: BoxStructure): {
    errors: ValidationError[]
    warnings: ValidationWarning[]
  } {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    structure.glueTabs?.forEach((tab) => {
      // Check tab dimensions
      if (tab.width <= 0 || tab.height <= 0) {
        errors.push({
          type: "glue",
          message: `Glue tab ${tab.id} has invalid dimensions`,
          severity: "high",
        })
      }

      // Check if tab is too small
      if (tab.width < 10) {
        warnings.push({
          type: "glue",
          message: `Glue tab ${tab.id} may be too small for secure bonding`,
          suggestion: "Consider increasing glue tab width to at least 10mm",
        })
      }
    })

    return { errors, warnings }
  }

  /**
   * Calculate structural strength
   */
  private calculateStrength(structure: BoxStructure): number {
    const { thickness, stiffness } = structure.material
    const { width, height, depth } = structure.dimensions

    // Simple strength calculation based on material properties and dimensions
    const volume = width * height * depth
    const materialStrength = stiffness * thickness
    const dimensionFactor = Math.min(width, height, depth) / Math.max(width, height, depth)

    // Normalize to 0-1
    const strength = Math.min(1, (materialStrength * dimensionFactor) / 10000000)

    return strength
  }

  /**
   * Calculate structural stability
   */
  private calculateStability(structure: BoxStructure): number {
    const { width, height, depth } = structure.dimensions

    // Calculate center of mass
    const centerOfMass = {
      x: width / 2,
      y: height / 2,
      z: depth / 2,
    }

    // Calculate base area
    const baseArea = width * depth

    // Stability is based on base area and height ratio
    const stabilityRatio = baseArea / (height * height)
    const stability = Math.min(1, stabilityRatio * 10)

    return stability
  }
}

