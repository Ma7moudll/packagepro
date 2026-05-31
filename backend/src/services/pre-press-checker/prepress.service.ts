import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';
import { fileProcessorService } from '../file-processor/processor.service';
import { checkResolution } from './validators/resolution.validator';
import { checkColorMode } from './validators/color.validator';
import axios from 'axios';

export interface PrePressCheckResult {
  resolutionOk: boolean;
  colorModeOk: boolean;
  bleedMarginsOk: boolean;
  safeZoneOk: boolean;
  fontsEmbedded: boolean;
  passed: boolean;
  issues: Array<{
    type: string;
    severity: 'error' | 'warning';
    message: string;
  }>;
  checkedAt: Date;
}

export class PrePressCheckService {
  /**
   * Check design files for print readiness
   */
  async checkOrderDesign(orderId: string): Promise<PrePressCheckResult> {
    // Get order and design
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        design: {
          include: {
            files: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    if (!order.design) {
      throw new NotFoundError('Design for this order');
    }

    const issues: Array<{ type: string; severity: 'error' | 'warning'; message: string }> = [];

    // Check each design file
    for (const file of order.design.files) {
      if (file.fileType === 'print_file' || file.fileType === 'preview') {
        try {
          // Download file (simplified - in production use signed URLs)
          const response = await axios.get(file.fileUrl, {
            responseType: 'arraybuffer',
          });
          const buffer = Buffer.from(response.data);

          // Check resolution
          const resolutionCheck = await checkResolution(buffer, 300);
          if (!resolutionCheck.valid) {
            issues.push(
              ...resolutionCheck.issues.map((issue) => ({
                type: 'resolution',
                severity: 'error' as const,
                message: `${file.fileName}: ${issue}`,
              }))
            );
          }

          // Check color mode
          const colorCheck = await checkColorMode(buffer, 'CMYK');
          if (!colorCheck.valid) {
            issues.push(
              ...colorCheck.issues.map((issue) => ({
                type: 'color_mode',
                severity: 'warning' as const,
                message: `${file.fileName}: ${issue}`,
              }))
            );
          }

          // Check print requirements
          const printCheck = await fileProcessorService.checkPrintRequirements(buffer, 300, 'CMYK');
          if (!printCheck.valid) {
            issues.push(
              ...printCheck.issues.map((issue) => ({
                type: 'print_requirements',
                severity: 'error' as const,
                message: `${file.fileName}: ${issue}`,
              }))
            );
          }
        } catch (error) {
          issues.push({
            type: 'file_access',
            severity: 'error',
            message: `Failed to check file ${file.fileName}: ${error}`,
          });
        }
      }
    }

    // Simplified checks for other requirements
    // In production, implement proper bleed margin and safe zone checks
    const bleedMarginsOk = true; // Placeholder
    const safeZoneOk = true; // Placeholder
    const fontsEmbedded = true; // Placeholder - would need PDF parsing

    const resolutionOk = issues.filter((i) => i.type === 'resolution').length === 0;
    const colorModeOk = issues.filter((i) => i.type === 'color_mode').length === 0;
    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const passed = errorCount === 0;

    // Save check result
    const checkResult = await prisma.prePressCheck.upsert({
      where: { designId: order.design.id },
      update: {
        resolutionOk,
        colorModeOk,
        bleedMarginsOk,
        safeZoneOk,
        fontsEmbedded,
        passed,
        issues: issues as any,
        checkedAt: new Date(),
      },
      create: {
        designId: order.design.id,
        resolutionOk,
        colorModeOk,
        bleedMarginsOk,
        safeZoneOk,
        fontsEmbedded,
        passed,
        issues: issues as any,
        checkedAt: new Date(),
      },
    });

    return {
      resolutionOk: checkResult.resolutionOk,
      colorModeOk: checkResult.colorModeOk,
      bleedMarginsOk: checkResult.bleedMarginsOk,
      safeZoneOk: checkResult.safeZoneOk,
      fontsEmbedded: checkResult.fontsEmbedded,
      passed: checkResult.passed,
      issues,
      checkedAt: checkResult.checkedAt,
    };
  }

  /**
   * Get pre-press check results for an order
   */
  async getPrePressResults(orderId: string): Promise<PrePressCheckResult | null> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        design: {
          include: {
            prepressCheck: true,
          },
        },
      },
    });

    if (!order || !order.design || !order.design.prepressCheck) {
      return null;
    }

    const check = order.design.prepressCheck;

    return {
      resolutionOk: check.resolutionOk,
      colorModeOk: check.colorModeOk,
      bleedMarginsOk: check.bleedMarginsOk,
      safeZoneOk: check.safeZoneOk,
      fontsEmbedded: check.fontsEmbedded,
      passed: check.passed,
      issues: (check.issues as any) || [],
      checkedAt: check.checkedAt,
    };
  }
}

export const prePressCheckService = new PrePressCheckService();
