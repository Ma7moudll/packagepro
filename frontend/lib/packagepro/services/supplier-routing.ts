/**
 * Supplier Routing Service
 * Finds and selects the best supplier for an order
 */

// Mock Prisma - frontend should use backend API
import { rankSuppliers, SupplierCandidate } from "../models/supplier-scoring"
import { logger } from "../utils/logger"
import { getConfig } from "../config"
import { enqueueJob } from "../queue/queue-client"

const prisma = {
  $queryRawUnsafe: async <T = any>(strings: TemplateStringsArray | string, ...values: any[]): Promise<T> => [] as T,
}

export interface RoutingRequirements {
  productId: string
  qty: number
  material: string
  printType?: string
  requiredCapabilities?: string[]
  maxCost?: number
  maxLeadTime?: number
  preferredSupplierId?: string
}

export interface RoutingResult {
  primarySupplier: {
    supplierId: string
    score: number
    estimatedCost: number
    estimatedLeadDays: number
  }
  alternatives: Array<{
    supplierId: string
    score: number
    estimatedCost: number
    estimatedLeadDays: number
  }>
  allCandidates: Array<{
    supplierId: string
    score: number
    reason?: string
  }>
}

/**
 * Find candidate suppliers for an order
 */
export async function findCandidateSuppliers(
  requirements: RoutingRequirements,
): Promise<SupplierCandidate[]> {
  try {
    // Query suppliers that can fulfill this product
    const suppliers = await prisma.$queryRawUnsafe<Array<any>>(`
      SELECT 
        s.id as "supplierId",
        s.name,
        s.capabilities,
        s.preferred,
        ps.moq,
        ps."leadTimeDays",
        ps."pricingRule",
        vm."onTimePercent",
        vm."rejectionRate",
        vm."qualityScore",
        vm."avgLeadTimeDays",
        vm."totalOrders",
        vm."completedOrders"
      FROM "packagepro_product_suppliers" ps
      JOIN "packagepro_suppliers" s ON ps."supplierId" = s.id
      LEFT JOIN "packagepro_vendor_metrics" vm ON s.id = vm."supplierId"
      WHERE 
        ps."productId" = $1
        AND s."isActive" = true
        AND ps.moq <= $2
    `, requirements.productId, requirements.qty)

    // Filter by capabilities if required
    let filtered = suppliers
    if (requirements.requiredCapabilities && requirements.requiredCapabilities.length > 0) {
      filtered = suppliers.filter((s: any) => {
        const capabilities = Array.isArray(s.capabilities) ? s.capabilities : JSON.parse(s.capabilities || "[]")
        return requirements.requiredCapabilities!.every((cap) => capabilities.includes(cap))
      })
    }

    // Convert to SupplierCandidate format
    const candidates: SupplierCandidate[] = filtered.map((s: any) => ({
      supplierId: s.supplierId,
      name: s.name,
      cost: 0, // Will be calculated by pricing engine
      leadTimeDays: s.leadTimeDays || s.avgLeadTimeDays || 5,
      capabilities: Array.isArray(s.capabilities) ? s.capabilities : JSON.parse(s.capabilities || "[]"),
      moq: s.moq,
      metrics: {
        onTimePercent: s.onTimePercent || 0,
        rejectionRate: s.rejectionRate || 0,
        qualityScore: s.qualityScore || 0,
        avgLeadTimeDays: s.avgLeadTimeDays,
        totalOrders: s.totalOrders || 0,
        completedOrders: s.completedOrders || 0,
        preferred: s.preferred || false,
      },
      pricingRule: s.pricingRule,
    }))

    logger.info("Candidate suppliers found", {
      productId: requirements.productId,
      qty: requirements.qty,
      count: candidates.length,
    })

    return candidates
  } catch (error) {
    logger.error("Error finding candidate suppliers", { error, requirements })
    throw error
  }
}

/**
 * Score and rank suppliers
 */
export async function scoreCandidates(
  candidates: SupplierCandidate[],
  requirements: RoutingRequirements,
  estimatedCosts: Record<string, number>,
): Promise<Array<SupplierCandidate & { score: any }>> {
  // Update costs from pricing estimates
  const candidatesWithCosts = candidates.map((c) => ({
    ...c,
    cost: estimatedCosts[c.supplierId] || c.cost,
  }))

  // Rank suppliers
  const ranked = rankSuppliers(candidatesWithCosts, {
    maxCost: requirements.maxCost,
    maxLeadTime: requirements.maxLeadTime,
    requiredCapabilities: requirements.requiredCapabilities,
    qty: requirements.qty,
  })

  return ranked
}

