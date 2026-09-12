"use client"

import type React from "react"

import { createContext, useContext, useEffect, type ReactNode } from "react"
import { useCartStore } from "@/lib/ecommerce/cart-store"
import type { Cart, AddCartItemRequest } from "@shared/types"
import { useAuth } from "@/providers/auth-provider"

interface CartItemDisplay {
  id: string
  templateId?: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  image?: string
}

interface CartContextValue {
  items: CartItemDisplay[]
  total: number
  cart: Cart | null
  loading: boolean
  error: string | null
  addItem: (item: AddCartItemRequest & { name?: string; image?: string }) => Promise<void>
  removeItem: (id: string) => Promise<void>
  updateQuantity: (id: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  refresh: () => Promise<void>
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const cart = useCartStore((s) => s.cart)
  const loading = useCartStore((s) => s.loading)
  const error = useCartStore((s) => s.error)
  const refresh = useCartStore((s) => s.refresh)
  const addItemAction = useCartStore((s) => s.addItem)
  const removeItemAction = useCartStore((s) => s.removeItem)
  const updateQuantityAction = useCartStore((s) => s.updateQuantity)
  const clearCartAction = useCartStore((s) => s.clearCart)

  useEffect(() => {
    if (user) {
      refresh()
    }
  }, [user, refresh])

  const items: CartItemDisplay[] = (cart?.items ?? []).map((item) => ({
    id: item.id,
    templateId: item.templateId || undefined,
    name: item.name || item.productType,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    image: item.thumbnail || undefined,
  }))

  const value: CartContextValue = {
    items,
    total: cart?.summary.total ?? 0,
    cart,
    loading,
    error,
    addItem: async (item) => {
      await addItemAction({
        productType: item.productType,
        quantity: item.quantity,
        dimensions: item.dimensions,
        materialCode: item.materialCode,
        color: item.color,
        finish: item.finish,
        templateId: item.templateId,
      })
    },
    removeItem: async (id) => {
      await removeItemAction(id)
    },
    updateQuantity: async (id, quantity) => {
      await updateQuantityAction(id, quantity)
    },
    clearCart: async () => {
      await clearCartAction()
    },
    refresh: async () => {
      await refresh()
    },
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}