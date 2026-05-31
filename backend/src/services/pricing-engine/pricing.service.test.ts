import { describe, it, expect } from 'vitest';
import { pricingService } from './pricing.service';

describe('PricingService', () => {
  describe('calculatePrice', () => {
    it('should calculate price for a box correctly', async () => {
      const price = await pricingService.calculatePrice({
        productType: 'box',
        quantity: 100,
        dimensions: {
          length: 20,
          width: 15,
          height: 10,
          unit: 'cm',
        },
        materialCode: 'COATED_250',
      });

      expect(price).toHaveProperty('totalPrice');
      expect(price).toHaveProperty('breakdown');
      expect(price.totalPrice).toBeGreaterThan(0);
      expect(price.breakdown.materialCost).toBeGreaterThan(0);
      expect(price.breakdown.conversionCost).toBeGreaterThan(0);
    });

    it('should calculate price for a bag correctly', async () => {
      const price = await pricingService.calculatePrice({
        productType: 'bag',
        quantity: 500,
        dimensions: {
          length: 30,
          width: 20,
          unit: 'cm',
        },
        materialCode: 'UNCOATED_200',
      });

      expect(price).toHaveProperty('totalPrice');
      expect(price.totalPrice).toBeGreaterThan(0);
    });

    it('should apply quantity discounts for large orders', async () => {
      const smallOrder = await pricingService.calculatePrice({
        productType: 'box',
        quantity: 100,
        dimensions: { length: 20, width: 15, height: 10, unit: 'cm' },
        materialCode: 'COATED_250',
      });

      const largeOrder = await pricingService.calculatePrice({
        productType: 'box',
        quantity: 1000,
        dimensions: { length: 20, width: 15, height: 10, unit: 'cm' },
        materialCode: 'COATED_250',
      });

      const smallUnitPrice = smallOrder.totalPrice / 100;
      const largeUnitPrice = largeOrder.totalPrice / 1000;

      // Large orders should have better unit price
      expect(largeUnitPrice).toBeLessThanOrEqual(smallUnitPrice);
    });
  });

  describe('getMaterials', () => {
    it('should return list of materials', async () => {
      const materials = await pricingService.getMaterials();

      expect(Array.isArray(materials)).toBe(true);
      expect(materials.length).toBeGreaterThan(0);
      expect(materials[0]).toHaveProperty('code');
      expect(materials[0]).toHaveProperty('name');
      expect(materials[0]).toHaveProperty('unitPrice');
    });
  });
});

