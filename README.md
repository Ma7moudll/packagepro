# PackagePro - Complete System

منصة PackagePro الكاملة لإدارة الطلبات والتغليف المخصص.

[![CI/CD](https://github.com/packagepro/packagepro/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/packagepro/packagepro/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4-green)](https://www.fastify.io/)

## 🚀 Quick Start

**الطريقة الأسرع للبدء:**

```bash
# 1. Clone المشروع
git clone https://github.com/your-repo/packagepro.git
cd packagepro

# 2. تشغيل Setup Script
chmod +x scripts/setup.sh
./scripts/setup.sh

# 3. تشغيل المشروع
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && npm run dev
```

**الوصول إلى التطبيق:**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api
- Database Studio: `cd backend && npm run prisma:studio`

## 📚 Documentation

- 📊 **[PROJECT_REVIEW.md](docs/PROJECT_REVIEW.md)** - مراجعة شاملة للمشروع
- 📋 **[ACTION_PLAN.md](docs/guides/ACTION_PLAN.md)** - خطة العمل التنفيذية
- ⚡ **[QUICK_SUMMARY.md](docs/QUICK_SUMMARY.md)** - ملخص سريع
- 🧪 **[TESTING_GUIDE.md](docs/guides/TESTING_GUIDE.md)** - دليل الاختبارات
- 🚀 **[DEPLOYMENT_GUIDE.md](docs/guides/DEPLOYMENT_GUIDE.md)** - دليل النشر
- 🤝 **[CONTRIBUTING.md](CONTRIBUTING.md)** - دليل المساهمة
- 🏗️ **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - توثيق المعمارية
- ✅ **[COMPLETION_SUMMARY.md](docs/guides/COMPLETION_SUMMARY.md)** - ملخص الإنجازات

## Project Structure

```
packagepro/
├── backend/          # Fastify + TypeScript Backend
├── frontend/         # Next.js 14 Frontend
├── shared/           # Shared types and utilities
├── docs/             # Documentation
├── .github/          # GitHub Actions & Workflows
└── *.md              # Documentation files
```

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up database:
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

5. Start development server:
```bash
npm run dev
```

Backend will run on `http://localhost:3000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

4. Start development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:3001`

## API Documentation

API endpoints are available at `/api`. Main endpoints:

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token

### Pricing
- `POST /api/pricing/calculate` - Calculate price
- `GET /api/pricing/materials` - Get materials

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order
- `GET /api/orders` - List orders
- `PATCH /api/orders/:id/status` - Update order status

### Designs
- `POST /api/designs/session` - Create design session
- `POST /api/designs/save` - Save design
- `GET /api/designs/:id` - Get design

### Payments
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/confirm` - Confirm payment
- `POST /api/webhooks/stripe` - Stripe webhook

### Pre-Press & Approval
- `POST /api/orders/:id/prepress-check` - Run pre-press check
- `GET /api/orders/:id/prepress-results` - Get check results
- `POST /api/orders/:id/request-approval` - Request approval
- `POST /api/orders/:id/approve` - Approve order

### Purchase Orders
- `POST /api/orders/:id/create-po` - Create purchase order
- `GET /api/purchase-orders/:id` - Get PO details
- `POST /api/purchase-orders/:id/confirm` - Confirm PO

### Production
- `POST /api/production/start/:poId` - Start production
- `POST /api/production/:id/progress` - Update progress
- `GET /api/production/:id` - Get production details

### Samples & QA
- `POST /api/production/:productionId/samples` - Upload samples
- `POST /api/samples/:id/approve` - Approve sample
- `POST /api/samples/:id/reject` - Reject sample

### Shipping
- `POST /api/shipments/create/:id` - Create shipment
- `GET /api/shipments/:id/tracking` - Get tracking info
- `POST /api/webhooks/dhl` - DHL webhook

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/order/:orderId` - Get order review
- `GET /api/vendors/:id/reviews` - Get vendor reviews

### Settlements & Finance
- `POST /api/settlements/process/:id` - Process settlement
- `GET /api/vendors/:id/payments` - Get vendor payments
- `GET /api/finance/reports` - Financial reports

## Key Features

### ✅ Phase 1-2: Foundation
- Comprehensive Prisma Database Schema
- Fastify Backend Infrastructure
- JWT Authentication & Authorization
- Redis & PostgreSQL Setup

### ✅ Phase 3: Customer Journey
- Dynamic Pricing Engine with Real-time Calculations
- Design Session Management
- Order Creation & Management
- Stripe Payment Integration with Webhooks

### ✅ Phase 4: Intelligent Processing
- Pre-Press Quality Checker (Resolution, Color Mode, etc.)
- Soft Proof Generation (PDF with Watermark)
- Approval Workflow with Email Reminders
- Auto-cancel after 7 days

### ✅ Phase 5: Routing & Procurement
- Smart Vendor Router with Multi-criteria Scoring
- Handshake System (4-hour response window)
- Purchase Order Generation (PDF)
- Vendor Confirmation Tracking

### ✅ Phase 6: Production & QA
- Production Management & Progress Tracking
- Sample Upload & Approval Workflow
- Quality Assurance Checklist System

### ✅ Phase 7: Fulfillment & Logistics
- DHL Express API Integration
- Automated Shipping Label Generation
- Real-time Tracking System
- Webhook-based Status Updates

### ✅ Phase 8: Financial Closure
- Settlement System (72-hour verification)
- Customer Review System (Multi-criteria Ratings)
- Financial Reporting & Analytics

### ✅ Phase 9: Continuous Improvement
- Analytics & Data Collection
- Marketing Automation (Email Sequences)
- System Optimization Service

### ✅ Phase 11-12: Services
- Email Service (SendGrid/SES) with Templates
- File Upload & Processing (S3/R2)
- RGB to CMYK Conversion
- Image Optimization

### ✅ Phase 13-14: Testing & Documentation
- Testing Setup (Vitest)
- Comprehensive Documentation

## Technology Stack

### Backend
- Fastify (web framework)
- Prisma (ORM)
- PostgreSQL (database)
- Redis (caching/sessions)
- BullMQ (job queues)
- Stripe (payments)
- AWS S3 / CloudFlare R2 (file storage)

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Three.js (3D preview)
- Fabric.js (design editor)

## Environment Variables

See `backend/.env.example` for all required environment variables.

## License

MIT
