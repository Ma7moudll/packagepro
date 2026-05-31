# 🚀 كيفية تشغيل المشروع PackagePro

## ✅ التحقق النهائي

### Backend Status
- ✅ يعمل على: `http://localhost:3000`
- ✅ Health check: `/health`
- ✅ API: `/api`

### Frontend Status
- ✅ يعمل على: `http://localhost:3001`
- ✅ Home: `/`
- ✅ Login: `/login`
- ✅ Register: `/register`
- ✅ Dashboard: `/dashboard`

---

## 📋 خطوات التشغيل

### 1. تشغيل Backend

```bash
cd backend
npm install  # إذا لم يتم التثبيت بعد
npm run dev
```

**Backend سيعمل على:** `http://localhost:3000`

### 2. تشغيل Frontend

**في Terminal جديد:**

```bash
cd frontend
npm install  # إذا لم يتم التثبيت بعد
npm run dev
```

**Frontend سيعمل على:** `http://localhost:3001`

---

## 🌐 الوصول إلى التطبيق

### Backend API
- **Health Check**: http://localhost:3000/health
- **API Info**: http://localhost:3000/api
- **API Endpoints**: http://localhost:3000/api/*

### Frontend Pages
- **Home**: http://localhost:3001
- **Login**: http://localhost:3001/login
- **Register**: http://localhost:3001/register
- **Dashboard**: http://localhost:3001/dashboard

---

## ✅ التحقق من التشغيل

### اختبار Backend:
```bash
curl http://localhost:3000/health
```

يجب أن تحصل على:
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": ...
}
```

### اختبار Frontend:
افتح المتصفح على: http://localhost:3001

يجب أن ترى صفحة PackagePro الرئيسية.

---

## 🔧 المشاكل المحتملة

### Backend لا يعمل:
1. تحقق من أن PostgreSQL يعمل
2. تحقق من ملف `.env`
3. تحقق من logs: `cd backend && npm run dev`

### Frontend لا يعمل:
1. تأكد من تثبيت dependencies: `cd frontend && npm install`
2. تحقق من أن port 3001 متاح
3. تحقق من logs في Terminal

### Port Conflicts:
- Backend يستخدم port 3000
- Frontend يستخدم port 3001
- إذا كان أي من المنافذ مستخدم، غيّر المنفذ في:
  - Backend: `.env` file (PORT=3000)
  - Frontend: `package.json` scripts

---

## 📝 ملاحظات

1. **Redis**: اختياري - النظام يعمل بدونه
2. **Database**: يحتاج PostgreSQL أو SQLite
3. **Environment Variables**: راجع `backend/.env.example`

---

## ✅ الحالة النهائية

- ✅ Backend: جاهز ويعمل
- ✅ Frontend: جاهز ويعمل
- ✅ جميع الصفحات: متاحة
- ✅ API Integration: متصل

**المشروع جاهز للعمل! 🎉**

