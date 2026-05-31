"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { Cart, CartItem } from "./types"
import { nanoid } from "nanoid"

interface CartStore extends Cart {
  // Actions
  addItem: (item: Omit<CartItem, "id">) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  calculateTotals: () => void
}

const calculateTax = (subtotal: number, taxRate: number = 0.15): number => {
  return subtotal * taxRate
}

const calculateShipping = (subtotal: number, itemsCount: number): number => {
  // Free shipping over 500, otherwise 25
  if (subtotal >= 500) return 0
  return 25 + (itemsCount - 1) * 5 // Base 25, +5 per additional item
}

const createInitialCart = (): Cart => ({
  items: [],
  subtotal: 0,
  tax: 0,
  shipping: 0,
  total: 0,
  currency: "SAR",
})

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      ...createInitialCart(),

      addItem: (item) => {
        set((state) => {
          // Check if item already exists (same productId and customization)
          const existingIndex = state.items.findIndex(
            (i) =>
              i.productId === item.productId &&
              JSON.stringify(i.customization) === JSON.stringify(item.customization)
          )

          let newItems: CartItem[]

          if (existingIndex !== -1) {
            // Update quantity
            newItems = state.items.map((i, idx) =>
              idx === existingIndex
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            )
          } else {
            // Add new item
            newItems = [...state.items, { ...item, id: nanoid() }]
          }

          const subtotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
          const tax = calculateTax(subtotal)
          const shipping = calculateShipping(subtotal, newItems.length)
          const total = subtotal + tax + shipping

          return {
            items: newItems,
            subtotal,
            tax,
            shipping,
            total,
          }
        })
      },

      removeItem: (id) => {
        set((state) => {
          const newItems = state.items.filter((item) => item.id !== id)
          const subtotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
          const tax = calculateTax(subtotal)
          const shipping = calculateShipping(subtotal, newItems.length)
          const total = subtotal + tax + shipping

          return {
            items: newItems,
            subtotal,
            tax,
            shipping,
            total,
          }
        })
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id)
          return
        }

        set((state) => {
          const newItems = state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          )
          const subtotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
          const tax = calculateTax(subtotal)
          const shipping = calculateShipping(subtotal, newItems.length)
          const total = subtotal + tax + shipping

          return {
            items: newItems,
            subtotal,
            tax,
            shipping,
            total,
          }
        })
      },

      clearCart: () => {
        set(createInitialCart())
      },

      calculateTotals: () => {
        set((state) => {
          const subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
          const tax = calculateTax(subtotal)
          const shipping = calculateShipping(subtotal, state.items.length)
          const total = subtotal + tax + shipping

          return {
            subtotal,
            tax,
            shipping,
            total,
          }
        })
      },
    }),
    {
      name: "packagepro-cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
)

