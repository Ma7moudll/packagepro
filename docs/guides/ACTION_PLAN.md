# 📋 خطة العمل - PackagePro

**تاريخ الإنشاء:** 24 ديسمبر 2025  
**الحالة:** جاهز للتنفيذ  
**الأولوية:** عالية

---

## 🎯 المرحلة 1: الإعداد الأساسي (يوم 1-2)

### ✅ المهمة 1.1: إعداد قاعدة البيانات

#### الخطوات:
```bash
# 1. الانتقال إلى مجلد Backend
cd /Users/mac/packagepro/backend

# 2. نسخ ملف البيئة
cp env.example .env

# 3. تعديل .env (افتح في محرر نصوص)
# DATABASE_URL="postgresql://packagepro:packagepro123@localhost:5432/packagepro?schema=public"
# REDIS_URL="redis://localhost:6379"
# JWT_SECRET="your-secret-key-here"
# JWT_REFRESH_SECRET="your-refresh-secret-key-here"

# 4. تشغيل Docker Compose (PostgreSQL + Redis)
cd /Users/mac/packagepro
docker-compose up -d postgres redis

# 5. الانتظار حتى يصبح PostgreSQL جاهزاً (10 ثواني)
sleep 10

# 6. توليد Prisma Client
cd backend
npm run prisma:generate

# 7. تطبيق Migrations
npm run prisma:migrate

# 8. ملء قاعدة البيانات ببيانات تجريبية
npm run prisma:seed
```

#### التحقق:
```bash
# التحقق من PostgreSQL
docker ps | grep postgres

# التحقق من Prisma
npm run prisma:studio
# يجب أن يفتح متصفح على http://localhost:5555
```

**الوقت المتوقع:** 30 دقيقة  
**الأولوية:** 🔴 عالية جداً

---

### ✅ المهمة 1.2: تشغيل Backend

#### الخطوات:
```bash
# 1. الانتقال إلى Backend
cd /Users/mac/packagepro/backend

# 2. تثبيت Dependencies (إذا لم يتم)
npm install

# 3. تشغيل Development Server
npm run dev

# يجب أن ترى:
# Server listening on http://0.0.0.0:3000
```

#### التحقق:
```bash
# في Terminal جديد
# 1. Health Check
curl http://localhost:3000/health

# 2. API Info
curl http://localhost:3000/api

# 3. Materials List
curl http://localhost:3000/api/pricing/materials
```

**الوقت المتوقع:** 15 دقيقة  
**الأولوية:** 🔴 عالية جداً

---

### ✅ المهمة 1.3: تشغيل Frontend

#### الخطوات:
```bash
# 1. الانتقال إلى Frontend (Terminal جديد)
cd /Users/mac/packagepro/frontend

# 2. تثبيت Dependencies (إذا لم يتم)
npm install

# 3. إنشاء .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local

# 4. تشغيل Development Server
npm run dev

# يجب أن ترى:
# ▲ Next.js 14.1.0
# - Local:        http://localhost:3001
```

#### التحقق:
```bash
# افتح المتصفح على:
# http://localhost:3001
```

**الوقت المتوقع:** 15 دقيقة  
**الأولوية:** 🔴 عالية جداً

---

## 🔐 المرحلة 2: إكمال Authentication (يوم 3-5)

### ✅ المهمة 2.1: إصلاح TODOs في Auth

#### الملفات المطلوب تعديلها:

1. **Frontend: `/frontend/app/api/auth/signup/route.ts`**
   - [ ] إكمال تكامل قاعدة البيانات
   - [ ] إضافة Email Verification
   - [ ] إضافة Validation

2. **Frontend: `/frontend/app/api/auth/reset-password/route.ts`**
   - [ ] التحقق من المستخدم في قاعدة البيانات
   - [ ] إرسال Email مع رابط إعادة التعيين
   - [ ] إضافة Token Expiry

3. **Frontend: `/frontend/lib/auth/config.ts`**
   - [ ] استبدال Mock Data بـ Database Query
   - [ ] إضافة Session Management
   - [ ] إضافة Role-based Access Control

