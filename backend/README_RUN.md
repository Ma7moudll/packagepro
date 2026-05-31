# 🚀 تشغيل PackagePro Backend

## الخطوات السريعة

### 1. تثبيت Dependencies (تم ✅)
```bash
npm install
```

### 2. توليد Prisma Client (تم ✅)
```bash
npm run prisma:generate
```

### 3. تشغيل الخادم
```bash
npm run dev
```

الخادم سيعمل على: **http://localhost:3000**

## اختبار سريع

### في Terminal جديد:

```bash
# Health Check
curl http://localhost:3000/health

# API Info
curl http://localhost:3000/api

# Materials
curl http://localhost:3000/api/pricing/materials
```

## الملفات المتاحة

- `src/index.ts` - Server الرئيسي
- `QUICK_START.md` - دليل شامل
- `env.example` - مثال على ملف البيئة

## ملاحظات

- **قاعدة البيانات**: يحتاج PostgreSQL أو SQLite
- **Redis**: اختياري - النظام سيعمل بدونه
- **Port**: افتراضي 3000 (يمكن تغييره في .env)

**جاهز للعمل! 🎉**
