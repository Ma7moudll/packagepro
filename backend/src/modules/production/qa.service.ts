import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';

export interface QAChecklist {
  dimensionalAccuracy: boolean;
  materialQuality: boolean;
  printQuality: boolean;
  colorAccuracy: boolean;
  finishQuality: boolean;
  packaging: boolean;
  notes?: string;
}

export class QAService {
  /**
   * Complete QA checklist for production
   */
  async completeQA(
    productionId: string,
    checklist: QAChecklist,
    approvedBy: string
  ): Promise<any> {
    const production = await prisma.production.findUnique({
      where: { id: productionId },
      include: {
        purchaseOrder: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!production) {
      throw new NotFoundError('Production');
    }

    // Verify all checklist items are true
    const allPassed = Object.values(checklist).every(
      (value) => value === true || typeof value === 'string'
    );

    if (!allPassed) {
      throw new Error('QA checklist not completed');
    }

    // Update production status
    const updated = await prisma.production.update({
      where: { id: productionId },
      data: {
        status: 'completed',
        notes: checklist.notes,
      },
    });

    // A per-run QA result is not whole-order receipt/review or dispatch evidence.
    // No parent readiness write. This legacy helper has no registered callers.

    return {
      ...updated,
      checklist,
      approvedBy,
    };
  }

  /**
   * Get QA checklist template
   */
  getQAChecklistTemplate(): QAChecklist {
    return {
      dimensionalAccuracy: false,
      materialQuality: false,
      printQuality: false,
      colorAccuracy: false,
      finishQuality: false,
      packaging: false,
    };
  }
}

export const qaService = new QAService();
