// Dieline Design Service
// Professional dieline templates and customization for packaging

export interface DielineTemplate {
  id: string;
  name: string;
  category: 'box' | 'bag' | 'card' | 'tube' | 'tray';
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  svgPath: string; // SVG path data for the dieline
  cutLines: string[]; // SVG paths for cut lines
  foldLines: string[]; // SVG paths for fold lines
  glueFlaps: string[]; // SVG paths for glue areas
  thumb?: string; // Thumbnail image
  description?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface DielineCustomization {
  scale: number;
  rotation: number;
  position: { x: number; y: number };
  customDimensions?: {
    length: number;
    width: number;
    height: number;
  };
  material: string;
  thickness: number;
}

export interface DielineDesign {
  template: DielineTemplate;
  customization: DielineCustomization;
  elements: DielineElement[];
}

export interface DielineElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  content: any;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
  face: string; // Which face of the dieline
}

export class DielineService {
  private static readonly TEMPLATES: DielineTemplate[] = [
    // Mailer Box
    {
      id: 'mailer-box-standard',
      name: 'Mailer Box Standard',
      category: 'box',
      dimensions: { length: 200, width: 150, height: 100 },
      svgPath: 'M0,0 L200,0 L200,150 L0,150 Z', // Simplified path
      cutLines: ['M0,0 L200,0 L200,150 L0,150 Z'],
      foldLines: ['M100,0 L100,150', 'M0,75 L200,75'],
      glueFlaps: ['M180,140 L200,140 L200,150 L180,150 Z'],
      description: 'Standard mailer box for shipping',
      difficulty: 'easy',
    },
    // Rigid Box
    {
      id: 'rigid-box-luxury',
      name: 'Luxury Rigid Box',
      category: 'box',
      dimensions: { length: 150, width: 100, height: 80 },
      svgPath: 'M0,0 L150,0 L150,100 L0,100 Z',
      cutLines: ['M0,0 L150,0 L150,100 L0,100 Z'],
      foldLines: ['M75,0 L75,100', 'M0,50 L150,50'],
      glueFlaps: ['M140,90 L150,90 L150,100 L140,100 Z'],
      description: 'Premium rigid box for luxury products',
      difficulty: 'medium',
    },
    // Folding Carton
    {
      id: 'folding-carton-simple',
      name: 'Simple Folding Carton',
      category: 'box',
      dimensions: { length: 100, width: 70, height: 30 },
      svgPath: 'M0,0 L100,0 L100,70 L0,70 Z',
      cutLines: ['M0,0 L100,0 L100,70 L0,70 Z'],
      foldLines: ['M50,0 L50,70', 'M0,35 L100,35'],
      glueFlaps: ['M90,60 L100,60 L100,70 L90,70 Z'],
      description: 'Simple folding carton for retail',
      difficulty: 'easy',
    },
    // Gift Bag
    {
      id: 'gift-bag-medium',
      name: 'Medium Gift Bag',
      category: 'bag',
      dimensions: { length: 250, width: 150, height: 300 },
      svgPath: 'M0,0 L250,0 L250,150 L200,150 L200,300 L50,300 L50,150 L0,150 Z',
      cutLines: ['M0,0 L250,0 L250,150 L200,150 L200,300 L50,300 L50,150 L0,150 Z'],
      foldLines: ['M125,0 L125,150', 'M0,75 L250,75', 'M200,150 L200,300', 'M50,150 L50,300'],
      glueFlaps: ['M190,290 L200,290 L200,300 L190,300 Z'],
      description: 'Medium size gift bag',
      difficulty: 'medium',
    },
    // Business Card
    {
      id: 'business-card-standard',
      name: 'Business Card',
      category: 'card',
      dimensions: { length: 85.6, width: 53.98, height: 0.3 },
      svgPath: 'M0,0 L85.6,0 L85.6,53.98 L0,53.98 Z',
      cutLines: ['M0,0 L85.6,0 L85.6,53.98 L0,53.98 Z'],
      foldLines: [],
      glueFlaps: [],
      description: 'Standard business card size',
      difficulty: 'easy',
    },
  ];

