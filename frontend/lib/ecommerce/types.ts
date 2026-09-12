"use client"

// E-commerce types are now server-authoritative. The cart lives on the backend
// (Cart/CartItem/CartSummary) and totals always come from the pricing engine.

export type {
  Cart,
  CartItem,
  CartSummary,
  AddCartItemRequest,
  CheckoutAddress,
  CheckoutRequest,
  CheckoutResponse,
  Template,
  OrderStatus,
  PaymentStatus,
  Dimensions,
} from '@shared/types'

export interface ShippingAddress {
  name: string
  phone: string
  email?: string
  street: string
  city: string
  state?: string
  postalCode: string
  country: string
}