# Database Schema

## Core Entities

### User & Authentication
- `User`: Base user account
- `Customer`: Customer profile
- `Vendor`: Vendor profile

### Orders
- `Order`: Main order entity
- `OrderItem`: Order line items
- `Design`: Design linked to order
- `DesignFile`: Design files (PDF, images, etc.)

### Production
- `PurchaseOrder`: PO sent to vendor
- `Handshake`: Vendor acceptance/rejection
- `Production`: Production tracking
- `Sample`: Sample photos for QA

### Logistics
- `Shipment`: Shipping information
- `PrePressCheck`: Pre-press validation results

### Financial
- `Payment`: Payment records (Stripe)
- `Settlement`: Vendor payment settlements

### Reviews
- `Review`: Customer reviews

## Relationships

- Order → Customer (many-to-one)
- Order → Design (one-to-one)
- Order → PurchaseOrder (one-to-one)
- PurchaseOrder → Vendor (many-to-one)
- Production → PurchaseOrder (one-to-one)

## Status Flow

### Order Status
```
pending_review → awaiting_approval → ready_for_routing → 
vendor_confirmed → in_production → quality_check → 
ready_to_ship → shipped → delivered → completed
```
