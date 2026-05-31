# 🎨 هيكلة Frontend الجديدة

تم إعادة تنظيم مجلد `frontend` لتحسين القابلية للصيانة والتوسع.

## 📁 الهيكل العام

```
frontend/
├── app/                        # Next.js App Router Pages
│   ├── (auth)/                 # صفحات المصادقة (Login, Signup)
│   ├── (marketing)/            # الصفحات التسويقية (About, Contact, etc.)
│   ├── (shop)/                 # صفحات المتجر (Products, Cart, Checkout)
│   ├── (customer)/             # لوحة تحكم العميل (Dashboard, Orders)
│   ├── (business)/             # صفحات الأعمال (B2B, Wholesale)
│   ├── admin/                  # لوحة تحكم المسؤول
│   └── api/                    # API Endpoints (Next.js API Routes)
│
├── components/                 # React Components
│   ├── ui/                     # مكونات واجهة المستخدم الأساسية (Buttons, Inputs)
│   ├── layout/                 # مكونات تخطيط الصفحة (Navbar, Footer)
│   ├── features/               # مكونات الميزات المحددة (LiveChat, Analytics)
│   └── ...                     # مكونات أخرى
│
├── providers/                  # Context Providers (Auth, Theme, etc.)
│
├── lib/                        # Utilities & Libraries
│   ├── api.ts                  # Axios Client الموحد
│   └── utils.ts                # أدوات مساعدة عامة
│
├── store/                      # State Management (Zustand)
│   └── auth-store.ts           # مخزن حالة المصادقة
│
├── hooks/                      # Custom React Hooks
└── types/                      # TypeScript Types
```

## 🚀 التغييرات الرئيسية

1. **Route Groups**: تم استخدام مجموعات المسارات `(group)` لتنظيم الصفحات منطقياً دون التأثير على URL.
   - مثال: `frontend/app/(shop)/products` يظهر في المتصفح كـ `/products`.

2. **Components Organization**: تم نقل المكونات من `app/components` إلى المجلد الرئيسي `components/` وتقسيمها إلى `layout` و `features`.

3. **Providers**: تم تجميع جميع Providers في مجلد `providers/`.

4. **API & State**:
   - تم إضافة `lib/api.ts` للتعامل مع الطلبات بشكل مركزي.
   - تم إضافة `store/auth-store.ts` لإدارة حالة المصادقة.

## 💡 كيفية الاستخدام

### إضافة صفحة جديدة
- إذا كانت صفحة عامة: أضفها إلى `(marketing)`.
- إذا كانت متعلقة بالمتجر: أضفها إلى `(shop)`.
- إذا كانت لوحة تحكم: أضفها إلى `(customer)`.

### إضافة مكون جديد
- إذا كان عاماً (زر، حقل إدخال): `components/ui`.
- إذا كان جزءاً من التخطيط (قائمة جانبية): `components/layout`.
- إذا كان ميزة مستقلة (شات، خريطة): `components/features`.

### استدعاء API
استخدم `api` من `@/lib/api`:

```typescript
import { api } from '@/lib/api';

const fetchData = async () => {
  const response = await api.get('/endpoint');
  return response.data;
};
```
