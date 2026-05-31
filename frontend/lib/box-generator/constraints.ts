"use client"

import {
  BoxDimensions,
  BoxConstraints,
  ValidationError,
  ValidationWarning,
} from "./types"

export class DimensionConstraints {
  /**
   * Validate dimensions against constraints
   */
  validateDimensions(
    dimensions: BoxDimensions,
    constraints: BoxConstraints
  ): { isValid: boolean; errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    const { width, height, depth, unit } = dimensions

    // Convert to mm for comparison
    const widthMm = this.convertToMM(width, unit)
    const heightMm = this.convertToMM(height, unit)
    const depthMm = this.convertToMM(depth, unit)

    // Check minimum dimensions
    if (widthMm < constraints.minWidth) {
      errors.push({
        type: "dimension",
        message: `Width (${width}${unit}) is below minimum (${constraints.minWidth}mm)`,
        severity: "critical",
      })
    }

    if (heightMm < constraints.minHeight) {
      errors.push({
        type: "dimension",
        message: `Height (${height}${unit}) is below minimum (${constraints.minHeight}mm)`,
        severity: "critical",
      })
    }

    if (depthMm < constraints.minDepth) {
      errors.push({
        type: "dimension",
        message: `Depth (${depth}${unit}) is below minimum (${constraints.minDepth}mm)`,
        severity: "critical",
      })
    }

    // Check maximum dimensions
    if (widthMm > constraints.maxWidth) {
      errors.push({
        type: "dimension",
        message: `Width (${width}${unit}) exceeds maximum (${constraints.maxWidth}mm)`,
        severity: "critical",
      })
    }

    if (heightMm > constraints.maxHeight) {
      errors.push({
        type: "dimension",
        message: `Height (${height}${unit}) exceeds maximum (${constraints.maxHeight}mm)`,
        severity: "critical",
      })
    }

    if (depthMm > constraints.maxDepth) {
      errors.push({
        type: "dimension",
        message: `Depth (${depth}${unit}) exceeds maximum (${constraints.maxDepth}mm)`,
        severity: "critical",
      })
    }

    // Check aspect ratio
    if (constraints.aspectRatio) {
      const currentRatio = widthMm / heightMm
      const targetRatio = constraints.aspectRatio.width / constraints.aspectRatio.height
      const ratioDiff = Math.abs(currentRatio - targetRatio) / targetRatio

      if (ratioDiff > 0.1) {
        warnings.push({
          type: "dimension",
          message: `Aspect ratio (${currentRatio.toFixed(2)}) differs from recommended (${targetRatio.toFixed(2)})`,
          suggestion: `Consider adjusting dimensions to match ratio ${constraints.aspectRatio.width}:${constraints.aspectRatio.height}`,
        })
      }
    }

    // Check for very small dimensions
    if (widthMm < 10 || heightMm < 10 || depthMm < 10) {
      warnings.push({
        type: "dimension",
        message: "Very small dimensions may affect structural integrity",
        suggestion: "Consider increasing minimum dimensions",
      })
    }

    // Check for very large dimensions
    if (widthMm > 1000 || heightMm > 1000 || depthMm > 1000) {
      warnings.push({
        type: "dimension",
        message: "Very large dimensions may require additional structural support",
        suggestion: "Consider adding internal supports or dividers",
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Apply constraints to dimensions
   */
  applyConstraints(
    dimensions: BoxDimensions,
    constraints: BoxConstraints
  ): BoxDimensions {
    let { width, height, depth, unit } = dimensions

    // Convert to mm
    const widthMm = this.convertToMM(width, unit)
    const heightMm = this.convertToMM(height, unit)
    const depthMm = this.convertToMM(depth, unit)

    // Clamp to min/max
    const clampedWidth = Math.max(
      constraints.minWidth,
      Math.min(constraints.maxWidth, widthMm)
    )
    const clampedHeight = Math.max(
      constraints.minHeight,
      Math.min(constraints.maxHeight, heightMm)
    )
    const clampedDepth = Math.max(
      constraints.minDepth,
      Math.min(constraints.maxDepth, depthMm)
    )

    // Convert back to original unit
    return {
      width: this.convertFromMM(clampedWidth, unit),
      height: this.convertFromMM(clampedHeight, unit),
      depth: this.convertFromMM(clampedDepth, unit),
      unit,
    }
  }

  /**
   * Get default constraints
   */
  getDefaultConstraints(): BoxConstraints {
    return {
      minWidth: 50,
      maxWidth: 1000,
      minHeight: 50,
      maxHeight: 1000,
      minDepth: 50,
      maxDepth: 500,
    }
  }

  /**
   * Convert value to millimeters
   */
  private convertToMM(value: number, unit: "mm" | "cm" | "inch"): number {
    switch (unit) {
      case "mm":
        return value
      case "cm":
        return value * 10
      case "inch":
        return value * 25.4
      default:
        return value
    }
  }

  /**
   * Convert value from millimeters
   */
  private convertFromMM(value: number, unit: "mm" | "cm" | "inch"): number {
    switch (unit) {
      case "mm":
        return value
      case "cm":
        return value / 10
      case "inch":
        return value / 25.4
      default:
        return value
    }
  }
}

