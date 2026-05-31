"use client"

/**
 * Operational Transform (OT) implementation for conflict resolution
 * 
 * This is a simplified OT implementation. For production, consider using
 * libraries like ShareJS or ot.js
 */

export interface Operation {
  type: "insert" | "delete" | "retain"
  value?: string
  length: number
}

export interface TransformResult {
  op1: Operation[]
  op2: Operation[]
}

/**
 * Transform two operations against each other
 */
export function transform(op1: Operation[], op2: Operation[]): TransformResult {
  // Simplified OT implementation
  // In production, use a proper OT library

  const result1: Operation[] = []
  const result2: Operation[] = []

  let i1 = 0
  let i2 = 0
  let offset1 = 0
  let offset2 = 0

  while (i1 < op1.length || i2 < op2.length) {
    const op1Current = op1[i1]
    const op2Current = op2[i2]

    if (!op1Current) {
      result1.push(...op2.slice(i2))
      break
    }

    if (!op2Current) {
      result2.push(...op1.slice(i1))
      break
    }

    // Handle different operation types
    if (op1Current.type === "retain" && op2Current.type === "retain") {
      const min = Math.min(op1Current.length, op2Current.length)
      result1.push({ type: "retain", length: min })
      result2.push({ type: "retain", length: min })
      op1Current.length -= min
      op2Current.length -= min
      if (op1Current.length === 0) i1++
      if (op2Current.length === 0) i2++
    } else if (op1Current.type === "insert" && op2Current.type === "retain") {
      result1.push(op1Current)
      result2.push({ type: "retain", length: op1Current.value?.length || 0 })
      i1++
      op2Current.length -= op1Current.value?.length || 0
      if (op2Current.length === 0) i2++
    } else if (op1Current.type === "retain" && op2Current.type === "insert") {
      result1.push({ type: "retain", length: op2Current.value?.length || 0 })
      result2.push(op2Current)
      op1Current.length -= op2Current.value?.length || 0
      if (op1Current.length === 0) i1++
      i2++
    } else if (op1Current.type === "delete" && op2Current.type === "retain") {
      result1.push(op1Current)
      i1++
      op2Current.length -= op1Current.length
      if (op2Current.length === 0) i2++
    } else if (op1Current.type === "retain" && op2Current.type === "delete") {
      result2.push(op2Current)
      op1Current.length -= op2Current.length
      if (op1Current.length === 0) i1++
      i2++
    } else {
      // Both are insert or delete - order matters
      result1.push(op1Current)
      result2.push(op2Current)
      i1++
      i2++
    }
  }

  return { op1: result1, op2: result2 }
}

/**
 * Apply operation to a string
 */
export function applyOperation(str: string, op: Operation[]): string {
  let result = ""
  let index = 0

  for (const operation of op) {
    if (operation.type === "retain") {
      result += str.slice(index, index + operation.length)
      index += operation.length
    } else if (operation.type === "insert") {
      result += operation.value || ""
    } else if (operation.type === "delete") {
      index += operation.length
    }
  }

  return result
}

/**
 * Compose two operations
 */
export function compose(op1: Operation[], op2: Operation[]): Operation[] {
  // Simplified composition
  // In production, use proper OT composition
  return [...op1, ...op2]
}

