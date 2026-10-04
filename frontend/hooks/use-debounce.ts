"use client"

import { useEffect, useState } from "react"

/**
 * Debounce a fast-changing value (e.g. a search input) before firing
 * network requests from effects that depend on it.
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
