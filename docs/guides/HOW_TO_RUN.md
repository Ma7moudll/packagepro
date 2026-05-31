# كيفية تشغيل PackagePro 🚀

## ✅ الخطوات السريعة

### 1. تثبيت Dependencies (تم ✅)
```bash
cd backend
npm install
```

### 2. توليد Prisma Client (تم ✅)
```bash
npm run prisma:generate
```

### 3. تشغيل الخادم 🚀

#### الطريقة 1: باستخدام سكريبت التشغيل
```bash
cd /Users/mac/packagepro
./START_SERVER.sh
```

#### الطريقة 2: مباشرة
```bash
cd backend
npm run dev
```

### 4. اختبار النظام

افتح Terminal جديد واختبر:

#### ✅ Health Check:
```bash
curl http://localhost:3000/health
```

#### ✅ API Info:
```bash
curl http://localhost:3000/api
```

#### ✅ Pricing Materials:
```bash
curl http://localhost:3000/api/pricing/materials
```

#### ✅ Register User:
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

## 📝 ملاحظات

⚠️ **قاعدة البيانات**: النظام يحتاج قاعدة بيانات. يمكنك:
- استخدام SQLite للتجربة السريعة (عدّل `schema.prisma`)
- أو استخدام PostgreSQL للإنتاج

⚠️ **Redis**: اختياري - النظام سيعمل بدونه

⚠️ **الخدمات الخارجية**: Stripe, DHL, SendGrid اختيارية للتجربة

## 🎯 Endpoints المتاحة

بعد تشغيل الخادم، ستجد:

- `GET /health` - Health check
- `GET /api` - API info
- `GET /api/pricing/materials` - Materials list
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- ... وأكثر من 60 endpoint آخر!

## 📚 للمزيد من المعلومات

- `backend/QUICK_START.md` - دليل التشغيل الكامل
- `TRY_IT.md` - خطوات التجربة
- `docs/api/ENDPOINTS.md` - جميع الـ APIs

**جاهز للبدء! 🎉**
