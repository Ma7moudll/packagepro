"use client"

// M8-J — Certified dieline export context.
//
// Bridges the pure delivery contract (`certified-export.ts`) to the editor:
//
//   persisted side  -> session.designData -> deserializeDesignData -> manifest.dieline
//                            (canonicalPersistedGeometry; the snapshot that M8-I certified)
//   live side       -> useDesignStore product.dieline + model.dimensions
//                            (canonicalLiveGeometry — the ONLY resolution point)
//   coverage        -> byte-identity: live canonical SVG must equal the certified snapshot's SVG
//   freshness       -> design.updatedAt vs prepress.checkedAt
//   gate            -> assessCertification -> assembleDielineDelivery (client byte authority)
//
// The server receipt (`POST /designs/:id/export` with format svg) is fetched as a
// corroborating record only. If it ever disagrees with the client assessment, the
// client wins — delivery from the canonical serializeSVG is the authority.

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { designsApi } from "@/lib/api/designs"
import { useDesignStore } from "@/lib/editor/state/store"
import { deserializeDesignData } from "@/lib/editor/services/dieline-manifest"
import { assertNoUnsupportedSheetArtwork, unsupportedArtworkOutputMessage, unsupportedSheetArtwork } from "@/lib/editor/print-coverage"
import {
  assessCertification,
  assembleDielineDelivery,
  canonicalLiveGeometry,
  canonicalPersistedGeometry,
  canonicalSvg,
  artifactsMatch,
  type DielineDelivery,
  type PrePressResultLike,
} from "@/lib/editor/services/certified-export"

export interface CertifiedDielineState {
  status: "idle" | "loading" | "ready"
  delivery: DielineDelivery | null
  /** Corroborating server receipt (asserted-by-request). */
  serverReceipt: unknown | null
  error: string | null
}

export interface ServerReceiptShape {
  format?: string
  dieline?: boolean
  status?: string
  certificationStatus?: string
  fileName?: string
  reason?: string
  checkedAt?: string | null
}

interface CertifiedExportContextValue extends CertifiedDielineState {
  refresh: () => Promise<void>
  downloadCertified: () => void
}

const CertifiedExportContext = createContext<CertifiedExportContextValue | null>(null)

export function CertifiedExportProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CertifiedDielineState>({
    status: "idle",
    delivery: null,
    serverReceipt: null,
    error: null,
  })

  const refresh = useCallback(async () => {
    setState({ status: "loading", delivery: null, serverReceipt: null, error: null })
    try {
      const { sessionId, designId, product, model } = useDesignStore.getState()
      // Shared output boundary, derived from the actual design data: a
      // two-face sheet carrying inside-face artwork gets no certified
      // delivery (a normal card has no dieline and is unavailable here
      // anyway; this stops stale or crafted states at the same boundary).
      assertNoUnsupportedSheetArtwork(model?.faces, useDesignStore.getState().layers, model?.type)

      // 1) persisted side — session carries the saved designData (v2 manifest).
      const sessionIdValue = sessionId ?? sessionStorage.getItem("designSessionId")
      let persistedSnapshot: ReturnType<typeof deserializeDesignData>["manifest"] | undefined
      let fetchedDesignId = designId
      let orderId: string | null = null
      let designUpdatedAt: string | null = null

      if (sessionIdValue) {
        const session = await designsApi.getSession(sessionIdValue)
        const s = session as {
          data?: {
            designId?: string
            orderId?: string | null
            updatedAt?: string
            designData?: unknown
          } | null
        }
        const payload = s?.data ?? (session as { designId?: string; orderId?: string | null; updatedAt?: string; designData?: unknown })
        fetchedDesignId = payload?.designId ?? fetchedDesignId
        orderId = payload?.orderId ?? null
        designUpdatedAt = payload?.updatedAt ?? null
        if (payload?.designData) {
          const parsed = deserializeDesignData(payload.designData as never)
          persistedSnapshot = parsed.manifest
        }
      }

      // 2) live side — current editor blueprint + dims through the canonical point.
      const liveGeometry = canonicalLiveGeometry({
        blueprint: product?.dieline,
        dims: model?.dimensions ?? null,
      })

      // 3) persisted geometry — the manifest snapshot, else resolve persisted inputs.
      const persistedGeometry = canonicalPersistedGeometry({
        snapshot: persistedSnapshot?.dieline ?? null,
        blueprint: persistedSnapshot?.product?.boxType ? product?.dieline : null,
        dims: persistedSnapshot?.variant?.dimensions ?? null,
      })

      // 4) coverage — exact byte identity between live and certified artifacts.
      //    Certification is only possible when a v2 snapshot exists (that is the
      //    geometry the backend M8-I check analyzed). Both must serialize to the
      //    identical canonical SVG.
      const certifiedSnapshot = persistedSnapshot?.dieline
      const coversArtifact =
        !!liveGeometry &&
        !!persistedGeometry &&
        certifiedSnapshot !== undefined &&
        artifactsMatch(
          canonicalSvg(liveGeometry),
          canonicalSvg(persistedGeometry)
        )

      // 5) prepress certification + assessment.
      let prepress: PrePressResultLike | null = null
      if (orderId) {
        const result = await designsApi.getPrePressResults(orderId)
        const data = (result as { data?: PrePressResultLike | null }).data
        prepress = data ?? null
      }

      const boxType = persistedSnapshot?.product?.boxType ?? product?.boxType
      const assessment = assessCertification(prepress, coversArtifact, designUpdatedAt)
      const delivery = assembleDielineDelivery({
        geometry: liveGeometry,
        boxType,
        assessment,
        checkedAt: prepress?.checkedAt ? new Date(prepress.checkedAt).toISOString() : null,
      })

      // 6) corroborating server receipt (never the delivery authority).
      let serverReceipt: unknown | null = null
      if (fetchedDesignId) {
        try {
          const receipt = await designsApi.exportCertifiedDieline(fetchedDesignId)
          serverReceipt = (receipt as { data?: unknown })?.data ?? receipt
        } catch {
          serverReceipt = null
        }
      }

      setState({
        status: "ready",
        delivery,
        serverReceipt,
        error: null,
      })
    } catch (error) {
      setState({
        status: "ready",
        delivery: {
          status: "error",
          message: error instanceof Error ? error.message : "Certified export unavailable",
        },
        serverReceipt: null,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [])

  const downloadCertified = useCallback(() => {
    // Recheck at download time against the live design data — a delivery
    // assembled earlier must not download for a design that has since
    // become (or was restored as) unsupported.
    const live = useDesignStore.getState()
    const unsupported = unsupportedSheetArtwork(live.model.faces, live.layers, live.model.type)
    if (unsupported) {
      const message = `Export blocked: ${unsupportedArtworkOutputMessage(unsupported)}`
      setState((prev) => ({ ...prev, delivery: { status: "error", message }, error: message }))
      return
    }
    const delivery = state.delivery
    if (!delivery || delivery.status !== "delivered") return
    const blob = new Blob([delivery.svg], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = delivery.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [state.delivery])

  const value = useMemo(
    () => ({ ...state, refresh, downloadCertified }),
    [state, refresh, downloadCertified]
  )

  return (
    <CertifiedExportContext.Provider value={value}>{children}</CertifiedExportContext.Provider>
  )
}

export function useCertifiedExport(): CertifiedExportContextValue {
  const ctx = useContext(CertifiedExportContext)
  if (!ctx) {
    throw new Error("useCertifiedExport must be used within CertifiedExportProvider")
  }
  return ctx
}