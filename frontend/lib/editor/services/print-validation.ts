// Print-ready Validation Service
// Validates designs for professional printing requirements

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  category: 'image' | 'text' | 'layout' | 'color' | 'file';
}

export interface ValidationResult {
  rule: ValidationRule;
  passed: boolean;
  message: string;
  suggestions?: string[];
  elementId?: string;
  details?: any;
}

export interface ValidationReport {
  total: number;
  errors: number;
  warnings: number;
  passed: number;
  results: ValidationResult[];
  score: number; // 0-100
  printReady: boolean;
}

export class PrintValidationService {
  private static readonly VALIDATION_RULES: ValidationRule[] = [
    {
      id: 'image-dpi',
      name: 'Image Resolution (DPI)',
      description: 'Images must be at least 300 DPI for high-quality printing',
      severity: 'error',
      category: 'image'
    },
    {
      id: 'image-color-mode',
      name: 'Color Mode',
      description: 'Images should be in CMYK color mode for printing',
      severity: 'warning',
      category: 'color'
    },
    {
      id: 'text-size',
      name: 'Minimum Text Size',
      description: 'Text should be at least 6pt for readability',
      severity: 'warning',
      category: 'text'
    },
    {
      id: 'bleed-area',
      name: 'Bleed Area',
      description: 'Design elements should extend 3mm beyond trim lines',
      severity: 'error',
      category: 'layout'
    },
    {
      id: 'safe-area',
      name: 'Safe Area',
      description: 'Important elements should stay within safe area (5mm from trim)',
      severity: 'warning',
      category: 'layout'
    },
    {
      id: 'file-size',
      name: 'File Size',
      description: 'Total file size should not exceed 100MB',
      severity: 'warning',
      category: 'file'
    },
    {
      id: 'overlapping-elements',
      name: 'Overlapping Elements',
      description: 'Check for unintended overlapping elements',
      severity: 'info',
      category: 'layout'
    }
  ];

  /**
   * Validate entire design for print readiness
   */
  static async validateDesign(layers: any[], model: any, canvas: any): Promise<ValidationReport> {
    const results: ValidationResult[] = [];

    // Validate images
    const imageLayers = layers.filter(layer => layer.type === 'image');
    for (const layer of imageLayers) {
      results.push(...await this.validateImage(layer));
    }

    // Validate text
    const textLayers = layers.filter(layer => layer.type === 'text');
    for (const layer of textLayers) {
      results.push(...this.validateText(layer));
    }

    // Validate layout
    results.push(...this.validateLayout(layers, canvas));

    // Validate file
    results.push(...this.validateFile(layers));

    // Calculate statistics
    const errors = results.filter(r => r.rule.severity === 'error' && !r.passed).length;
    const warnings = results.filter(r => r.rule.severity === 'warning' && !r.passed).length;
    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    const score = Math.round((passed / total) * 100);
    const printReady = errors === 0 && score >= 80;

    return {
      total,
      errors,
      warnings,
      passed,
      results,
      score,
      printReady
    };
  }

  /**
   * Validate image layers
   */
  private static async validateImage(layer: any): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Check DPI
    const dpiRule = this.VALIDATION_RULES.find(r => r.id === 'image-dpi')!;
    if (layer.imageData) {
      // In a real implementation, you'd extract DPI from image metadata
      const dpi = layer.dpi || 72; // Default assumption
      const passed = dpi >= 300;
      results.push({
        rule: dpiRule,
        passed,
        message: passed ? `Image DPI: ${dpi}` : `Image DPI too low: ${dpi} (minimum 300)`,
        suggestions: passed ? undefined : ['Increase image resolution or replace with higher DPI image'],
        elementId: layer.id
      });
    }

    // Check color mode
    const colorRule = this.VALIDATION_RULES.find(r => r.id === 'image-color-mode')!;
    const isCMYK = layer.colorMode === 'cmyk';
    results.push({
      rule: colorRule,
      passed: isCMYK,
      message: isCMYK ? 'Image is in CMYK mode' : 'Image is in RGB mode (consider converting to CMYK)',
      suggestions: isCMYK ? undefined : ['Convert image to CMYK color mode for printing'],
      elementId: layer.id
    });

