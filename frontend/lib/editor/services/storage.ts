"use client"

import { DesignCoreState } from "@/lib/editor/state/types"
import { designsApi } from "@/lib/api/designs"
import {
  deserializeDesignData,
  normalizeFromManifest,
  serializeDesignData,
} from "@/lib/editor/services/dieline-manifest"

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
  sessionId: string,
  name: string,
  state: DesignCoreState
): Promise<void> {
  try {
    await ensureCloudSession(sessionId, name, state)
  } catch (error) {
    console.error("Failed to save design to cloud:", error)
    // Fallback to IndexedDB only
    await saveDesignToIndexedDB(sessionId, name, state)
  }
}

/**
 * Persist the design editor state to the backend. If no session exists yet,
 * create one and return its id (used to key future saves and cart items).
 */
export async function ensureCloudSession(
  sessionId: string | null,
  name: string,
  state: DesignCoreState
): Promise<string> {
  let id = sessionId

  if (!id) {
    const res = await designsApi.createSession({ name })
    const session = res.success && res.data ? (res.data as any) : null
    id = session?.sessionId ?? null
    if (!id) {
      throw new Error("Failed to create design session")
    }
  }

  await designsApi.save({
    sessionId: id,
    // M8-H: persist a versioned snapshot — schemaVersion 2 + the resolved-
    // geometry manifest (provenance flags carried from the load path). The
    // state itself stays top-level for M7 consumers (traceability contract).
    designData: serializeDesignData(state),
    // M7-E: retain product identity on the Design row for Cart->Order traceability.
    productId: state.product?.id,
    variantId: state.productConfig?.variantId,
    sku: state.productConfig?.sku,
    designConfig: state.productConfig,
  })
  return id
}

export async function loadDesignFromCloud(sessionId: string): Promise<DesignCoreState | null> {
  try {
    const res = await designsApi.getSession(sessionId)
    const session = res.success && res.data ? (res.data as any) : null
    if (session?.designData) {
      // M8-H: manifest-first restore. The persisted manifest (dimensions,
      // canvas extent, product identity) is authoritative — reopen is
      // deterministic for blueprint/exact designs and faithful for migrated
      // ones. Provenance rides along for the next save's lineage.
      const { state, provenance, manifest } = deserializeDesignData(session.designData)
      const restored = normalizeFromManifest(state, manifest)
      return { ...restored, manifestMetadata: provenance }
    }
    return null
  } catch (error) {
    console.error("Failed to load design from cloud:", error)
    // Fallback to IndexedDB
    const stored = await loadDesignFromIndexedDB(sessionId)
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
  saveToCloud = false,
  onSaved?: () => void
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
      onSaved?.()
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

