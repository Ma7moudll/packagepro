# Quick Start Guide - PackagePro

## خطوات التشغيل السريع

### 1. تثبيت الـ Dependencies

```bash
cd backend
npm install
```

### 2. إعداد قاعدة البيانات

#### خيار 1: استخدام SQLite (للاختبار السريع)

عدّل `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

ثم قم بـ:
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

#### خيار 2: استخدام PostgreSQL (للإنتاج)

1. تأكد من تثبيت PostgreSQL
2. أنشئ قاعدة بيانات:
```sql
CREATE DATABASE packagepro;
```

3. حدّث `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/packagepro?schema=public"
```

4. قم بـ:
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 3. إعداد Redis (اختياري للتجربة)

Redis اختياري للتجربة. النظام سيعمل بدون Redis ولكن بعض الميزات قد لا تعمل:
- Sessions
- Background Jobs
- Caching

لتثبيت Redis:
```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

### 4. إعداد ملف .env

انسخ `env.example` إلى `.env`:
```bash
cp env.example .env
```

عدّل القيم المطلوبة (يمكنك ترك معظمها فارغة للتجربة).

### 5. تشغيل الخادم

```bash
npm run dev
```

الخادم سيعمل على: `http://localhost:3000`

### 6. اختبار النظام

#### اختبار Health Check:
```bash
curl http://localhost:3000/health
```

#### اختبار API:
```bash
curl http://localhost:3000/api
```

#### تسجيل حساب جديد:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

#### تسجيل الدخول:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 7. تشغيل Frontend (اختياري)

```bash
cd ../frontend
npm install
npm run dev
```

Frontend سيعمل على: `http://localhost:3001`

## ملاحظات

- بعض الميزات تحتاج إلى خدمات خارجية (Stripe, DHL, SendGrid) - يمكنك تركها فارغة للتجربة
- Redis اختياري - النظام سيعمل بدونها
- للتجربة السريعة، استخدم SQLite بدلاً من PostgreSQL

## المشاكل الشائعة

### خطأ في الاتصال بقاعدة البيانات
- تأكد من أن PostgreSQL يعمل أو استخدم SQLite
- تحقق من `DATABASE_URL` في `.env`

### خطأ في Redis
- يمكنك إيقاف Redis - النظام سيعمل بدونها (بعض الميزات قد لا تعمل)

### خطأ في Port 3000
- غيّر `PORT` في `.env` إلى رقم آخر