/**
 * Choose primary supplier with auto-failover logic
 */
export async function choosePrimaryWithAutoFailover(
  rankedSuppliers: Array<SupplierCandidate & { score: any }>,
  requirements: RoutingRequirements,
): Promise<SupplierCandidate & { score: any }> {
  if (rankedSuppliers.length === 0) {
    throw new Error("No suitable suppliers found")
  }

  // If preferred supplier is specified and exists in ranked list, prioritize it
  if (requirements.preferredSupplierId) {
    const preferred = rankedSuppliers.find(
      (s) => s.supplierId === requirements.preferredSupplierId && s.score.totalScore > 0,
    )
    if (preferred) {
      logger.info("Preferred supplier selected", {
        supplierId: preferred.supplierId,
        score: preferred.score.totalScore,
      })
      return preferred
    }
  }

  // Select top-ranked supplier
  const primary = rankedSuppliers[0]

  if (primary.score.totalScore === 0) {
    throw new Error("No qualified suppliers found (all scored 0)")
  }

  logger.info("Primary supplier selected", {
    supplierId: primary.supplierId,
    score: primary.score.totalScore,
  })

  return primary
}

/**
 * Main routing function
 */
export async function routeOrder(requirements: RoutingRequirements): Promise<RoutingResult> {
  try {
    // Find candidate suppliers
    const candidates = await findCandidateSuppliers(requirements)

    if (candidates.length === 0) {
      throw new Error("No suppliers available for this product/quantity")
    }

    // Get estimated costs for each supplier (from pricing engine)
    // TODO: Call pricing engine to get costs for each supplier
    const estimatedCosts: Record<string, number> = {}
    for (const candidate of candidates) {
      // Placeholder - in production, call pricing engine
      estimatedCosts[candidate.supplierId] = 0
    }

    // Score and rank suppliers
    const ranked = await scoreCandidates(candidates, requirements, estimatedCosts)

    // Choose primary supplier
    const primary = await choosePrimaryWithAutoFailover(ranked, requirements)

    // Prepare alternatives (next 2 suppliers)
    const alternatives = ranked.slice(1, 3).map((s) => ({
      supplierId: s.supplierId,
      score: s.score.totalScore,
      estimatedCost: s.cost,
      estimatedLeadDays: s.leadTimeDays,
    }))

    // All candidates with scores
    const allCandidates = ranked.map((s) => ({
      supplierId: s.supplierId,
      score: s.score.totalScore,
      reason: s.score.totalScore === 0 ? "Disqualified" : undefined,
    }))

    const result: RoutingResult = {
      primarySupplier: {
        supplierId: primary.supplierId,
        score: primary.score.totalScore,
        estimatedCost: primary.cost,
        estimatedLeadDays: primary.leadTimeDays,
      },
      alternatives,
      allCandidates,
    }

    logger.info("Order routed", {
      productId: requirements.productId,
      primarySupplierId: primary.supplierId,
      score: primary.score.totalScore,
    })

    return result
  } catch (error) {
    logger.error("Error routing order", { error, requirements })
    throw error
  }
}

/**
 * Auto-retry/failover when primary supplier rejects
 */
export async function handleSupplierRejection(
  orderId: string,
  rejectedSupplierId: string,
  requirements: RoutingRequirements,
): Promise<RoutingResult | null> {
  const config = getConfig()

  if (!config.features.enableAutoFailover) {
    logger.warn("Auto-failover disabled, manual intervention required", { orderId })
    return null
  }

  logger.info("Handling supplier rejection, attempting failover", {
    orderId,
    rejectedSupplierId,
  })

  // Re-route excluding the rejected supplier
  const candidates = await findCandidateSuppliers(requirements)
  const availableCandidates = candidates.filter((c) => c.supplierId !== rejectedSupplierId)

  if (availableCandidates.length === 0) {
    logger.error("No alternative suppliers available after rejection", { orderId })
    return null
  }

  // Enqueue re-routing job
  await enqueueJob("routing-queue", {
    type: "reroute_order",
    orderId,
    excludedSupplierId: rejectedSupplierId,
    requirements,
  })

  // For now, return null (job will handle it)
  return null
}