#### الأوامر:
```bash
# 1. فحص جميع TODOs في Auth
cd /Users/mac/packagepro/frontend
grep -r "TODO" app/api/auth/ --include="*.ts"

# 2. فتح الملفات في VS Code
code app/api/auth/signup/route.ts
code app/api/auth/reset-password/route.ts
code lib/auth/config.ts
```

**الوقت المتوقع:** 2-3 أيام  
**الأولوية:** 🔴 عالية

---

### ✅ المهمة 2.2: إضافة Email Service

#### الخطوات:

1. **اختيار Email Provider:**
   - SendGrid (موصى به)
   - AWS SES
   - Nodemailer + SMTP

2. **إعداد SendGrid:**
```bash
# 1. تسجيل في SendGrid
# https://sendgrid.com/

# 2. الحصول على API Key

# 3. إضافة إلى .env
echo "SENDGRID_API_KEY=your-api-key-here" >> backend/.env
echo "EMAIL_FROM=noreply@packagepro.com" >> backend/.env
```

3. **إنشاء Email Templates:**
```bash
# إنشاء مجلد Templates
mkdir -p backend/src/templates/emails

# إنشاء Templates
# - welcome.hbs
# - reset-password.hbs
# - order-confirmation.hbs
# - etc.
```

**الوقت المتوقع:** 1 يوم  
**الأولوية:** 🟡 متوسطة

---

## 🧪 المرحلة 3: إضافة Testing (يوم 6-8)

### ✅ المهمة 3.1: Backend Unit Tests

#### الخطوات:
```bash
# 1. الانتقال إلى Backend
cd /Users/mac/packagepro/backend

# 2. إنشاء مجلد Tests
mkdir -p src/__tests__/modules
mkdir -p src/__tests__/services

# 3. إنشاء أول Test
cat > src/__tests__/modules/auth.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';

describe('Auth Module', () => {
  it('should register a new user', async () => {
    // TODO: Implement test
    expect(true).toBe(true);
  });

  it('should login with valid credentials', async () => {
    // TODO: Implement test
    expect(true).toBe(true);
  });
});
EOF

# 4. تشغيل Tests
npm run test
```

**الوقت المتوقع:** 2 أيام  
**الأولوية:** 🟡 متوسطة

---

### ✅ المهمة 3.2: Frontend Component Tests

#### الخطوات:
```bash
# 1. تثبيت Testing Libraries
cd /Users/mac/packagepro/frontend
npm install -D @testing-library/react @testing-library/jest-dom vitest @vitejs/plugin-react

# 2. إنشاء Vitest Config
cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
EOF

# 3. إنشاء Setup File
cat > vitest.setup.ts << 'EOF'
import '@testing-library/jest-dom';
EOF

# 4. إنشاء أول Test
mkdir -p components/__tests__
cat > components/__tests__/Button.test.tsx << 'EOF'
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import { describe, it, expect } from 'vitest';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
EOF

# 5. تشغيل Tests
npm run test
```

**الوقت المتوقع:** 1 يوم  
**الأولوية:** 🟡 متوسطة

---

## 📊 المرحلة 4: Monitoring & Logging (يوم 9-10)

### ✅ المهمة 4.1: إعداد Sentry

#### الخطوات:
```bash
# 1. تسجيل في Sentry
# https://sentry.io/

# 2. إنشاء مشروع جديد
# - اختر Next.js للـ Frontend
# - اختر Node.js للـ Backend

# 3. الحصول على DSN

# 4. إضافة إلى .env
echo "SENTRY_DSN=your-dsn-here" >> backend/.env
echo "NEXT_PUBLIC_SENTRY_DSN=your-dsn-here" >> frontend/.env.local

# 5. Frontend - Sentry موجود بالفعل
cd /Users/mac/packagepro/frontend
# تحديث sentry.client.config.ts و sentry.server.config.ts

# 6. Backend - إضافة Sentry
cd /Users/mac/packagepro/backend
npm install @sentry/node @sentry/profiling-node
```

