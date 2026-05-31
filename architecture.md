## Architecture — هيكل الـ Services (NestJS + Next.js + Three.js)

### الهدف
هذا الملف يشرح **كيف أجزاء النظام متقسمة** وكيف تتكلم مع بعض: Backend (NestJS) + Frontend (Next.js) + طبقة 3D (Three.js عبر React Three Fiber) + خدمات توليد الـ textures وبيانات المنتجات.

---

## 1) نظرة عامة على المونوريبو

- **`backend/` (NestJS)**: API + منطق الأعمال + التكاملات + Jobs/Workers.
- **`frontend/` (Next.js)**: واجهة المستخدم + محرر التصميم 2D/3D + عرض المنتجات + إدارة الحالة.
- **`shared/`**: أنواع/تعريفات مشتركة (Types) بين الواجهة والخلفية عند الحاجة.
- **`docs/`**: توثيق إضافي (موجود مسبقاً).

---

## 2) Backend (NestJS) — طبقات وخدمات

### بنية عامة (مقترحة حسب الموجود)
داخل `backend/src/` غالباً ستجد:

- **`modules/`**: Modules لكل نطاق (Auth/Users/Orders…).
- **`services/`**: خدمات مشتركة (مثل البريد، قوالب Handlebars، إلخ).
- **`integrations/`**: تكاملات خارجية (Gateways / Providers).
- **`workers/`**: أعمال خلفية (Queues/Cron) لو موجودة.
- **`middleware/`**: Middleware عام.
- **`utils/` / `lib/`**: Helpers و Utilities.

### نموذج تدفق الطلب (Request Flow)
Client (Next.js) → API (NestJS Controller) → Service (Business Logic) → DB/Prisma/Integrations → Response

### قواعد مهمة
- **الـ Controller**: رقيق (Validation + call service).
- **الـ Service**: مصدر الحقيقة لمنطق الأعمال.
- **Data access**: عبر Prisma/Repository (حسب الموجود).
- **Workers**: للأعمال الثقيلة (توليد/تصيير/إرسال…).

---

## 3) Frontend (Next.js) — Editor + Rendering

### تقسيم رئيسي
- **`frontend/app/`**: صفحات/Routes (Next App Router).
- **`frontend/components/`**: UI components (بما فيها editor/layout).
- **`frontend/lib/`**: منطق بيانات/خدمات/Generators (مثل texture generator).
- **`frontend/store/`**: إدارة الحالة (حسب التنفيذ الحالي).
- **`frontend/providers/`**: Providers (Theme/Query/State…).

### محرر التصميم (2D/3D)

#### 2D
- طبقة تصميم 2D لتكوين الـ Layers (نصوص/Shapes/Images).
- تصدير طبقات كل وجه (Face) إلى Canvas/Bitmap.

#### 3D (Three.js عبر `@react-three/fiber`)
- **`frontend/components/design-editor/models/BoxModels.tsx`**: نماذج المنتجات (MailerBox/ShippingBox…).
- **`frontend/components/editor/canvas/DesignCanvas3D.tsx`**: إعداد المشهد (Camera/Lighting/Controls) وتركيب النموذج.
- **`frontend/lib/editor/services/texture-generator.ts`**: تحويل Layers → textures لكل وجه، مع تجاهل الأوجه الفارغة لإظهار خامة الكرتون الأساسية.

**فكرة التركيب**:
- الـ Editor ينتج Layers.
- Generator يطلع textures.
- 3D Model يطبق textures على الخامات/الأوجه، ويترك خامة افتراضية للكرتون عندما لا يوجد طباعة.

---

## 4) Three.js Materials & Textures — واقعية الخامات

### ما الذي نحتاجه للواقعية؟
- **`map`**: لون/Texture أساسي (كرتون كرافت/أبيض…).
- **`normalMap`**: ألياف/تموجات لتكسر “الإحساس البلاستيك”.
- **`roughnessMap`**: اختلافات خشونة تمنع “شكل الخشب/اللمعة الغريبة”.
- **`aoMap`**: ظل خفيف في الزوايا يعطي عمق بصري.

### مبادئ تنفيذية
- توليد textures داخل `useMemo` فقط (تجنب إعادة الإنشاء كل render).
- Cache للمواد (Material cache) حسب نوع الخامة/داخل-خارج/جودة… لتحسين الأداء.
- فصل خامة الداخل عن الخارج (الداخل غالباً أفتح وخشن أكثر).

---

## 5) خدمات البيانات (Products/Materials) — مصدر الحقيقة

- **`frontend/lib/editor/data/products-data.ts`**:
  - تعريف المنتجات (Product types) + presets للأحجام + المواد المتاحة.
  - يجب أن يكون هو المرجع الأساسي لما يظهر في الـ UI (مواد/ألوان/أسعار/وصف).

---

## 6) نقاط تكامل مهمة بين الخدمات

### Editor → Texture Generator → 3D
- أي تغيير في الطبقات أو الوجه المختار:
  - يعاد توليد texture لوجه/وجوه محددة.
  - يطبق على نموذج 3D بشكل incremental لتجنب تقطيع الأداء.

### UI/State → 3D Animation
- **`openState`** (0..1) يتحكم في فتح/إغلاق الفلابات.
- easing (مثل `easeInOutCubic`) ضروري لواقعية الحركة.
- ترتيب الإغلاق (sequence) في بعض المنتجات (RSC) يمنع التداخل clipping.

---

## 7) معايير جودة (Quality Bar)

- **الهندسة**: الصندوق “hollow” من الداخل وليس solid block.
- **الفلابات**: pivot على الحافة (edge) وليس من المركز.
- **الإغلاق**: smooth + sequential عند الحاجة.
- **الخامة**: كرتون واضح (ليس خشب/بلاستيك).
- **الأداء**: no texture/material creation داخل render loop.

