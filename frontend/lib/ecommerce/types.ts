"use client"

export interface CartItem {
  id: string
  productId: string
  sku: string
  name: string
  quantity: number
  price: number
  image?: string
  customization?: {
    designId?: string
    templateId?: string
  }
}

export interface Cart {
  items: CartItem[]
  subtotal: number
  tax: number
  shipping: number
  total: number
  currency: string
}

export interface ShippingAddress {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface BillingAddress extends ShippingAddress {
  sameAsShipping: boolean
}

export interface PaymentMethod {
  type: "stripe" | "paypal" | "cash_on_delivery"
  stripePaymentMethodId?: string
  paypalOrderId?: string
}

export interface Order {
  id: string
  orderNumber: string
  userId: string
  items: CartItem[]
  shippingAddress: ShippingAddress
  billingAddress: BillingAddress
  paymentMethod: PaymentMethod
  paymentStatus: "pending" | "paid" | "failed" | "refunded"
  orderStatus: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  subtotal: number
  tax: number
  shipping: number
  total: number
  currency: string
  createdAt: string
  updatedAt: string
  trackingNumber?: string
  invoiceId?: string
}

export interface Invoice {
  id: string
  orderId: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  items: Array<{
    description: string
    quantity: number
    price: number
    total: number
  }>
  subtotal: number
  tax: number
  shipping: number
  total: number
  currency: string
  status: "draft" | "sent" | "paid" | "overdue"
  pdfUrl?: string
}

export interface ShippingRate {
  id: string
  name: string
  carrier: string
  service: string
  price: number
  estimatedDays: number
  trackingAvailable: boolean
}

export interface ShippingLabel {
  id: string
  orderId: string
  trackingNumber: string
  carrier: string
  labelUrl: string
  trackingUrl: string
}

