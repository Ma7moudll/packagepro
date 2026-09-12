"use client"

import { create } from "zustand"
import type { Cart, AddCartItemRequest } from "@shared/types"
import { cartApi } from "@/lib/api/cart"
import { ApiClientError } from "@/lib/api/client"

interface CartStore {
  cart: Cart | null
  loading: boolean
  error: string | null
  refresh: () => Promise<Cart | null>
  addItem: (item: AddCartItemRequest) => Promise<Cart | null>
  updateQuantity: (id: string, quantity: number) => Promise<Cart | null>
  removeItem: (id: string) => Promise<Cart | null>
  clearCart: () => Promise<Cart | null>
}

export const useCartStore = create<CartStore>((set, get) => ({
  cart: null,
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null })
    try {
      const res = await cartApi.get()
      const cart = res.data
      set({ cart, loading: false })
      return cart
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "Failed to load cart"
      set({ loading: false, error: message })
      return null
    }
  },

  addItem: async (item) => {
    try {
      const res = await cartApi.addItem(item)
      set({ cart: res.data, error: null })
      return res.data
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Failed to add item to cart"
      set({ error: message })
      throw err
    }
  },

  updateQuantity: async (id, quantity) => {
    try {
      const res = await cartApi.updateItem(id, { quantity })
      set({ cart: res.data, error: null })
      return res.data
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "Failed to update cart"
      set({ error: message })
      throw err
    }
  },

  removeItem: async (id) => {
    try {
      const res = await cartApi.removeItem(id)
      set({ cart: res.data, error: null })
      return res.data
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "Failed to remove item"
      set({ error: message })
      throw err
    }
  },

  clearCart: async () => {
    try {
      const res = await cartApi.clear()
      set({ cart: res.data, error: null })
      return res.data
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "Failed to clear cart"
      set({ error: message })
      throw err
    }
  },
}))

export function useCartSnapshot() {
  return {
    items: useCartStore((s) => s.cart?.items ?? []),
    summary: useCartStore((s) => s.cart?.summary),
    loading: useCartStore((s) => s.loading),
    error: useCartStore((s) => s.error),
    actions: useCartStore.getState(),
  }
}