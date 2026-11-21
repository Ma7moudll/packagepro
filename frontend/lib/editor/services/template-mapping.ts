import type { Template } from "@/lib/editor/types/template"
import type { DesignCoreState } from "@/lib/editor/state/types"
import type { Template as BackendTemplate } from "@shared/types"

/**
 * Pure mappings between the backend Template shape and the editor Template
 * shape, and from a template onto the live editor core state. Kept free of
 * runtime imports (types only) so the unit tests can exercise them directly.
 */

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function toEditorTemplate(t: BackendTemplate): Template {
  const designData = (t.designData ?? {}) as Record<string, unknown>
  const raw = (designData.designState ?? designData) as Record<string, unknown>
  // Only trust the payload as a full editor state when it actually looks like
  // one; catalog seed rows carry a fabric-style `{version, objects, metadata}`
  // document instead, which must never replace the editor's core state.
  const looksLikeEditorState =
    raw != null && typeof raw === "object" && "canvas" in raw && "model" in raw && "layers" in raw

  return {
    id: t.id,
    slug: t.id,
    name: t.name,
    description: t.description ?? "",
    category: (t.category as Template["category"]) ?? "other",
    style: "modern",
    thumbnailUrl: t.thumbnail ?? "",
    designState: looksLikeEditorState
      ? (raw as unknown as DesignCoreState)
      // Keep the catalog metadata so loadTemplateIntoEditor can apply the
      // template's product defaults (material/dimensions).
      : ({ metadata: (raw as any).metadata } as unknown as DesignCoreState),
    createdBy: "",
    isPublic: t.isPublic,
    tags: t.tags ?? [],
    avgRating: 0,
    ratingsCount: 0,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }
}

/**
 * Build the store updater that applies a template to the editor.
 * Returns an updater (not a bare state) so catalog templates that only carry
 * product defaults (material/dimensions metadata) merge into the live editor
 * state instead of clobbering it with an incomplete object.
 */
export function loadTemplateIntoEditor(template: Template) {
  const state = template.designState as Partial<DesignCoreState> | undefined
  const metadata = ((state as any)?.metadata ?? {}) as {
    defaultMaterial?: string
    defaultDimensions?: { length?: number; width?: number; height?: number }
  }

  return (core: DesignCoreState): DesignCoreState => {
    // Full saved editor state: replace, matching the previous behavior.
    if (state && state.canvas && state.model && state.layers) {
      return state as DesignCoreState
    }

    // Metadata-only catalog template: apply product defaults onto the live state.
    const dims = metadata.defaultDimensions
    return {
      ...core,
      model: {
        ...core.model,
        ...(metadata.defaultMaterial ? { material: metadata.defaultMaterial } : {}),
        ...(dims?.length && dims?.width && dims?.height
          ? { dimensions: { length: dims.length, width: dims.width, height: dims.height } }
          : {}),
      },
    }
  }
}