**الوقت المتوقع:** 4 ساعات  
**الأولوية:** 🟡 متوسطة

---

### ✅ المهمة 4.2: تحسين Logging

#### الخطوات:
```bash
# 1. تثبيت Winston
cd /Users/mac/packagepro/backend
npm install winston winston-daily-rotate-file

# 2. إنشاء Logger Configuration
cat > src/lib/logger.ts << 'EOF'
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

export { logger };
EOF

# 3. استخدام Logger في الكود
# استبدال console.log بـ logger.info
# استبدال console.error بـ logger.error
```

**الوقت المتوقع:** 2 ساعات  
**الأولوية:** 🟢 منخفضة

---

## 🚀 المرحلة 5: Performance Optimization (يوم 11-12)

### ✅ المهمة 5.1: تحليل Bundle Size

#### الخطوات:
```bash
# 1. تثبيت Bundle Analyzer
cd /Users/mac/packagepro/frontend
npm install -D @next/bundle-analyzer

# 2. تحديث next.config.js
cat >> next.config.js << 'EOF'

// Bundle Analyzer
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(module.exports);
EOF

# 3. تحليل Bundle
ANALYZE=true npm run build

# 4. فتح التقرير في المتصفح
# http://localhost:8888
```

**الوقت المتوقع:** 2 ساعات  
**الأولوية:** 🟡 متوسطة

---

### ✅ المهمة 5.2: Code Splitting

#### الخطوات:
```bash
# 1. استخدام Dynamic Imports للمكونات الثقيلة
# مثال: Three.js, Fabric.js, PDF.js

# في الملفات التي تستخدم هذه المكتبات:
# استبدال:
# import { Canvas } from '@react-three/fiber';

# بـ:
# const Canvas = dynamic(() => import('@react-three/fiber').then(mod => ({ default: mod.Canvas })), {
#   ssr: false,
#   loading: () => <div>Loading 3D...</div>
# });
```

**الوقت المتوقع:** 4 ساعات  
**الأولوية:** 🟡 متوسطة

---

## 🔒 المرحلة 6: Security Improvements (يوم 13-14)

### ✅ المهمة 6.1: إضافة Security Headers

#### الخطوات:
```bash
# 1. Backend - إضافة Helmet
cd /Users/mac/packagepro/backend
npm install @fastify/helmet

# 2. تسجيل Plugin
# في src/index.ts
# await server.register(helmet);

# 3. Frontend - تحديث next.config.js
# إضافة headers في next.config.js
```

**الوقت المتوقع:** 2 ساعات  
**الأولوية:** 🔴 عالية

---

### ✅ المهمة 6.2: Dependency Audit

#### الخطوات:
```bash
# 1. Backend Audit
cd /Users/mac/packagepro/backend
npm audit
npm audit fix

# 2. Frontend Audit
cd /Users/mac/packagepro/frontend
npm audit
npm audit fix

# 3. إعداد Dependabot
# إنشاء .github/dependabot.yml
mkdir -p /Users/mac/packagepro/.github
cat > /Users/mac/packagepro/.github/dependabot.yml << 'EOF'
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/backend"
    schedule:
      interval: "weekly"
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
EOF
```

**الوقت المتوقع:** 1 ساعة  
**الأولوية:** 🔴 عالية

---

## 📝 المرحلة 7: Documentation (يوم 15-16)

### ✅ المهمة 7.1: إضافة Swagger/OpenAPI

#### الخطوات:
```bash
# 1. تثبيت Swagger
cd /Users/mac/packagepro/backend
npm install @fastify/swagger @fastify/swagger-ui

# 2. إعداد Swagger
# في src/index.ts
# await server.register(swagger, {
#   swagger: {
#     info: {
#       title: 'PackagePro API',
#       version: '1.0.0'
#     }
#   }
# });
# await server.register(swaggerUi, {
#   routePrefix: '/documentation'
# });

# 3. الوصول إلى Documentation
# http://localhost:3000/documentation
```

