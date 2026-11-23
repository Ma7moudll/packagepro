# 🏗️ PackagePro Architecture Documentation

> Historical document. Claims, completion checklists, architecture versions and test counts below are not current status. Use [current capability boundaries](CURRENT_CAPABILITIES.md) and the exact revision's source/test evidence instead. This report is not a launch or manufacturing approval.


## Overview

PackagePro is a Full-Stack system for order management and custom packaging, built on a Microservices-ready architecture with a clear separation between the Frontend and Backend.

---

## 📊 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Browser    │  │    Mobile    │  │  Desktop App │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                      FRONTEND LAYER                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Next.js 14 (App Router)                  │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │   │
│  │  │  Pages  │  │Components│  │  Hooks  │  │  Stores │ │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────┬─────────────────────────────────┘
                             │ REST API / WebSocket
┌────────────────────────────▼─────────────────────────────────┐
│                       BACKEND LAYER                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Fastify Server                           │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │   │
│  │  │  Routes │  │Services │  │Middleware│  │ Workers │ │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────┬─────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
┌─────────▼────────┐ ┌──────▼──────┐ ┌────────▼────────┐
│   PostgreSQL     │ │    Redis    │ │   File Storage  │
│   (Database)     │ │   (Cache)   │ │   (S3/R2/Local) │
└──────────────────┘ └─────────────┘ └─────────────────┘
```

---

## 🎨 Frontend Architecture

### Technology Stack

```typescript
{
  "framework": "Next.js 14 (App Router)",
  "language": "TypeScript",
  "styling": "Tailwind CSS",
  "ui": "Radix UI + shadcn/ui",
  "state": "Zustand",
  "forms": "React Hook Form + Zod",
  "3d": "Three.js + React Three Fiber",
  "2d": "Fabric.js",
  "animations": "Framer Motion",
  "http": "Axios",
  "realtime": "Socket.io Client"
}
```

### Directory Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes group
│   ├── (customer)/        # Customer routes group
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes
│   ├── editor/            # 3D Editor
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── layout/           # Layout components
│   └── features/         # Feature components
├── lib/                   # Utilities & helpers
│   ├── editor/           # Editor logic
│   ├── auth/             # Auth logic
│   └── utils/            # Utilities
├── hooks/                 # Custom React hooks
└── styles/               # Global styles
```

### State Management

```typescript
// Zustand Store Example
import { create } from 'zustand';

interface DesignState {
  layers: Layer[];
  selectedLayer: string | null;
  addLayer: (layer: Layer) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  removeLayer: (id: string) => void;
}

export const useDesignStore = create<DesignState>((set) => ({
  layers: [],
  selectedLayer: null,
  addLayer: (layer) => set((state) => ({
    layers: [...state.layers, layer]
  })),
  updateLayer: (id, updates) => set((state) => ({
    layers: state.layers.map(l => l.id === id ? { ...l, ...updates } : l)
  })),
  removeLayer: (id) => set((state) => ({
    layers: state.layers.filter(l => l.id !== id)
  })),
}));
```

### Data Flow

```
User Action
    ↓
Component Event Handler
    ↓
Zustand Store Update / API Call
    ↓
State Change / Server Response
    ↓
Component Re-render
    ↓
UI Update
```

---

## 🔧 Backend Architecture

### Technology Stack

```typescript
{
  "framework": "Fastify",
  "language": "TypeScript",
  "orm": "Prisma",
  "database": "PostgreSQL",
  "cache": "Redis",
  "queue": "BullMQ",
  "validation": "Zod",
  "auth": "JWT",
  "storage": "AWS S3 / CloudFlare R2",
  "payments": "Stripe",
  "shipping": "DHL Express",
  "email": "SendGrid / AWS SES"
}
```

### Directory Structure