  /**
   * Get all available dieline templates
   */
  static getTemplates(category?: string): DielineTemplate[] {
    if (category) {
      return this.TEMPLATES.filter(template => template.category === category);
    }
    return this.TEMPLATES;
  }

  /**
   * Get template by ID
   */
  static getTemplateById(id: string): DielineTemplate | null {
    return this.TEMPLATES.find(template => template.id === id) || null;
  }

  /**
   * Get templates by category
   */
  static getTemplatesByCategory(category: string): DielineTemplate[] {
    return this.TEMPLATES.filter(template => template.category === category);
  }

  /**
   * Create a new dieline design from template
   */
  static createDesign(templateId: string, customization?: Partial<DielineCustomization>): DielineDesign | null {
    const template = this.getTemplateById(templateId);
    if (!template) return null;

    const defaultCustomization: DielineCustomization = {
      scale: 1,
      rotation: 0,
      position: { x: 0, y: 0 },
      material: 'cardboard-kraft',
      thickness: 1.5,
    };

    return {
      template,
      customization: { ...defaultCustomization, ...customization },
      elements: [],
    };
  }

  /**
   * Customize dieline dimensions
   */
  static customizeDimensions(
    template: DielineTemplate,
    newDimensions: { length: number; width: number; height: number }
  ): DielineTemplate {
    // Calculate scale factors
    const scaleX = newDimensions.length / template.dimensions.length;
    const scaleY = newDimensions.width / template.dimensions.width;
    const scaleZ = newDimensions.height / template.dimensions.height;

    // Scale SVG paths (simplified - in real implementation, use proper SVG transformation)
    const scaledSvgPath = this.scaleSvgPath(template.svgPath, scaleX, scaleY);
    const scaledCutLines = template.cutLines.map(path => this.scaleSvgPath(path, scaleX, scaleY));
    const scaledFoldLines = template.foldLines.map(path => this.scaleSvgPath(path, scaleX, scaleY));
    const scaledGlueFlaps = template.glueFlaps.map(path => this.scaleSvgPath(path, scaleX, scaleY));

    return {
      ...template,
      dimensions: newDimensions,
      svgPath: scaledSvgPath,
      cutLines: scaledCutLines,
      foldLines: scaledFoldLines,
      glueFlaps: scaledGlueFlaps,
    };
  }

