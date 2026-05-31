'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDesignStore } from '@/lib/editor/state/store';
import { PriceCalculatorService, PricingBreakdown, PriceComparison, PricingInput } from '@/lib/editor/services/price-calculator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calculator, TrendingUp, DollarSign, Truck } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';

interface PriceCalculatorProps {
  className?: string;
}

export function PriceCalculator({ className }: PriceCalculatorProps) {
  const { language } = useLanguage();
  const [quantity, setQuantity] = useState(100);
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [shippingCountry, setShippingCountry] = useState('US');
  const [showComparison, setShowComparison] = useState(false);

  const model = useDesignStore((s) => s.model);
  const canvas = useDesignStore((s) => s.canvas);

  // Create pricing input from current design
  const pricingInput: PricingInput = useMemo(() => ({
    productType: model.category || 'box',
    dimensions: model.dimensions,
    material: model.material,
    quantity,
    printType: 'print-fullcolor', // TODO: Get from design
    finishing: model.finishing,
    lamination: model.lamination,
    shipping: {
      method: shippingMethod,
      country: shippingCountry,
    },
  }), [model, quantity, shippingMethod, shippingCountry]);

  // Calculate pricing
  const pricing = useMemo(() => {
    return PriceCalculatorService.calculatePricing(pricingInput);
  }, [pricingInput]);

  // Price comparison
  const comparison = useMemo(() => {
    return PriceCalculatorService.generatePriceComparison(pricingInput);
  }, [pricingInput]);

  const quantityTiers = PriceCalculatorService.getQuantityTiers();

  const handleQuantityChange = (value: string) => {
    const numValue = parseInt(value) || 1;
    setQuantity(Math.max(1, numValue));
  };

  const formatPrice = (amount: number) => {
    return PriceCalculatorService.formatPrice(amount);
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              {language === 'ar' ? 'حاسبة الأسعار' : 'Price Calculator'}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowComparison(!showComparison)}
            >
              <TrendingUp className="w-4 h-4" />
            </Button>
          </div>
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
              onChange={(e) => handleQuantityChange(e.target.value)}
              min={1}
              max={50000}
              className="text-sm"
            />
          </div>

          {/* Shipping Options */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                {language === 'ar' ? 'الشحن' : 'Shipping'}
              </Label>
              <Select value={shippingMethod} onValueChange={setShippingMethod}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">
                    {language === 'ar' ? 'عادي' : 'Standard'}
                  </SelectItem>
                  <SelectItem value="express">
                    {language === 'ar' ? 'سريع' : 'Express'}
                  </SelectItem>
                  <SelectItem value="overnight">
                    {language === 'ar' ? 'فوري' : 'Overnight'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">
                {language === 'ar' ? 'البلد' : 'Country'}
              </Label>
              <Select value={shippingCountry} onValueChange={setShippingCountry}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">🇺🇸 US</SelectItem>
                  <SelectItem value="CA">🇨🇦 CA</SelectItem>
                  <SelectItem value="GB">🇬🇧 UK</SelectItem>
                  <SelectItem value="DE">🇩🇪 DE</SelectItem>
                  <SelectItem value="FR">🇫🇷 FR</SelectItem>
                  <SelectItem value="local">
                    {language === 'ar' ? 'محلي' : 'Local'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</span>
              <span className="font-medium">{formatPrice(pricing.unitPrice)}</span>
            </div>

            <Separator />

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>{language === 'ar' ? 'التكلفة الأساسية' : 'Base Cost'}</span>
                <span>{formatPrice(pricing.basePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === 'ar' ? 'مادة التصنيع' : 'Material'}</span>
                <span>{formatPrice(pricing.materialCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === 'ar' ? 'الطباعة' : 'Printing'}</span>
                <span>{formatPrice(pricing.printingCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === 'ar' ? 'التشطيب' : 'Finishing'}</span>
                <span>{formatPrice(pricing.finishingCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === 'ar' ? 'اللامينيشن' : 'Lamination'}</span>
                <span>{formatPrice(pricing.laminationCost)}</span>
              </div>
              <div className="flex justify-between text-blue-600">
                <span className="flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  {language === 'ar' ? 'الشحن' : 'Shipping'}
                </span>
                <span>{formatPrice(pricing.shippingCost)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between text-lg font-bold">
              <span>{language === 'ar' ? 'المجموع' : 'Total'}</span>
              <span className="text-green-600">{formatPrice(pricing.total)}</span>
            </div>
          </div>

          {/* Quantity Discounts */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              {language === 'ar' ? 'خصومات الكمية' : 'Quantity Discounts'}
            </Label>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {quantityTiers.slice(0, 6).map((tier, index) => (
                <div
                  key={index}
                  className={`p-2 rounded border ${
                    quantity >= tier.min && quantity <= tier.max
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="font-medium">{tier.min}-{tier.max === 99999 ? '+' : tier.max}</div>
                  <div className="text-green-600">{tier.discount}% off</div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Comparison */}
          {showComparison && (
            <div className="space-y-3 pt-3 border-t">
              <Label className="text-xs font-medium">
                {language === 'ar' ? 'مقارنة الأسعار' : 'Price Comparison'}
              </Label>

              {comparison.options.map((option) => (
                <Card key={option.id} className={`p-3 ${option.id === comparison.recommended ? 'ring-2 ring-blue-500' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-sm">{option.name}</h4>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                    {option.id === comparison.recommended && (
                      <Badge variant="default" className="text-xs">
                        {language === 'ar' ? 'موصى به' : 'Recommended'}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-medium">{formatPrice(option.pricing.total)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatPrice(option.pricing.unitPrice)} each
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {option.estimatedDelivery}
                    </div>
                  </div>
                </Card>
              ))}

              {comparison.savings > 0 && (
                <div className="text-center text-green-600 text-sm font-medium">
                  💰 {language === 'ar' ? 'توفير' : 'Save'} {formatPrice(comparison.savings)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}