**الوقت المتوقع:** 4 ساعات  
**الأولوية:** 🟡 متوسطة

---

### ✅ المهمة 7.2: إنشاء Architecture Diagrams

#### الخطوات:
```bash
# 1. استخدام Mermaid أو draw.io

# 2. إنشاء Diagrams
# - System Architecture
# - Database ERD
# - API Flow
# - User Journey

# 3. إضافة إلى docs/
mkdir -p /Users/mac/packagepro/docs/diagrams
```

**الوقت المتوقع:** 4 ساعات  
**الأولوية:** 🟢 منخفضة

---

## 🔄 المرحلة 8: CI/CD (يوم 17-18)

### ✅ المهمة 8.1: إعداد GitHub Actions

#### الخطوات:
```bash
# 1. إنشاء Workflow
mkdir -p /Users/mac/packagepro/.github/workflows

# 2. إنشاء CI Workflow
cat > /Users/mac/packagepro/.github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: cd backend && npm ci
      - name: Run tests
        run: cd backend && npm test
      - name: Run linter
        run: cd backend && npm run lint

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Run tests
        run: cd frontend && npm test
      - name: Build
        run: cd frontend && npm run build
EOF
```

**الوقت المتوقع:** 4 ساعات  
**الأولوية:** 🟡 متوسطة

---

## 📈 ملخص الجدول الزمني

| المرحلة | المدة | الأولوية | الحالة |
|---------|-------|----------|--------|
| 1. الإعداد الأساسي | يوم 1-2 | 🔴 عالية جداً | ⏳ قيد الانتظار |
| 2. Authentication | يوم 3-5 | 🔴 عالية | ⏳ قيد الانتظار |
| 3. Testing | يوم 6-8 | 🟡 متوسطة | ⏳ قيد الانتظار |
| 4. Monitoring | يوم 9-10 | 🟡 متوسطة | ⏳ قيد الانتظار |
| 5. Performance | يوم 11-12 | 🟡 متوسطة | ⏳ قيد الانتظار |
| 6. Security | يوم 13-14 | 🔴 عالية | ⏳ قيد الانتظار |
| 7. Documentation | يوم 15-16 | 🟢 منخفضة | ⏳ قيد الانتظار |
| 8. CI/CD | يوم 17-18 | 🟡 متوسطة | ⏳ قيد الانتظار |

**إجمالي الوقت المتوقع:** 18 يوم عمل (حوالي 3-4 أسابيع)

---

## ✅ Checklist سريع

### اليوم الأول
- [ ] إعداد قاعدة البيانات
- [ ] تشغيل Backend
- [ ] تشغيل Frontend
- [ ] اختبار جميع Endpoints الأساسية

### الأسبوع الأول
- [ ] إكمال Authentication
- [ ] إضافة Email Service
- [ ] إضافة Basic Tests
- [ ] إعداد Sentry

### الأسبوع الثاني
- [ ] تحسين Performance
- [ ] إضافة Security Headers
- [ ] Dependency Audit
- [ ] إضافة Swagger

### الأسبوع الثالث
- [ ] إعداد CI/CD
- [ ] إكمال Documentation
- [ ] Code Review شامل
- [ ] الاستعداد للإطلاق

---

## 🆘 المساعدة والدعم

إذا واجهت أي مشاكل:

1. **مشاكل قاعدة البيانات:**
   ```bash
   # إعادة تعيين قاعدة البيانات
   cd backend
   npm run prisma:migrate reset
   ```

2. **مشاكل Dependencies:**
   ```bash
   # حذف node_modules وإعادة التثبيت
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **مشاكل Docker:**
   ```bash
   # إعادة تشغيل Containers
   docker-compose down
   docker-compose up -d
   ```

---

**ملاحظة:** هذه الخطة مرنة ويمكن تعديلها حسب الأولويات والظروف.

**حظاً موفقاً! 🚀**
