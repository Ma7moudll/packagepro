/**
 * Supplier Scoring Model
 * Calculates supplier scores based on various metrics
 */

export interface SupplierMetrics {
  onTimePercent: number
  rejectionRate: number
  qualityScore: number
  avgLeadTimeDays?: number
  totalOrders: number
  completedOrders: number
  preferred?: boolean
}

export interface SupplierCandidate {
  supplierId: string
  name: string
  cost: number
  leadTimeDays: number
  capabilities: string[]
  moq: number
  metrics?: SupplierMetrics
  pricingRule?: any
}

export interface SupplierScore {
  supplierId: string
  totalScore: number
  costScore: number
  leadTimeScore: number
  reliabilityScore: number
  qualityScore: number
  preferredBonus: number
}

/**
 * Calculate comprehensive supplier score
 */
export function calculateSupplierScore(
  candidate: SupplierCandidate,
  requirements: {
    maxCost?: number
    maxLeadTime?: number
    requiredCapabilities?: string[]
    qty: number
  },
): SupplierScore {
  let totalScore = 0

  // 1. Cost Score (0-30 points)
  // Lower cost = higher score
  const costScore = calculateCostScore(candidate.cost, requirements.maxCost || Infinity)
  totalScore += costScore

  // 2. Lead Time Score (0-25 points)
  // Shorter lead time = higher score
  const leadTimeScore = calculateLeadTimeScore(
    candidate.leadTimeDays,
    requirements.maxLeadTime || Infinity,
  )
  totalScore += leadTimeScore

  // 3. Reliability Score (0-25 points)
  // Based on on-time delivery and rejection rate
  const reliabilityScore = calculateReliabilityScore(candidate.metrics)
  totalScore += reliabilityScore

  // 4. Quality Score (0-15 points)
  const qualityScore = calculateQualityScore(candidate.metrics)
  totalScore += qualityScore

  // 5. Preferred Supplier Bonus (5 points)
  const preferredBonus = candidate.metrics?.preferred ? 5 : 0
  totalScore += preferredBonus

  // 6. MOQ Penalty (negative points if below MOQ)
  if (requirements.qty < candidate.moq) {
    totalScore -= 20 // Significant penalty for not meeting MOQ
  }

  // Capability check (required - disqualifies if not met)
  if (requirements.requiredCapabilities) {
    const hasAllCapabilities = requirements.requiredCapabilities.every((cap) =>
      candidate.capabilities.includes(cap),
    )
    if (!hasAllCapabilities) {
      totalScore = 0 // Disqualify
    }
  }

  return {
    supplierId: candidate.supplierId,
    totalScore: Math.max(0, Math.min(100, totalScore)), // Clamp between 0-100
    costScore,
    leadTimeScore,
    reliabilityScore,
    qualityScore,
    preferredBonus,
  }
}

/**
 * Calculate cost score (0-30 points)
 */
function calculateCostScore(cost: number, maxCost: number): number {
  if (cost > maxCost) {
    return 0 // Over budget
  }

  // Normalize cost score (lower is better)
  // Score decreases linearly from 30 to 10 as cost approaches maxCost
  if (maxCost === Infinity) {
    return 25 // No budget constraint, give medium score
  }

  const costRatio = cost / maxCost
  const score = 30 - (costRatio * 20) // 30 points at 0 cost, 10 points at maxCost

  return Math.max(0, Math.min(30, score))
}

/**
 * Calculate lead time score (0-25 points)
 */
function calculateLeadTimeScore(leadTimeDays: number, maxLeadTime: number): number {
  if (leadTimeDays > maxLeadTime) {
    return 0 // Exceeds maximum lead time
  }

  // Normalize lead time score
  if (maxLeadTime === Infinity) {
    // No constraint, give score based on absolute lead time
    // 1 day = 25 points, 14 days = 0 points
    const score = Math.max(0, 25 - (leadTimeDays * 1.8))
    return Math.max(0, Math.min(25, score))
  }

  const leadTimeRatio = leadTimeDays / maxLeadTime
  const score = 25 - (leadTimeRatio * 15) // 25 points at 0 days, 10 points at maxLeadTime

  return Math.max(0, Math.min(25, score))
}

/**
 * Calculate reliability score (0-25 points)
 */
function calculateReliabilityScore(metrics?: SupplierMetrics): number {
  if (!metrics) {
    return 12.5 // Neutral score if no metrics available
  }

  // On-time percentage (0-15 points)
  const onTimeScore = (metrics.onTimePercent / 100) * 15

  // Rejection rate penalty (0-10 points, lower rejection = higher score)
  const rejectionScore = Math.max(0, 10 - (metrics.rejectionRate * 2))

  return Math.max(0, Math.min(25, onTimeScore + rejectionScore))
}

/**
 * Calculate quality score (0-15 points)
 */
function calculateQualityScore(metrics?: SupplierMetrics): number {
  if (!metrics || !metrics.qualityScore) {
    return 7.5 // Neutral score if no quality data
  }

  // Quality score is typically 0-10, normalize to 0-15 points
  return (metrics.qualityScore / 10) * 15
}

/**
 * Rank suppliers by score
 */
export function rankSuppliers(
  candidates: SupplierCandidate[],
  requirements: {
    maxCost?: number
    maxLeadTime?: number
    requiredCapabilities?: string[]
    qty: number
  },
): Array<SupplierCandidate & { score: SupplierScore }> {
  const ranked = candidates.map((candidate) => ({
    ...candidate,
    score: calculateSupplierScore(candidate, requirements),
  }))

  // Sort by total score (descending), then by cost (ascending)
  ranked.sort((a, b) => {
    if (b.score.totalScore !== a.score.totalScore) {
      return b.score.totalScore - a.score.totalScore
    }
    return a.cost - b.cost
  })

  return ranked
}

