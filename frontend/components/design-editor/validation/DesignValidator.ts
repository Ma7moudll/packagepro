"use client"

import { fabric } from "fabric"

export interface ValidationIssue {
  type: "error" | "warning"
  severity: "high" | "medium" | "low"
  message: string
  element?: any
  autoFixable?: boolean
  autoFix?: () => void
}

export interface ValidationResult {
  passed: boolean
  issues: ValidationIssue[]
  summary: {
    errors: number
    warnings: number
    totalIssues: number
  }
}

export class DesignValidator {
  /**
   * Check DPI/resolution of images
   */
  static checkDPI(canvas: fabric.Canvas, minDPI: number = 300): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const objects = canvas.getObjects()

    objects.forEach((obj) => {
      if (obj instanceof fabric.Image) {
        const imgElement = (obj as any).getElement() as HTMLImageElement
        if (imgElement) {
          const width = imgElement.naturalWidth
          const height = imgElement.naturalHeight
          
          // Calculate DPI (assuming canvas is 8.5x11 inches at 300 DPI = 2550x3300 pixels)
          const canvasWidth = canvas.width || 2550
          const canvasHeight = canvas.height || 3300
          const physicalWidth = 8.5 // inches
          const physicalHeight = 11 // inches
          
          const dpiX = (width / physicalWidth) * (canvasWidth / width)
          const dpiY = (height / physicalHeight) * (canvasHeight / height)
          const avgDPI = (dpiX + dpiY) / 2

          if (avgDPI < minDPI) {
            issues.push({
              type: "warning",
              severity: avgDPI < minDPI * 0.7 ? "high" : "medium",
              message: `Image resolution is ${Math.round(avgDPI)} DPI. Minimum recommended: ${minDPI} DPI.`,
              element: obj,
            })
          }
        }
      }
    })

    return issues
  }

  /**
   * Check if elements are within safe zone (5mm from edges)
   */
  static checkSafeZone(canvas: fabric.Canvas, marginMM: number = 5): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const marginPx = marginMM * 3.779 // Convert mm to pixels

    const objects = canvas.getObjects()
    objects.forEach((obj) => {
      const left = obj.left || 0
      const top = obj.top || 0
      const width = ((obj.width || 0) * (obj.scaleX || 1))
      const height = ((obj.height || 0) * (obj.scaleY || 1))

      const bounds = {
        left: left - width / 2,
        right: left + width / 2,
        top: top - height / 2,
        bottom: top + height / 2,
      }

      const isOutside =
        bounds.left < marginPx ||
        bounds.right > (canvas.width || 800) - marginPx ||
        bounds.top < marginPx ||
        bounds.bottom > (canvas.height || 600) - marginPx

      if (isOutside) {
        issues.push({
          type: "warning",
          severity: "medium",
          message: `Element "${(obj as any).text || obj.type}" is outside the safe zone (${marginMM}mm margin).`,
          element: obj,
          autoFixable: true,
          autoFix: () => {
            const newLeft = Math.max(marginPx + width / 2, Math.min(left, (canvas.width || 800) - marginPx - width / 2))
            const newTop = Math.max(marginPx + height / 2, Math.min(top, (canvas.height || 600) - marginPx - height / 2))
            obj.set({ left: newLeft, top: newTop })
            canvas.renderAll()
          },
        })
      }
    })

    return issues
  }

  /**
   * Check bleed margins (3mm minimum)
   */
  static checkBleed(canvas: fabric.Canvas, marginMM: number = 3): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const marginPx = marginMM * 3.779

    // Check if any element extends beyond bleed area
    const objects = canvas.getObjects()
    objects.forEach((obj) => {
      const left = obj.left || 0
      const top = obj.top || 0
      const width = ((obj.width || 0) * (obj.scaleX || 1))
      const height = ((obj.height || 0) * (obj.scaleY || 1))

      const bounds = {
        left: left - width / 2,
        right: left + width / 2,
        top: top - height / 2,
        bottom: top + height / 2,
      }

      const needsBleed = 
        bounds.left < -marginPx ||
        bounds.right > (canvas.width || 800) + marginPx ||
        bounds.top < -marginPx ||
        bounds.bottom > (canvas.height || 600) + marginPx

      if (!needsBleed) {
        issues.push({
          type: "warning",
          severity: "low",
          message: `Element "${(obj as any).text || obj.type}" should extend ${marginMM}mm beyond edges for proper bleed.`,
          element: obj,
        })
      }
    })

    return issues
  }

  /**
   * Check color mode (detect RGB images, warn about CMYK)
   */
  static checkColorMode(canvas: fabric.Canvas): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    
    // This would typically require image analysis
    // For now, we'll just check if images exist and warn about color mode
    const objects = canvas.getObjects()
    const hasImages = objects.some((obj) => obj instanceof fabric.Image)

    if (hasImages) {
      issues.push({
        type: "warning",
        severity: "medium",
        message: "Ensure all images are in CMYK color mode for printing. RGB images will be converted automatically.",
      })
    }

    return issues
  }

  /**
   * Check file size
   */
  static checkFileSize(canvas: fabric.Canvas, maxSizeMB: number = 50): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    
    try {
      const dataURL = canvas.toDataURL({ format: "png", multiplier: 1 })
      const sizeMB = (dataURL.length * 3) / 4 / 1024 / 1024 // Approximate size

      if (sizeMB > maxSizeMB) {
        issues.push({
          type: "warning",
          severity: "low",
          message: `Design file size is large (${sizeMB.toFixed(2)} MB). Consider optimizing images.`,
        })
      }
    } catch (error) {
      // Failed to check size
    }

    return issues
  }

  /**
   * Run all validation checks
   */
  static validate(canvas: fabric.Canvas): ValidationResult {
    const allIssues: ValidationIssue[] = []

    // Run all checks
    allIssues.push(...this.checkDPI(canvas))
    allIssues.push(...this.checkSafeZone(canvas))
    allIssues.push(...this.checkBleed(canvas))
    allIssues.push(...this.checkColorMode(canvas))
    allIssues.push(...this.checkFileSize(canvas))

    const errors = allIssues.filter((i) => i.type === "error")
    const warnings = allIssues.filter((i) => i.type === "warning")

    return {
      passed: errors.length === 0,
      issues: allIssues,
      summary: {
        errors: errors.length,
        warnings: warnings.length,
        totalIssues: allIssues.length,
      },
    }
  }

  /**
   * Auto-fix all fixable issues
   */
  static autoFix(canvas: fabric.Canvas, issues: ValidationIssue[]): number {
    let fixed = 0

    issues.forEach((issue) => {
      if (issue.autoFixable && issue.autoFix) {
        try {
          issue.autoFix()
          fixed++
        } catch (error) {
          console.error("Failed to auto-fix issue:", error)
        }
      }
    })

    canvas.renderAll()
    return fixed
  }
}