```
backend/
├── src/
│   ├── modules/           # Feature modules
│   │   ├── auth/         # Authentication
│   │   ├── orders/       # Orders management
│   │   ├── payments/     # Payment processing
│   │   ├── designs/      # Design management
│   │   └── ...           # Other modules
│   ├── services/         # Shared services
│   │   ├── email.service.ts
│   │   ├── storage.service.ts
│   │   └── ...
│   ├── integrations/     # External integrations
│   │   ├── stripe/
│   │   ├── dhl/
│   │   └── ...
│   ├── middleware/       # Fastify middleware
│   ├── lib/              # Libraries
│   │   ├── prisma.ts
│   │   ├── redis.ts
│   │   └── ...
│   ├── utils/            # Utilities
│   ├── types/            # TypeScript types
│   ├── workers/          # Background workers
│   └── index.ts          # Entry point
├── prisma/               # Prisma schema & migrations
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
└── database/             # Database scripts
```

### Module Structure

```
modules/auth/
├── auth.routes.ts        # Route definitions
├── auth.controller.ts    # Request handlers
├── auth.service.ts       # Business logic
├── auth.types.ts         # TypeScript types
└── auth.validation.ts    # Zod schemas
```

### Request Flow

```
HTTP Request
    ↓
Fastify Server
    ↓
Middleware (Auth, Logging, etc.)
    ↓
Route Handler
    ↓
Validation (Zod)
    ↓
Controller
    ↓
Service (Business Logic)
    ↓
Prisma (Database)
    ↓
Response
```

---

## 🗄️ Database Architecture

### Schema Overview

```prisma
// Core Models
User ──┬── Customer ──── Order ──── OrderItem
       │                  │
       └── Vendor         ├── Design ──── DesignFile
                          │    └── PrePressCheck
                          │
                          ├── Payment
                          ├── Shipment
                          ├── Settlement
                          └── Review

// Production Flow
Order ──── PurchaseOrder ──── Production ──── Sample
              │                    │
              └── Handshake        └── QA Checks

// Configuration
Material
PricingRule
Template
Notification
```

### Relationships

```typescript
// One-to-One
User ←→ Customer
User ←→ Vendor
Order ←→ Design
Order ←→ Payment

// One-to-Many
Customer → Orders
Order → OrderItems
Design → DesignFiles
Production → Samples

// Many-to-Many (through junction tables)
// Currently using indirect relationships
```

---

## 🔄 Data Flow

### Order Lifecycle

```
1. Customer Journey
   ├── Browse Products
   ├── Configure Design (3D Editor)
   ├── Get Price Quote
   └── Create Order

2. Payment
   ├── Create Payment Intent (Stripe)
   ├── Process Payment
   └── Confirm Order

3. Pre-Press
   ├── Quality Check
   ├── Generate Proof
   └── Request Approval

4. Routing
   ├── Find Suitable Vendors
   ├── Send Handshake
   └── Vendor Accepts

5. Production
   ├── Create Purchase Order
   ├── Start Production
   ├── Upload Samples
   └── QA Approval

6. Shipping
   ├── Create Shipment (DHL)
   ├── Generate Label
   └── Track Delivery

7. Settlement
   ├── Verify Delivery
   ├── Process Payment to Vendor
   └── Request Review

8. Completion
   ├── Customer Review
   └── Close Order
```

---

## 🔐 Security Architecture

### Authentication Flow

```
1. User Registration
   ├── Validate Input (Zod)
   ├── Hash Password (bcrypt)
   ├── Create User (Prisma)
   └── Send Verification Email

2. User Login
   ├── Validate Credentials
   ├── Verify Password
   ├── Generate JWT Token
   ├── Generate Refresh Token
   └── Return Tokens

3. Protected Routes
   ├── Extract JWT from Header
   ├── Verify Token
   ├── Extract User Info
   └── Attach to Request
```

### Security Layers

```
┌─────────────────────────────────────┐
│         Rate Limiting               │
├─────────────────────────────────────┤
│         CORS Policy                 │
├─────────────────────────────────────┤
│         Security Headers            │
├─────────────────────────────────────┤
│         Input Validation            │
├─────────────────────────────────────┤
│         Authentication              │
├─────────────────────────────────────┤
│         Authorization               │
├─────────────────────────────────────┤
│         Data Encryption             │
└─────────────────────────────────────┘
```

