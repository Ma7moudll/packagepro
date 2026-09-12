/**
 * Design Comment Model and Review Service
 * Handles design review workflow and feedback
 */

export interface DesignCommentCreateInput {
  designId: string;
  userId: string;
  elementRef?: string; // JSON pointer to layer for element-level comments
  commentText: string;
  commentType?: 'general' | 'revision_request' | 'approval_note';
}

export interface DesignCommentUpdateInput {
  commentText?: string;
  resolved?: boolean;
}

/**
 * Prisma Schema snippet for DesignComment model:
 * 
 * model DesignComment {
 *   id              String   @id @default(cuid())
 *   designId        String
 *   userId          String
 *   elementRef      String?  // JSON pointer: "/layers/0", null for general comments
 *   commentText     String
 *   commentType     String   @default("general")  // general, revision_request, approval_note
 *   resolved        Boolean  @default(false)
 *   createdAt       DateTime @default(now())
 *   updatedAt       DateTime @updatedAt
 *   
 *   // Relations
 *   design   Design @relation(fields: [designId], references: [id], onDelete: Cascade)
 *   user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)
 *   
 *   @@index([designId])
 *   @@index([userId])
 *   @@map("design_comments")
 * }
 */

export class DesignReviewService {
  /**
   * Add a comment to a design
   */
  static async addComment(input: DesignCommentCreateInput): Promise<any> {
    // Implementation would use prisma.designComment.create()
    // For now, placeholder
    return {
      id: 'comment-' + Date.now(),
      ...input,
      createdAt: new Date(),
    };
  }

  /**
   * Get all comments for a design
   */
  static async getDesignComments(_designId: string): Promise<any[]> {
    // Implementation would use prisma.designComment.findMany()
    return [];
  }

  /**
   * Get comments for a specific element
   */
  static async getElementComments(_designId: string, _elementRef: string): Promise<any[]> {
    // Implementation would query with elementRef
    return [];
  }

  /**
   * Resolve a comment
   */
  static async resolveComment(commentId: string): Promise<any> {
    // Implementation would update resolved flag
    return { id: commentId, resolved: true };
  }

  /**
   * Transition design to IN_REVIEW when first viewed by reviewer
   */
  static async markForReview(_designId: string): Promise<boolean> {
    // Transition SUBMITTED → IN_REVIEW
    return true;
  }

  /**
   * Approve a design
   */
  static async approveDesign(designId: string, _reviewerId: string, _notes?: string): Promise<any> {
    // Transition IN_REVIEW → APPROVED
    // Log reviewer approval
    return { designId, status: 'APPROVED' };
  }

  /**
   * Reject a design
   */
  static async rejectDesign(designId: string, reviewerId: string, reason: string): Promise<any> {
    // Transition IN_REVIEW → REJECTED
    // Store rejection reason
    return { designId, status: 'REJECTED', reviewedBy: reviewerId, reason };
  }

  /**
   * Request changes from designer
   */
  static async requestChanges(designId: string, _reviewerId: string, changes: string[]): Promise<any> {
    // Add comments with type: 'revision_request'
    // Keep design in IN_REVIEW (don't transition)
    return { designId, requestedChanges: changes };
  }
}
