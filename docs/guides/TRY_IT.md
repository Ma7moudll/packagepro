# تجربة PackagePro - Try It! 🚀

## خطوات التشغيل السريع

### 1. تثبيت Dependencies ✅
تم تثبيتها بنجاح!

### 2. توليد Prisma Client ✅
تم توليده بنجاح!

### 3. تشغيل الخادم

#### الطريقة السريعة:
```bash
cd backend
npm run dev
```

الخادم سيعمل على: `http://localhost:3000`

### 4. اختبار النظام

افتح Terminal جديد واختبار:

#### أ) اختبار Health Check:
```bash
curl http://localhost:3000/health
```

#### ب) اختبار API Info:
```bash
curl http://localhost:3000/api
```

#### ج) اختبار Pricing:
```bash
curl http://localhost:3000/api/pricing/materials
```

#### د) تسجيل حساب جديد:
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

#### هـ) تسجيل الدخول:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## ملاحظات مهمة

⚠️ **قاعدة البيانات**: 
- النظام يحتاج قاعدة بيانات (PostgreSQL أو SQLite)
- يمكنك تعديل `prisma/schema.prisma` لاستخدام SQLite للتجربة السريعة

⚠️ **Redis**: 
- اختياري - النظام سيعمل بدونه (بعض الميزات قد لا تعمل)

⚠️ **الخدمات الخارجية**:
- Stripe, DHL, SendGrid اختيارية للتجربة
- النظام سيعمل بدونها لكن بعض الميزات محدودة

## الخطوات التالية

1. **تشغيل الخادم**: `cd backend && npm run dev`
2. **اختبار Health Check**: افتح `http://localhost:3000/health` في المتصفح
3. **تجربة APIs**: استخدم curl أو Postman

## المشاكل المتوقعة

### خطأ في قاعدة البيانات
- قم بتعديل `DATABASE_URL` في `.env` أو استخدم SQLite

### خطأ في Redis
- لا بأس! النظام سيعمل بدون Redis

### Port 3000 مستخدم
- غيّر PORT في `.env` إلى رقم آخر

## ملفات مساعدة

- `backend/test-api.js` - سكريبت اختبار بسيط
- `backend/QUICK_START.md` - دليل التشغيل الكامل

**جاهز للبدء! 🎉**
