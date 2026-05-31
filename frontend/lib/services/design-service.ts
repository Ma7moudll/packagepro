import { api } from "../api"

export interface DesignSession {
  sessionId: string
  design: any
}

export interface SaveDesignData {
  sessionId: string
  designData: any
  name?: string
  description?: string
  files?: Array<{
    fileType: string
    fileName: string
    fileUrl: string
    fileSize?: number
    mimeType?: string
    metadata?: any
  }>
}

export interface DesignVersion {
  id: string
  version: number
  designData: any
  createdAt: string
}

export class DesignService {
  /**
   * Create a new design session
   */
  static async createSession(orderId?: string, name?: string): Promise<DesignSession> {
    const response = await api.post("/designs/session", {
      orderId,
      name,
    })
    return response.data
  }

  /**
   * Get design session
   */
  static async getSession(sessionId: string): Promise<any> {
    const response = await api.get(`/designs/session/${sessionId}`)
    return response.data
  }

  /**
   * Save design
   */
  static async saveDesign(data: SaveDesignData): Promise<any> {
    const response = await api.post("/designs/save", data)
    return response.data
  }

  /**
   * Auto-save design (with debouncing)
   */
  private static autoSaveTimeout: NodeJS.Timeout | null = null

  static autoSave(data: SaveDesignData, delay: number = 30000): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout)
    }

    this.autoSaveTimeout = setTimeout(async () => {
      try {
        await this.saveDesign(data)
        console.log("Auto-saved design")
      } catch (error) {
        console.error("Auto-save failed:", error)
      }
    }, delay)
  }

  /**
   * Get design by ID
   */
  static async getDesign(designId: string): Promise<any> {
    const response = await api.get(`/designs/${designId}`)
    return response.data
  }

  /**
   * Get design files
   */
  static async getDesignFiles(designId: string): Promise<any[]> {
    const response = await api.get(`/designs/${designId}/files`)
    return response.data || []
  }

  /**
   * Save design version
   */
  static async saveVersion(sessionId: string, designData: any, version: number): Promise<void> {
    // Store versions in localStorage (or backend in production)
    const versions = this.getVersions(sessionId)
    versions.push({
      id: `v${version}`,
      version,
      designData,
      createdAt: new Date().toISOString(),
    })
    localStorage.setItem(`design:versions:${sessionId}`, JSON.stringify(versions.slice(-10))) // Keep last 10 versions
  }

  /**
   * Get design versions
   */
  static getVersions(sessionId: string): DesignVersion[] {
    try {
      const stored = localStorage.getItem(`design:versions:${sessionId}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  /**
   * Load specific version
   */
  static getVersion(sessionId: string, version: number): DesignVersion | null {
    const versions = this.getVersions(sessionId)
    return versions.find((v) => v.version === version) || null
  }

  /**
   * Load saved designs for user
   */
  static async loadSavedDesigns(): Promise<any[]> {
    try {
      // This would call a backend API to get user's saved designs
      const response = await api.get("/designs")
      return response.data || []
    } catch (error) {
      console.error("Failed to load saved designs:", error)
      return []
    }
  }
}