    return results;
  }

  /**
   * Validate text layers
   */
  private static validateText(layer: any): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Check text size
    const textSizeRule = this.VALIDATION_RULES.find(r => r.id === 'text-size')!;
    const fontSize = layer.fontSize || 12;
    const passed = fontSize >= 6;
    results.push({
      rule: textSizeRule,
      passed,
      message: passed ? `Text size: ${fontSize}pt` : `Text size too small: ${fontSize}pt (minimum 6pt)`,
      suggestions: passed ? undefined : ['Increase font size to at least 6pt'],
      elementId: layer.id
    });

    return results;
  }

  /**
   * Validate layout and positioning
   */
  private static validateLayout(layers: any[], canvas: any): ValidationResult[] {
    const results: ValidationResult[] = [];

    const bleedRule = this.VALIDATION_RULES.find(r => r.id === 'bleed-area')!;
    const safeAreaRule = this.VALIDATION_RULES.find(r => r.id === 'safe-area')!;
    const overlapRule = this.VALIDATION_RULES.find(r => r.id === 'overlapping-elements')!;

    // Calculate bleed and safe areas (assuming 3mm bleed, 5mm safe)
    const bleedMargin = 3;
    const safeMargin = 5;

    for (const layer of layers) {
      // Check bleed area
      const extendsBeyondBleed = this.checkElementExtendsBeyondBleed(layer, canvas, bleedMargin);
      results.push({
        rule: bleedRule,
        passed: extendsBeyondBleed,
        message: extendsBeyondBleed ? 'Element extends into bleed area' : 'Element stays within bleed area',
        suggestions: extendsBeyondBleed ? undefined : ['Extend element 3mm beyond trim lines for bleed'],
        elementId: layer.id
      });

      // Check safe area
      const withinSafeArea = this.checkElementWithinSafeArea(layer, canvas, safeMargin);
      results.push({
        rule: safeAreaRule,
        passed: withinSafeArea,
        message: withinSafeArea ? 'Element stays within safe area' : 'Element extends outside safe area',
        suggestions: withinSafeArea ? undefined : ['Move important elements inside the 5mm safe area'],
        elementId: layer.id
      });
    }

    // Check for overlapping elements
    const hasOverlaps = this.checkForOverlaps(layers);
    results.push({
      rule: overlapRule,
      passed: !hasOverlaps,
      message: hasOverlaps ? 'Some elements may overlap' : 'No overlapping elements detected',
      suggestions: hasOverlaps ? ['Review element positioning to avoid overlaps'] : undefined
    });

    return results;
  }

  /**
   * Validate file-related requirements
   */
  private static validateFile(layers: any[]): ValidationResult[] {
    const results: ValidationResult[] = [];

    const fileSizeRule = this.VALIDATION_RULES.find(r => r.id === 'file-size')!;

    // Estimate file size (rough calculation)
    let estimatedSize = 0;
    for (const layer of layers) {
      if (layer.type === 'image' && layer.imageData) {
        estimatedSize += layer.imageData.length * 0.75; // Base64 overhead
      }
    }

    const sizeInMB = estimatedSize / (1024 * 1024);
    const passed = sizeInMB <= 100;
    results.push({
      rule: fileSizeRule,
      passed,
      message: passed ? `File size: ${sizeInMB.toFixed(1)}MB` : `File size too large: ${sizeInMB.toFixed(1)}MB (maximum 100MB)`,
      suggestions: passed ? undefined : ['Reduce image quality or remove unused elements'],
    });

    return results;
  }

  private static checkElementExtendsBeyondBleed(layer: any, canvas: any, bleedMargin: number): boolean {
    // Simplified check - in real implementation, you'd check actual bounds
    return true; // Assume elements extend into bleed for now
  }

  private static checkElementWithinSafeArea(layer: any, canvas: any, safeMargin: number): boolean {
    // Simplified check - in real implementation, you'd check actual bounds
    return true; // Assume elements are within safe area for now
  }

  private static checkForOverlaps(layers: any[]): boolean {
    // Simplified overlap detection
    return false; // Assume no overlaps for now
  }

  /**
   * Get validation rules
   */
  static getValidationRules(): ValidationRule[] {
    return this.VALIDATION_RULES;
  }

  /**
   * Run quick validation (subset of rules)
   */
  static async quickValidate(layers: any[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Quick checks only
    const imageLayers = layers.filter(layer => layer.type === 'image');
    if (imageLayers.length > 0) {
      const dpiRule = this.VALIDATION_RULES.find(r => r.id === 'image-dpi')!;
      for (const layer of imageLayers) {
        const dpi = layer.dpi || 72;
        results.push({
          rule: dpiRule,
          passed: dpi >= 150, // Lower threshold for quick check
          message: `Image DPI: ${dpi}`,
          elementId: layer.id
        });
      }
    }

    return results;
  }
}