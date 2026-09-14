import type { Order, OrderItem } from "../../shared/types/index.ts"

let seq = 0

export function makeItem(overrides: Partial<OrderItem> = {}): OrderItem {
  seq += 1
  return {
    id: `item-${seq}`,
    productType: "box",
    quantity: 100,
    dimensions: { length: 200, width: 120, height: 60, unit: "mm" },
    materialCode: "cardboard",
    color: "kraft",
    finish: "matte",
    unitPrice: 1.2,
    totalPrice: 120,
    ...overrides,
  }
}

export function makeOrder(overrides: Partial<Order> = {}): Order {
  seq += 1
  return {
    id: `order-${seq}`,
    orderNumber: `PP-${seq}`,
    userId: "user-1",
    status: "completed",
    items: [makeItem()],
    shippingAddress: {
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      phone: "555",
      street: "1 Main St",
      city: "Cairo",
      postalCode: "00000",
      country: "EG",
    },
    paymentMethod: "stripe",
    paymentStatus: "succeeded",
    subtotal: 120,
    tax: 7.2,
    shipping: 0,
    total: 127.2,
    currency: "USD",
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-16T00:00:00.000Z",
    ...overrides,
  }
}