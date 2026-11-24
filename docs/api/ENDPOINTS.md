# PackagePro API Endpoints

## Authentication

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "CUSTOMER" // optional: CUSTOMER, VENDOR, ADMIN
}
```

### POST /api/auth/login
Login and get access tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "...",
      "expiresIn": 900
    }
  }
}
```

### POST /api/auth/refresh
Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "..."
}
```

## Pricing

### POST /api/pricing/calculate
Calculate price for a product.

**Request Body:**
```json
{
  "productType": "box",
  "quantity": 100,
  "dimensions": {
    "length": 20,
    "width": 15,
    "height": 10,
    "unit": "cm"
  },
  "materialCode": "COATED_250"
}
```

### GET /api/pricing/materials
Get list of available materials.

## Orders

### POST /api/orders
Create a new order.

### GET /api/orders/:id
Get order details.

### GET /api/orders
List customer orders (paginated).

### PATCH /api/orders/:id/status
Update order status (Admin only).

### POST /api/orders/:id/request-approval
Request customer approval for design.

### POST /api/orders/:id/approve
Approve order design.

**Request Body:**
```json
{
  "token": "approval-token"
}
```

## Designs

### POST /api/designs/session
Create a new design session.

### GET /api/designs/session/:sessionId
Get design session.

### POST /api/designs/save
Save design data.

### GET /api/designs/:id
Get design by ID.

### GET /api/designs/:id/files
Get design files.

## Payments

### POST /api/payments/create-intent
Create Stripe payment intent.

**Request Body:**
```json
{
  "orderId": "order-id"
}
```

### POST /api/payments/confirm
Confirm payment.

### POST /api/webhooks/stripe
Stripe webhook endpoint (no auth required).

## Pre-Press

### POST /api/orders/:id/prepress-check
Run pre-press quality check.

### GET /api/orders/:id/prepress-results
Get pre-press check results.

## Purchase Orders

### POST /api/orders/:id/create-po
Create purchase order for an order.

### GET /api/purchase-orders/:id
Get purchase order details.

### POST /api/purchase-orders/:id/confirm
Confirm purchase order receipt (Vendor).

## Production

### POST /api/production/start/:poId
Start production for a PO.

### POST /api/production/:id/progress
Update production progress.

**Request Body:**
```json
{
  "progressPercent": 50,
  "notes": "Halfway done"
}
```

### GET /api/production/:id
Get production details.

## Samples

### POST /api/production/:productionId/samples
Upload sample photos.

### POST /api/samples/:id/approve
Approve sample (Admin/QA).

### POST /api/samples/:id/reject
Reject sample with revision notes.

### GET /api/samples/:id
Get sample details.

## Shipping

### POST /api/shipments/create/:id
Create shipment for an order.

### GET /api/shipments/:id/tracking
Get shipment tracking information.

### GET /api/orders/:orderId/shipment
Get shipment by order ID.

### POST /api/webhooks/dhl
DHL webhook endpoint (no auth required).

## Reviews

### POST /api/reviews
Create a review for an order.

**Request Body:**
```json
{
  "orderId": "order-id",
  "rating": 5,
  "qualityRating": 5,
  "speedRating": 4,
  "designRating": 5,
  "serviceRating": 5,
  "valueRating": 4,
  "comment": "Great quality!",
  "photoUrls": []
}
```

### GET /api/reviews/order/:orderId
Get review for an order.

### GET /api/vendors/:id/reviews
Get all reviews for a vendor (paginated).

## Settlements

### POST /api/settlements/process/:id
Process settlement (Admin only).

### GET /api/settlements/:id
Get settlement details.

### GET /api/vendors/:id/payments
Get vendor payment history (paginated).

## Finance

### GET /api/finance/reports
Get financial report for a period.

**Query Parameters:**
- `start` - Start date (ISO format)
- `end` - End date (ISO format)

### GET /api/orders/:id/financial-summary
ADMIN only. Returns internal supplier cost and platform margin fields. Owning the order or supplying a purchase order does not grant access. Missing/invalid authentication returns 401; authenticated non-admin callers return 403 before order lookup. An admin requesting an unknown order receives 404 with the standard NOT_FOUND error envelope.

### GET /api/vendors/:id/payment-summary
Get payment summary for a vendor.

## Handshakes

### POST /api/handshakes
Create handshake request.

### GET /api/vendors/handshakes
Get vendor handshakes.

### POST /api/handshakes/:id/accept
Accept handshake (Vendor).

### POST /api/handshakes/:id/reject
Reject handshake (Vendor).

**Request Body:**
```json
{
  "reason": "Capacity constraints"
}
```

## Vendors

### GET /api/vendors/dashboard
Get vendor dashboard data.

### GET /api/vendors/orders
Get vendor orders (paginated).

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `status` - Filter by status

## Analytics

### GET /api/analytics/funnel
Get conversion funnel data.

**Query Parameters:**
- `start` - Start date
- `end` - End date

### GET /api/analytics/products
Get product popularity metrics.

### GET /api/vendors/:id/performance
Get vendor performance metrics.

## Authentication

All endpoints except `/api/auth/*`, `/api/webhooks/*`, and `/api/pricing/*` require authentication.

**Header:**
```
Authorization: Bearer <access_token>
```

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {}
}
```

Common error codes:
- `VALIDATION_ERROR` - Invalid input
- `AUTHENTICATION_ERROR` - Authentication required
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `INTERNAL_ERROR` - Server error
