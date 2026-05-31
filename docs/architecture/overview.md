# PackagePro Architecture Overview

## System Architecture

PackagePro is built using a microservices-inspired architecture with clear separation between frontend and backend.

### Backend Architecture

- **Framework**: Fastify (high-performance web framework)
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache/Sessions**: Redis
- **Job Queue**: BullMQ
- **File Storage**: AWS S3 / CloudFlare R2

### Frontend Architecture

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + Tailwind CSS
- **State Management**: Zustand + React Query
- **3D Graphics**: Three.js
- **Design Editor**: Fabric.js

## Data Flow

1. **Customer Journey**:
   - Customer creates design → Saves to session → Creates order → Pays → Waits for approval

2. **Processing**:
   - Order reviewed → Pre-press check → Proof generated → Customer approval

3. **Vendor Routing**:
   - Order routed → Vendor selected → Handshake → PO created → Production starts

4. **Fulfillment**:
   - Production → QA → Shipping → Delivery → Settlement

## Key Components

### Services
- Pricing Engine
- Pre-Press Checker
- Vendor Router
- Email Service
- File Processor

### Workers
- Email Queue Worker
- Settlement Queue Worker
- Reminder Queue Worker

### Integrations
- Stripe (Payments)
- DHL Express (Shipping)
- Google Maps (Address validation)
- SendGrid/SES (Email)
