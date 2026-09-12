'use client';

// DielineEditor — canonical dieline preflight panel (M8-D migration).
//
// Standalone tool surface. Given a DielineBlueprint + mm dims it resolves the
// canonical geometry exactly ONCE via `resolveDieline` and presents the flat
// sheet through the shared canonical renderer DielineView (the SAME renderer
// used by DielineCanvas — there is no second geometry model or render path
// here). The legacy template picker + design-asset API is gone.
//
// Blueprint-absent → informative empty state (this panel is blueprint-driven by
// design; the interactive M7 compat delegate lives in DielineView only).

import { useState, useMemo } from 'react';
import { resolveDieline } from '@/lib/editor/geometry/resolve-dieline';
import { DielineView } from '@/components/editor/canvas/DielineView';
import { checkOverlaps } from '@/lib/editor/services/dieline-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scissors, Search } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';
import type { DielineBlueprint } from '@shared/types';
import type { ModelDimensions, FaceId } from '@/lib/editor/state/types';

interface DielineEditorProps {
  className?: string;
  /** Canonical packaging blueprint (M8-B passthrough). Optional: panel empty-state without it. */
  blueprint?: DielineBlueprint;
  /** Product mm dimensions used to size the panels. */
  dims?: ModelDimensions;
}

export function DielineEditor({ className, blueprint, dims }: DielineEditorProps) {
  const { language } = useLanguage();
  const [selectedFace, setSelectedFace] = useState<FaceId | null>(null);

  // Single canonical resolution point for this panel.
  const resolution = useMemo(
    () => resolveDieline(blueprint, dims ?? { length: 0, width: 0, height: 0 }),
    [blueprint, dims?.length, dims?.width, dims?.height]
  );

  const geometry = resolution.ok ? resolution.geometry : undefined;
  const overlaps = geometry ? checkOverlaps(geometry) : [];
  const faceCount = geometry ? Object.keys(geometry.panels).length : 0;

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Scissors className="w-4 h-4" />
              {language === 'ar' ? 'تصميم Dieline' : 'Dieline Design'}
            </CardTitle>
            {resolution.ok && (
              <Button size="sm" variant="outline" disabled>
                <Search className="w-4 h-4 mr-1" />
                {language === 'ar' ? 'مستند إلى Blueprint' : 'Blueprint-driven'}
              </Button>
            )}
          </div>

          {resolution.ok && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{geometry!.boxType}</span>
              <span>{geometry!.dims.length} × {geometry!.dims.width} × {geometry!.dims.height} mm</span>
              <Badge variant="outline">{faceCount} faces</Badge>
              <Badge variant="outline">{geometry!.cutPaths.length} cuts</Badge>
              <Badge variant="outline">{geometry!.foldPaths.length} folds</Badge>
              <Badge variant="outline">{geometry!.gluePaths.length} glue</Badge>
              <Badge variant={overlaps.length === 0 ? 'outline' : 'destructive'}>
                {overlaps.length === 0
                  ? 'no overlaps'
                  : `${overlaps.length} overlap${overlaps.length > 1 ? 's' : ''}`}
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {!resolution.ok ? (
            <div className="text-center py-10 text-muted-foreground">
              <Scissors className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">
                {resolution.reason === 'no-blueprint'
                  ? language === 'ar'
                    ? 'قدم blueprint و أبعاد لعرض المخطط المسطح'
                    : 'Provide a packaging blueprint and dimensions to render the flat sheet'
                  : language === 'ar'
                    ? `تعذر إنشاء الهندسة: ${resolution.error}`
                    : `Cannot resolve geometry: ${resolution.error}`}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden h-[420px]">
              <DielineView
                resolution={resolution}
                backgroundColor="#d2b48c"
                selectedFace={selectedFace}
                onSelectFace={setSelectedFace}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}