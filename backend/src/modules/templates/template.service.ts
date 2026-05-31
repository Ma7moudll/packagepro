import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';

export interface CreateTemplateData {
  name: string;
  description?: string;
  category: string;
  thumbnail?: string;
  designData: unknown;
  productType?: string;
  boxType?: string;
  tags?: string[];
  isPublic?: boolean;
  createdBy?: string;
}

export interface TemplateFilters {
  category?: string;
  productType?: string;
  search?: string;
  tags?: string[];
  isPublic?: boolean;
}

export class TemplateService {
  /**
   * Create a new template
   */
  async createTemplate(data: CreateTemplateData): Promise<any> {
    // Validate required fields
    if (!data.name || !data.designData) {
      throw new ValidationError('Name and designData are required');
    }

    const template = await prisma.template.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category || 'business',
        thumbnail: data.thumbnail || '',
        designData: data.designData as any,
        productType: data.productType || 'box',
        boxType: data.boxType,
        tags: data.tags || [],
        isPublic: data.isPublic !== undefined ? data.isPublic : true,
        createdBy: data.createdBy,
      },
    });

    return template;
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<any> {
    const template = await prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundError('Template');
    }

    // Increment usage count
    await prisma.template.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });

    return template;
  }

  /**
   * List templates with filters
   */
  async listTemplates(filters: TemplateFilters = {}): Promise<any[]> {
    const where: any = {};

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.productType) {
      where.productType = filters.productType;
    }

    if (filters.isPublic !== undefined) {
      where.isPublic = filters.isPublic;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { tags: { has: filters.search } },
      ];
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    const templates = await prisma.template.findMany({
      where,
      orderBy: [
        { usageCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 100, // Limit results
    });

    return templates;
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, data: Partial<CreateTemplateData>): Promise<unknown> {
    // Verify template exists
    await this.getTemplate(id);

    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category) updateData.category = data.category;
    if (data.thumbnail) updateData.thumbnail = data.thumbnail;
    if (data.designData) updateData.designData = data.designData;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
    if (data.tags) updateData.tags = data.tags;

    const updated = await prisma.template.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<void> {
    await this.getTemplate(id);
    await prisma.template.delete({
      where: { id },
    });
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(limit: number = 10): Promise<any[]> {
    return prisma.template.findMany({
      where: { isPublic: true },
      orderBy: { usageCount: 'desc' },
      take: limit,
    });
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<any[]> {
    return prisma.template.findMany({
      where: {
        category,
        isPublic: true,
      },
      orderBy: { usageCount: 'desc' },
    });
  }
}

export const templateService = new TemplateService();