---

## 📡 API Architecture

### RESTful Endpoints

```
/api
├── /auth
│   ├── POST   /register
│   ├── POST   /login
│   └── POST   /refresh
├── /orders
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   └── PATCH  /:id/status
├── /designs
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   └── PUT    /:id
└── ...
```

### Response Format

```typescript
// Success Response
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}

// Error Response
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Error description",
  "details": { ... }
}

// Paginated Response
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 🚀 Performance Optimization

### Caching Strategy

```
┌─────────────────────────────────────┐
│         Browser Cache               │
│         (Static Assets)             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         CDN Cache                   │
│         (Images, CSS, JS)           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Redis Cache                 │
│         (API Responses, Sessions)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Database                    │
│         (Source of Truth)           │
└─────────────────────────────────────┘
```

### Database Optimization

```sql
-- Indexes
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Composite Indexes
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);

-- Full-text Search
CREATE INDEX idx_products_search ON products USING GIN(to_tsvector('english', name || ' ' || description));
```

---

## 📊 Monitoring & Logging

### Logging Levels

```typescript
{
  "error": "Critical errors that need immediate attention",
  "warn": "Warning messages for potential issues",
  "info": "General information about system operation",
  "debug": "Detailed debugging information"
}
```

### Monitoring Stack

```
Application
    ↓
Sentry (Error Tracking)
    ↓
Winston (Logging)
    ↓
Log Files / Cloud Logging
    ↓
Monitoring Dashboard
```

---

## 🔄 Scalability

### Horizontal Scaling

```
┌─────────────────────────────────────┐
│         Load Balancer               │
└──────────────┬──────────────────────┘
               │
       ┌───────┼───────┐
       │       │       │
┌──────▼──┐ ┌─▼─────┐ ┌▼──────┐
│Backend 1│ │Backend│ │Backend│
│Instance │ │   2   │ │   3   │
└─────────┘ └───────┘ └───────┘
       │       │       │
       └───────┼───────┘
               │
       ┌───────▼───────┐
       │   Database    │
       │   (Primary)   │
       └───────┬───────┘
               │
       ┌───────┼───────┐
       │       │       │
   ┌───▼──┐ ┌─▼────┐ ┌▼─────┐
   │Read  │ │Read  │ │Read  │
   │Replica│ │Replica│ │Replica│
   └──────┘ └──────┘ └──────┘
```

---

## 📝 Design Patterns

### Backend Patterns

- **Module Pattern**: Organize code into separate modules
- **Service Layer**: Separate business logic from controllers
- **Repository Pattern**: Abstract database access
- **Factory Pattern**: Create complex objects
- **Strategy Pattern**: Interchangeable algorithms

### Frontend Patterns

- **Component Composition**: Build UI from small components
- **Custom Hooks**: Reuse logic
- **Render Props**: Share code between components
- **Higher-Order Components**: Enhance components
- **State Management**: Zustand for global state

---

## 🎯 Best Practices

### Code Quality

- ✅ TypeScript Strict Mode
- ✅ ESLint + Prettier
- ✅ Code Reviews
- ✅ Unit Tests
- ✅ Integration Tests

### Security

- ✅ Input Validation
- ✅ SQL Injection Prevention (Prisma)
- ✅ XSS Prevention
- ✅ CSRF Protection
- ✅ Rate Limiting

### Performance

- ✅ Code Splitting
- ✅ Lazy Loading
- ✅ Image Optimization
- ✅ Database Indexing
- ✅ Caching Strategy

---

## 📚 References

- [Fastify Best Practices](https://www.fastify.io/docs/latest/Guides/Getting-Started/)
- [Next.js Architecture](https://nextjs.org/docs/app/building-your-application)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

**Last updated:** December 24, 2025