  /**
   * Add element to dieline design
   */
  static addElement(
    design: DielineDesign,
    element: Omit<DielineElement, 'id'>
  ): DielineDesign {
    const newElement: DielineElement = {
      ...element,
      id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    return {
      ...design,
      elements: [...design.elements, newElement],
    };
  }

  /**
   * Update element in dieline design
   */
  static updateElement(
    design: DielineDesign,
    elementId: string,
    updates: Partial<DielineElement>
  ): DielineDesign {
    return {
      ...design,
      elements: design.elements.map(element =>
        element.id === elementId ? { ...element, ...updates } : element
      ),
    };
  }

  /**
   * Remove element from dieline design
   */
  static removeElement(design: DielineDesign, elementId: string): DielineDesign {
    return {
      ...design,
      elements: design.elements.filter(element => element.id !== elementId),
    };
  }

  /**
   * Export dieline as SVG
   */
  static exportAsSVG(design: DielineDesign): string {
    const { template, customization, elements } = design;

    // Create SVG content
    let svgContent = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">`;

    // Add background
    svgContent += `<rect width="100%" height="100%" fill="#f8f9fa"/>`;

    // Transform for customization
    const transform = `translate(${customization.position.x}, ${customization.position.y}) scale(${customization.scale}) rotate(${customization.rotation})`;

    // Add dieline paths
    svgContent += `<g transform="${transform}">`;

    // Cut lines (solid black)
    design.template.cutLines.forEach(path => {
      svgContent += `<path d="${path}" fill="none" stroke="#000000" stroke-width="1"/>`;
    });

    // Fold lines (dashed gray)
    design.template.foldLines.forEach(path => {
      svgContent += `<path d="${path}" fill="none" stroke="#666666" stroke-width="0.5" stroke-dasharray="5,5"/>`;
    });

    // Glue flaps (red fill)
    design.template.glueFlaps.forEach(path => {
      svgContent += `<path d="${path}" fill="#ff6b6b" stroke="#000000" stroke-width="0.5"/>`;
    });

    // Add design elements
    elements.forEach(element => {
      if (element.type === 'text') {
        svgContent += `<text x="${element.position.x}" y="${element.position.y}" font-size="${element.size.height}" fill="#000000" transform="rotate(${element.rotation} ${element.position.x} ${element.position.y})">${element.content}</text>`;
      } else if (element.type === 'image') {
        svgContent += `<image x="${element.position.x}" y="${element.position.y}" width="${element.size.width}" height="${element.size.height}" href="${element.content}" transform="rotate(${element.rotation} ${element.position.x} ${element.position.y})"/>`;
      } else if (element.type === 'shape') {
        // Simplified shape rendering
        svgContent += `<rect x="${element.position.x}" y="${element.position.y}" width="${element.size.width}" height="${element.size.height}" fill="#cccccc" stroke="#000000" transform="rotate(${element.rotation} ${element.position.x} ${element.position.y})"/>`;
      }
    });

    svgContent += `</g>`;
    svgContent += `</svg>`;

    return svgContent;
  }

  /**
   * Validate dieline for manufacturing
   */
  static validateDieline(design: DielineDesign): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check minimum dimensions
    const { length, width, height } = design.template.dimensions;
    if (length < 50 || width < 50) {
      errors.push('Dimensions too small for manufacturing (minimum 50mm)');
    }

    // Check material compatibility
    if (design.customization.thickness < 0.3) {
      warnings.push('Material thickness might be too thin for structural integrity');
    }

    // Check for overlapping elements
    const overlaps = this.checkElementOverlaps(design.elements);
    if (overlaps.length > 0) {
      warnings.push('Some elements may overlap');
    }

    // Check text sizes
    const smallText = design.elements.filter(el =>
      el.type === 'text' && el.size.height < 6
    );
    if (smallText.length > 0) {
      warnings.push('Some text elements are very small and may not be readable');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get manufacturing cost estimate
   */
  static estimateCost(design: DielineDesign, quantity: number): number {
    const { length, width } = design.template.dimensions;
    const area = (length * width) / 1000000; // Convert to square meters

    // Base cost per square meter
    const materialCost = area * 5; // $5 per square meter
    const cuttingCost = design.template.cutLines.length * 0.1; // $0.10 per cut
    const foldingCost = design.template.foldLines.length * 0.05; // $0.05 per fold

    const unitCost = materialCost + cuttingCost + foldingCost;

    // Quantity discount
    const discount = quantity > 1000 ? 0.8 : quantity > 500 ? 0.9 : 1.0;

    return unitCost * quantity * discount;
  }

  private static scaleSvgPath(path: string, scaleX: number, scaleY: number): string {
    // Simplified SVG path scaling - in production, use proper SVG libraries
    return path; // Placeholder - return unchanged
  }

  private static checkElementOverlaps(elements: DielineElement[]): string[] {
    // Simplified overlap detection
    return []; // Placeholder
  }

  /**
   * Search templates by name or category
   */
  static searchTemplates(query: string): DielineTemplate[] {
    const lowercaseQuery = query.toLowerCase();
    return this.TEMPLATES.filter(template =>
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.category.toLowerCase().includes(lowercaseQuery) ||
      (template.description && template.description.toLowerCase().includes(lowercaseQuery))
    );
  }
}