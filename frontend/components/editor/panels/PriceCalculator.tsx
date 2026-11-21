'use client';

import { useState, useEffect } from 'react';
import { useDesignStore } from '@/lib/editor/state/store';
import { pricingApi } from '@/lib/api/pricing';
import type { PricingResponse } from '@shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Calculator, Truck, Loader2 } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';

interface PriceCalculatorProps {
  className?: string;
}

// Quantities quoted side by side, like packhelp's quantity selector. Every
// number on this panel comes from the backend pricing engine; the previous
// implementation invented base/printing/finishing/lamination costs, discount
// tiers and a "price comparison" client-side.
const COMPARISON_QUANTITIES = [50, 100, 250, 500, 1000];

export function PriceCalculator({ className }: PriceCalculatorProps) {
  const { language } = useLanguage();
  const [quantity, setQuantity] = useState(100);

  const model = useDesignStore((s) => s.model);

  const [quote, setQuote] = useState<PricingResponse | null>(null);
  const [tiers, setTiers] = useState<Record<number, number | null>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      const t = (model.type || '').toLowerCase();
      const productType = t.includes('bag') || t.includes('pouch') ? 'bag' : t.includes('label') ? 'label' : 'box';
      const payload = {
        productType,
        dimensions: { ...model.dimensions, unit: 'mm' as const },
        materialCode: model.material,
      };

      pricingApi
        .calculate({ ...payload, quantity })
        .then((res) => {
          if (!cancelled) setQuote(res.success && res.data ? res.data : null);
        })
        .catch(() => {
          if (!cancelled) setQuote(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      // Unit price at each comparison quantity, from the same engine.
      Promise.all(
        COMPARISON_QUANTITIES.map((q) =>
          pricingApi
            .calculate({ ...payload, quantity: q })
            .then((res) => ({ q, unit: res.success && res.data ? res.data.totalPrice / q : null }))
            .catch(() => ({ q, unit: null })),
        ),
      ).then((results) => {
        if (cancelled) return;
        const next: Record<number, number | null> = {};
        results.forEach(({ q, unit }) => {
          next[q] = unit;
        });
        setTiers(next);
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [quantity, model.type, model.material, model.dimensions.length, model.dimensions.width, model.dimensions.height]);

  const currency = quote?.material?.currency ?? 'USD';
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);

  const breakdown = quote?.breakdown;
  const rows: { label: string; value: number | undefined }[] = [
    { label: language === 'ar' ? 'مادة التصنيع' : 'Material', value: breakdown?.materialCost },
    { label: language === 'ar' ? 'التصنيع' : 'Conversion', value: breakdown?.conversionCost },
    { label: language === 'ar' ? 'خيارات إضافية' : 'Options', value: breakdown?.optionsMarkup },
    { label: language === 'ar' ? 'خصم الكمية' : 'Quantity discount', value: breakdown?.discountApplied },
    { label: language === 'ar' ? 'الهامش' : 'Margin', value: breakdown?.marginAmount },
    { label: language === 'ar' ? 'الضريبة' : 'Tax', value: breakdown?.tax },
  ].filter((r) => r.value !== undefined && r.value !== 0);

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            {language === 'ar' ? 'حاسبة الأسعار' : 'Price Calculator'}
            {loading && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quantity Input */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              {language === 'ar' ? 'الكمية' : 'Quantity'}
            </Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={50000}
              className="text-sm"
            />
          </div>

          {/* Price Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</span>
              <span className="font-medium">
                {quote ? formatPrice(quote.totalPrice / quote.quantity) : '—'}
              </span>
            </div>

            <Separator />

            {quote ? (
              <div className="space-y-1 text-xs">
                {rows.map((row) => (
                  <div key={row.label} className="flex justify-between">
                    <span>{row.label}</span>
                    <span>{formatPrice(row.value as number)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-blue-600">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    {language === 'ar' ? 'تقدير الشحن' : 'Shipping estimate'}
                  </span>
                  <span>{formatPrice(breakdown?.shippingEstimate ?? 0)}</span>
                </div>
              </div>
            ) : (
              !loading && (
                <p className="text-xs text-slate-500">
                  {language === 'ar'
                    ? 'تعذر حساب السعر لهذه المواصفات.'
                    : 'Could not price this configuration.'}
                </p>
              )
            )}

            <Separator />

            <div className="flex items-center justify-between text-lg font-bold">
              <span>{language === 'ar' ? 'المجموع' : 'Total'}</span>
              <span className="text-green-600">{quote ? formatPrice(quote.totalPrice) : '—'}</span>
            </div>
          </div>

          {/* Unit price by quantity, all from the pricing engine */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              {language === 'ar' ? 'سعر الوحدة حسب الكمية' : 'Unit price by quantity'}
            </Label>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {COMPARISON_QUANTITIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuantity(q)}
                  className={`p-2 rounded border text-left ${
                    quantity === q
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="font-medium">{q.toLocaleString()}</div>
                  <div className="text-green-600">
                    {tiers[q] != null ? `${formatPrice(tiers[q] as number)} / ${language === 'ar' ? 'قطعة' : 'pc'}` : '—'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
