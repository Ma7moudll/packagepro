"use client"

// DeferredDielinePlaceholder — M8-J (spec §14): renders a clear empty-state
// card when the product is flagged support:"deferred". No fake geometry is ever
// shipped for non-box products whose blueprint cannot be authored safely in M8.
// Used by DielineCanvas (M8-D/M8-J) in place of both the M7 fallback and the
// canonical DielineView — deferred products have NO blueprint, NO generic net.

import { AlertTriangle } from "lucide-react"

interface DeferredDielinePlaceholderProps {
  reason?: string
}

export function DeferredDielinePlaceholder({ reason }: DeferredDielinePlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-50 px-6 py-12">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 text-amber-600 mb-5">
        <AlertTriangle className="h-7 w-7" />
      </div>

      <h2 className="text-lg font-semibold text-slate-800 mb-2">
        Dieline not available for this product
      </h2>

      <p className="text-sm text-slate-500 max-w-sm text-center leading-relaxed">
        This product has no M8 blueprint. A generic box net would be
        incorrect for its physical structure, so no fake geometry is
        rendered here.
      </p>

      {reason && (
        <p className="mt-3 text-xs text-slate-400 max-w-sm text-center leading-relaxed italic">
          {reason}
        </p>
      )}

      <span className="mt-4 inline-block rounded bg-slate-200 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-600 uppercase"
        data-testid="deferred-badge"
      >
        support: deferred
      </span>
    </div>
  )
}
