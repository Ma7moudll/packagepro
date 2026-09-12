/**
 * Order Management Service (OMS)
 * Handles order lifecycle and state transitions
 */

// Note: Frontend should call backend API instead of using Prisma directly
import { isValidTransition, type OrderStatus } from "../state-machine/order-states"
import { createAuditLog } from "../audit/order-audit"
import { enqueueJob } from "../queue/queue-client"
import { logger } from "../utils/logger"

// Mock prisma - frontend should use backend API
const prisma = {
  $queryRawUnsafe: async <T = any>(strings: TemplateStringsArray | string, ...values: any[]) => [] as T,
  $executeRawUnsafe: async (strings: TemplateStringsArray | string, ...values: any[]) => {},
  order: {
    create: async () => ({ id: 'mock' }),
    findUnique: async () => null,
    update: async () => ({ id: 'mock' }),
  },
}

export interface CreateOrderData {
  userId: string
  designId?: string
  productId: string
  qty: number
  material: string
  finish?: string
  unitPrice: number
  totalPrice: number
  shippingInfo?: any
  paymentInfo?: any
}

/**
 * Create a new order
 */
export async function createOrder(data: CreateOrderData): Promise<string> {
  try {
    // Generate order number
    const year = new Date().getFullYear()
    const dayOfYear = Math.floor(
      (new Date().getTime() - new Date(year, 0, 0).getTime()) / 86400000,
    )
    const orderNumber = `PP-${year}-${String(dayOfYear).padStart(3, "0")}-${String(
      Date.now() % 10000,
    ).padStart(4, "0")}`

    // Create order record
    const orders = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      INSERT INTO "packagepro_orders" (
        id, "orderNumber", "userId", "designId", "productId", qty, material, finish,
        "unitPrice", "totalPrice", status, "shippingInfo", "paymentInfo", "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        'CREATED',
        $10::jsonb,
        $11::jsonb,
        NOW(),
        NOW()
      )
      RETURNING id
    `,
      orderNumber,
      data.userId,
      data.designId || null,
      data.productId,
      data.qty,
      data.material,
      data.finish || null,
      data.unitPrice,
      data.totalPrice,
      JSON.stringify(data.shippingInfo || {}),
      JSON.stringify(data.paymentInfo || {}),
    )

    const orderId = orders[0]?.id

    // Create audit log
    await createAuditLog({
      orderId,
      userId: data.userId,
      action: "ORDER_CREATED",
      entityType: "Order",
      entityId: orderId,
      newValue: { status: "CREATED", orderNumber },
    })

    // Enqueue order processing job
    await enqueueJob("routing-queue", {
      type: "process_new_order",
      orderId,
    })

    logger.info("Order created", { orderId, orderNumber })

    return orderId
  } catch (error) {
    logger.error("Error creating order", { error, data })
    throw error
  }
}

/**
 * Transition order state
 */
export async function transitionOrderState(
  orderId: string,
  toState: OrderStatus,
  actor: { id: string; role: string },
  metadata?: any,
): Promise<void> {
  try {
    // Get current order
    const orders = await prisma.$queryRawUnsafe<Array<any>>(`
      SELECT * FROM "packagepro_orders" WHERE id = $1
    `, orderId)

    if (!orders || orders.length === 0) {
      throw new Error("Order not found")
    }

    const order = orders[0]
    const fromState = order.status as OrderStatus

    // Validate transition
    const validation = isValidTransition(fromState, toState, actor.role)
    if (!validation.valid) {
      throw new Error(validation.reason || "Invalid state transition")
    }

    // Update order status
    await prisma.$executeRawUnsafe(`
      UPDATE "packagepro_orders"
      SET status = $1, "updatedAt" = NOW()
      WHERE id = $2
    `, toState, orderId)

    // Create audit log
    await createAuditLog({
      orderId,
      userId: actor.id,
      action: "ORDER_STATUS_CHANGED",
      entityType: "Order",
      entityId: orderId,
      oldValue: { status: fromState },
      newValue: { status: toState, ...metadata },
      metadata: { actorRole: actor.role, ...metadata },
    })

    // Emit events based on state
    await emitStateChangeEvent(orderId, fromState, toState)

    logger.info("Order state transitioned", {
      orderId,
      from: fromState,
      to: toState,
      actor: actor.id,
    })
  } catch (error) {
    logger.error("Error transitioning order state", { error, orderId, toState })
    throw error
  }
}

/**
 * Emit events on state change
 */
async function emitStateChangeEvent(
  orderId: string,
  fromState: OrderStatus,
  toState: OrderStatus,
): Promise<void> {
  // Emit events to queues based on state
  switch (toState) {
    case "READY_FOR_ROUTING":
      await enqueueJob("routing-queue", {
        type: "route_order",
        orderId,
      })
      break

    case "AWAITING_SUPPLIER_CONFIRMATION":
      // Get supplier ID and send notification
      const orders = await prisma.$queryRawUnsafe<Array<any>>(`
        SELECT "supplierId" FROM "packagepro_orders" WHERE id = $1
      `, orderId)
      if (orders[0]?.supplierId) {
        await enqueueJob("routing-queue", {
          type: "notify_supplier",
          orderId,
          supplierId: orders[0].supplierId,
        })
      }
      break

    case "IN_PRODUCTION":
      await enqueueJob("routing-queue", {
        type: "order_in_production",
        orderId,
      })
      break

    case "READY_FOR_PICKUP":
      await enqueueJob("shipping-queue", {
        type: "schedule_pickup",
        orderId,
      })
      break

    case "DELIVERED":
      await enqueueJob("routing-queue", {
        type: "order_delivered",
        orderId,
      })
      break
  }
}

/**
 * Get order by ID
 */
export async function getOrder(orderId: string): Promise<any> {
  const orders = await prisma.$queryRawUnsafe<Array<any>>(`
    SELECT 
      o.*,
      u.email as user_email,
      u.name as user_name,
      p.name as product_name,
      p.slug as product_slug,
      s.name as supplier_name
    FROM "packagepro_orders" o
    LEFT JOIN "packagepro_users" u ON o."userId" = u.id
    LEFT JOIN "packagepro_products" p ON o."productId" = p.id
    LEFT JOIN "packagepro_suppliers" s ON o."supplierId" = s.id
    WHERE o.id = $1
  `, orderId)

  if (!orders || orders.length === 0) {
    throw new Error("Order not found")
  }

  return orders[0]
}

/**
 * Assign supplier to order
 */
export async function assignSupplier(orderId: string, supplierId: string): Promise<void> {
  await prisma.$executeRawUnsafe(`
    UPDATE "packagepro_orders"
    SET "supplierId" = $1, "updatedAt" = NOW()
    WHERE id = $2
  `, supplierId, orderId)

  logger.info("Supplier assigned to order", { orderId, supplierId })
}

