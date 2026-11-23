'use client';

import { useState, useEffect } from 'react';
import {useEditorPresetQuote, requestEditorPresetQuote} from "@/lib/editor/hooks/useEditorPresetQuote"
import { useDesignStore } from '@/lib/editor/state/store';
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

  // Quantity is the shared model state (single source of truth) — the footer
  // summary reads the same value, so panel and footer can never disagree.
  const model = useDesignStore((s) => s.model);
  const applyCoreState = useDesignStore((s) => s.applyCoreState);
  const pricing = useEditorPresetQuote();
  const customQuote = pricing.status === "unpriced";
  const quote = pricing.quote;
  const loading = pricing.status === "loading";
  const quantity = model.quantity;
  const setQuantity = (q: number) =>
    applyCoreState((s) => ({ ...s, model: { ...s.model, quantity: q } }));

  const [tiers, setTiers] = useState<Record<number, number | null>>({});

  const [tierKey,setTierKey] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (!quote) return;
    Promise.all(COMPARISON_QUANTITIES.map(q => requestEditorPresetQuote(pricing.core,q)
      .then(result => ({q,unit:result.merchandiseUnit})).catch(()=>({q,unit:null}))))
      .then(results=>{if(!cancelled){setTiers(Object.fromEntries(results.map(r=>[r.q,r.unit])));setTierKey(pricing.key)}});
    return()=>{cancelled=true};
  },[pricing.key,quote]);

  const currency = quote?.material?.currency ?? 'EGP';
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

  if (customQuote) return <div role="status" className="p-4 text-sm bg-amber-50 rounded border border-amber-200">{language === "ar" ? "هذه المواصفات تحتاج عرض سعر معتمد. لا يتوفر تقدير متطابق بين المحرر والسلة. لم تتغير اختياراتك المحفوظة." : "These specifications require an approved quote. A matching editor/cart estimate is unavailable. Your saved choices have not been changed."}</div>;

  return (
    <div data-testid="editor-price-panel" className={className}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            {language === 'ar' ? 'حاسبة الأسعار' : 'Price Calculator'}
            <span className="ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
              {language === 'ar' ? 'سعر تقديري' : 'Estimated'}
            </span>
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
              <span>{language === 'ar' ? 'سعر الوحدة (بدون الشحن)' : 'Unit Price (excl. shipping)'}</span>
              <span className="font-medium" data-testid="editor-merchandise-unit">
                {quote ? formatPrice(quote.merchandiseUnit) : '—'}
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
              <span data-testid="editor-price-panel-total" className="text-green-600">{quote ? formatPrice(quote.totalPrice) : '—'}</span>
            </div>
            {quote && (
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                {language === 'ar'
                  ? 'سعر تقديري للنموذج الأولي — بانتظار تأكيد المورد قبل الإطلاق.'
                  : 'Prototype estimate — pending supplier confirmation before launch.'}
              </p>
            )}
          </div>

          {pricing.status === 'error' && <button type="button" onClick={pricing.retry} className="text-sm underline">{language === 'ar' ? 'إعادة حساب السعر' : 'Retry price'}</button>}
          {/* Unit price by quantity, all from the pricing engine */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              {language === 'ar' ? 'سعر الوحدة حسب الكمية (بدون الشحن)' : 'Unit price by quantity (excl. shipping)'}
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
                    {tierKey === pricing.key && tiers[q] != null ? `${formatPrice(tiers[q] as number)} / ${language === 'ar' ? 'قطعة' : 'pc'}` : '—'}
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
