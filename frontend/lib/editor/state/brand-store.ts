"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface BrandLogo {
  id: string
  name: string
  dataUrl: string
}

export interface BrandKit {
  colors: string[]
  fonts: string[]
  logos: BrandLogo[]
}

interface BrandStore {
  brandKit: BrandKit
  addColor: (color: string) => void
  removeColor: (color: string) => void
  setColors: (colors: string[]) => void
  addFont: (font: string) => void
  removeFont: (font: string) => void
  addLogo: (logo: BrandLogo) => void
  removeLogo: (id: string) => void
}

export const useBrandStore = create<BrandStore>()(
  persist(
    (set) => ({
      brandKit: {
        colors: [
          "#1e293b",
          "#3b82f6",
          "#10b981",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6",
        ],
        fonts: ["Inter", "Georgia", "Courier New"],
        logos: [],
      },

      addColor: (color) =>
        set((state) => {
          if (state.brandKit.colors.includes(color)) return state
          return {
            brandKit: {
              ...state.brandKit,
              colors: [...state.brandKit.colors, color],
            },
          }
        }),

      removeColor: (color) =>
        set((state) => ({
          brandKit: {
            ...state.brandKit,
            colors: state.brandKit.colors.filter((c) => c !== color),
          },
        })),

      setColors: (colors) =>
        set((state) => ({
          brandKit: { ...state.brandKit, colors },
        })),

      addFont: (font) =>
        set((state) => {
          if (state.brandKit.fonts.includes(font)) return state
          return {
            brandKit: {
              ...state.brandKit,
              fonts: [...state.brandKit.fonts, font],
            },
          }
        }),

      removeFont: (font) =>
        set((state) => ({
          brandKit: {
            ...state.brandKit,
            fonts: state.brandKit.fonts.filter((f) => f !== font),
          },
        })),

      addLogo: (logo) =>
        set((state) => ({
          brandKit: {
            ...state.brandKit,
            logos: [...state.brandKit.logos, logo],
          },
        })),

      removeLogo: (id) =>
        set((state) => ({
          brandKit: {
            ...state.brandKit,
            logos: state.brandKit.logos.filter((l) => l.id !== id),
          },
        })),
    }),
    {
      name: "packagepro-brand-kit",
    }
  )
)
