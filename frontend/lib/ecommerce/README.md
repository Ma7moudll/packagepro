# E-commerce System

This directory contains the e-commerce system for PackagePro including cart, checkout, payments, orders, invoices, and shipping.

## Features

### ✅ Shopping Cart
- **Cart Store** (`cart-store.ts`): Zustand store with persistence
- Add/remove items
- Update quantities
- Calculate totals (subtotal, tax, shipping, total)
- Free shipping over 500 SAR
- Cart persistence in localStorage

### ✅ Checkout Flow
- **Checkout Page** (`/checkout`): Multi-step checkout
  - Step 1: Shipping address
  - Step 2: Payment method selection
  - Step 3: Order review
- Progress indicator
- Form validation
- Order placement

### ✅ Payment Gateways
- **Stripe Integration** (`StripePayment.tsx`):
  - Credit card payments
  - Payment intent creation
  - Secure payment processing
- **PayPal Integration** (`PayPalPayment.tsx`):
  - PayPal checkout
  - Order creation and capture
- **Cash on Delivery**: COD option

### ✅ Order Management
- **Orders Page** (`/orders`): List all user orders
- **Order Detail Page** (`/orders/[id]`): Order details
- Order status tracking
- Payment status
- Tracking numbers
- Order history

### ✅ Invoice Generation
- **Invoice API** (`/api/ecommerce/invoices/[id]`):
  - Generate invoice for order
  - Invoice number generation
  - PDF download (ready for jsPDF)
  - Invoice status tracking

### ✅ Shipping Integration
- **Shipping Rates API** (`/api/ecommerce/shipping/rates`):
  - Calculate shipping rates
  - Multiple carriers (Aramex, DHL)
  - Service options (Standard, Express, Overnight)
- **Shipping Labels API** (`/api/ecommerce/shipping/labels`):
  - Create shipping labels
  - Generate tracking numbers
  - Label PDF generation
  - Tracking URLs

## API Routes

### Cart & Checkout
- `/api/ecommerce/orders`: POST (create order), GET (list orders)
- `/api/ecommerce/orders/[id]`: GET (order details), PUT (update order)

### Payments
- `/api/ecommerce/create-payment-intent`: Create Stripe payment intent
- `/api/ecommerce/create-paypal-order`: Create PayPal order
- `/api/ecommerce/capture-paypal-order`: Capture PayPal payment

### Invoices
- `/api/ecommerce/invoices/[id]`: GET (invoice details), POST (generate invoice)
- `/api/ecommerce/invoices/[id]/download`: Download invoice PDF

### Shipping
- `/api/ecommerce/shipping/rates`: Calculate shipping rates
- `/api/ecommerce/shipping/labels`: Create shipping labels, GET (list labels)

## Usage

### Add to Cart

```typescript
import { useCartStore } from "@/lib/ecommerce/cart-store"

const addItem = useCartStore((s) => s.addItem)

addItem({
  productId: "product-123",
  sku: "BOX-001",
  name: "Custom Box",
  quantity: 1,
  price: 100,
  customization: {
    designId: "design-456",
  },
})
```

### Checkout

Navigate to `/checkout` with items in cart. The checkout flow will guide users through:
1. Shipping address
2. Payment method
3. Order review

### Payment Processing

Stripe and PayPal are integrated. Set environment variables:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
```

## Pages

- `/cart` - Shopping cart
- `/checkout` - Checkout flow
- `/orders` - Order list
- `/orders/[id]` - Order details

## Components

- `StripePayment` - Stripe payment form
- `PayPalPayment` - PayPal checkout button

## Notes

- Cart is persisted in localStorage
- Payment processing uses mock data (replace with real API calls)
- Invoice PDF generation requires jsPDF (currently returns mock)
- Shipping integration requires API keys from carriers
- All prices in SAR (Saudi Riyal)
- Tax rate: 15% (VAT)
- Free shipping threshold: 500 SAR

