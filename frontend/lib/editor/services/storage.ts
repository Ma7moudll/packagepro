"use client"

import { DesignCoreState } from "@/lib/editor/state/types"

const DB_NAME = "packagepro-editor"
const DB_VERSION = 1
const STORE_NAME = "designs"

interface StoredDesign {
  id: string
  name: string
  state: DesignCoreState
  createdAt: number
  updatedAt: number
}

let db: IDBDatabase | null = null

export async function initIndexedDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, { keyPath: "id" })
        objectStore.createIndex("updatedAt", "updatedAt", { unique: false })
        objectStore.createIndex("name", "name", { unique: false })
      }
    }
  })
}

export async function saveDesignToIndexedDB(
  designId: string,
  name: string,
  state: DesignCoreState
): Promise<void> {
  const database = await initIndexedDB()
  const transaction = database.transaction([STORE_NAME], "readwrite")
  const store = transaction.objectStore(STORE_NAME)

  const design: StoredDesign = {
    id: designId,
    name,
    state,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  // Check if design exists to preserve createdAt
  const existing = await new Promise<StoredDesign | undefined>((resolve) => {
    const getRequest = store.get(designId)
    getRequest.onsuccess = () => resolve(getRequest.result)
    getRequest.onerror = () => resolve(undefined)
  })

  if (existing) {
    design.createdAt = existing.createdAt
  }

  return new Promise((resolve, reject) => {
    const request = store.put(design)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function loadDesignFromIndexedDB(designId: string): Promise<StoredDesign | null> {
  const database = await initIndexedDB()
  const transaction = database.transaction([STORE_NAME], "readonly")
  const store = transaction.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.get(designId)
    request.onsuccess = () => {
      resolve(request.result || null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function listDesignsFromIndexedDB(): Promise<StoredDesign[]> {
  const database = await initIndexedDB()
  const transaction = database.transaction([STORE_NAME], "readonly")
  const store = transaction.objectStore(STORE_NAME)
  const index = store.index("updatedAt")

  return new Promise((resolve, reject) => {
    const request = index.openCursor(null, "prev") // Sort by updatedAt descending
    const designs: StoredDesign[] = []

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        designs.push(cursor.value)
        cursor.continue()
      } else {
        resolve(designs)
      }
    }

    request.onerror = () => reject(request.error)
  })
}

export async function deleteDesignFromIndexedDB(designId: string): Promise<void> {
  const database = await initIndexedDB()
  const transaction = database.transaction([STORE_NAME], "readwrite")
  const store = transaction.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.delete(designId)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function saveDesignToCloud(
  designId: string,
  name: string,
  state: DesignCoreState
): Promise<void> {
  try {
    const response = await fetch("/api/packagepro/designs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: designId,
        name,
        state,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to save design: ${response.statusText}`)
    }
  } catch (error) {
    console.error("Failed to save design to cloud:", error)
    // Fallback to IndexedDB only
    await saveDesignToIndexedDB(designId, name, state)
  }
}

export async function loadDesignFromCloud(designId: string): Promise<DesignCoreState | null> {
  try {
    const response = await fetch(`/api/packagepro/designs/${designId}`)
    if (!response.ok) {
      throw new Error(`Failed to load design: ${response.statusText}`)
    }
    const data = await response.json()
    return data.state
  } catch (error) {
    console.error("Failed to load design from cloud:", error)
    // Fallback to IndexedDB
    const stored = await loadDesignFromIndexedDB(designId)
    return stored?.state || null
  }
}

// Auto-save with debouncing
let autoSaveTimeout: NodeJS.Timeout | null = null
const AUTO_SAVE_DELAY = 30000 // 30 seconds

export function scheduleAutoSave(
  designId: string,
  name: string,
  state: DesignCoreState,
  saveToCloud = false
): void {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
  }

  autoSaveTimeout = setTimeout(async () => {
    try {
      // Always save to IndexedDB first (fast, local)
      await saveDesignToIndexedDB(designId, name, state)

      // Optionally sync to cloud
      if (saveToCloud) {
        await saveDesignToCloud(designId, name, state)
      }
    } catch (error) {
      console.error("Auto-save failed:", error)
    }
  }, AUTO_SAVE_DELAY)
}

export function cancelAutoSave(): void {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
    autoSaveTimeout = null
  }
}

