# دعم معاملات URL في المحرر - Packhelp Style

تم إضافة دعم معاملات URL في محرر التصميم ليكون مشابهاً لـ [Packhelp Editor](https://packhelp.com/editor/).

## 📋 معاملات URL المدعومة

### 1. SKU (Stock Keeping Unit)
**المعامل**: `sku`

**الصيغة**: `category--type--size--material--print--foil`

**مثال**: 
```
box--mailer-box--23--cardboard-natural--print-monochrome--foil-none
```

**الأجزاء**:
- `category`: نوع المنتج (box, bag, cup, tube)
- `type`: نوع التغليف (mailer-box, gift-box, etc.)
- `size`: الحجم (23, 32, etc.)
- `material`: المادة (cardboard-natural, cardboard-white, kraft, corrugated)
- `print`: نوع الطباعة (print-monochrome, print-full-color, print-none)
- `foil`: نوع الفويل (foil-none, foil-gold, foil-silver, foil-rose)

### 2. Source
**المعامل**: `source`

**القيم المحتملة**: `editor`, `product-page`, etc.

**الاستخدام**: لتتبع مصدر دخول المستخدم للمحرر

### 3. Composed Product ID
**المعامل**: `composed_product_id`

**القيم**: رقم معرف المنتج المركب

**الاستخدام**: لتحديد المنتج المكون مسبقاً

## 🔧 التطبيق

### قراءة المعاملات
يتم قراءة معاملات URL تلقائياً عند تحميل الصفحة:

```typescript
const searchParams = useSearchParams()
const skuParam = searchParams.get("sku")
const sourceParam = searchParams.get("source")
const composedProductId = searchParams.get("composed_product_id")
```

### تحليل SKU
يتم تحليل SKU إلى مكوناته:

```typescript
function parseSKU(sku: string) {
  const parts = sku.split("--")
  return {
    category: parts[0] || "box",
    type: parts[1] || "mailer-box",
    size: parts[2] || "23",
    material: parts[3] || "cardboard-natural",
    print: parts[4] || "print-monochrome",
    foil: parts[5] || "foil-none",
  }
}
```

### تطبيق الإعدادات
عند وجود SKU في URL، يتم تطبيق الإعدادات تلقائياً:

```typescript
useEffect(() => {
  if (skuData) {
    setProductType(skuData.category as any)
    setProductConfig({
      type: skuData.type,
      size: skuData.size,
      material: skuData.material,
      print: skuData.print,
      foil: skuData.foil,
    })
  }
}, [skuParam, skuData])
```

## 📝 أمثلة على الروابط

### مثال 1: صندوق بريد عادي
```
/editor?sku=box--mailer-box--23--cardboard-natural--print-monochrome--foil-none&source=editor&composed_product_id=1
```

### مثال 2: صندوق هدايا مع فويل ذهبي
```
/editor?sku=box--gift-box--32--cardboard-white--print-full-color--foil-gold
```

### مثال 3: كيس مع طباعة ملونة
```
/editor?sku=bag--shopping-bag--large--kraft--print-full-color--foil-none
```

## 🎨 خيارات التصميم

### المواد (Materials)
- `cardboard-natural` - كرتون طبيعي
- `cardboard-white` - كرتون أبيض
- `kraft` - كرافت
- `corrugated` - مموج

### الطباعة (Print)
- `print-monochrome` - طباعة أحادية اللون
- `print-full-color` - طباعة ملونة كاملة
- `print-none` - بدون طباعة

### الفويل (Foil)
- `foil-none` - بدون فويل
- `foil-gold` - فويل ذهبي
- `foil-silver` - فويل فضي
- `foil-rose` - فويل وردي

## 🔄 التحديث التلقائي

عند تغيير معاملات URL:
1. يتم تحليل SKU الجديد
2. يتم تحديث نوع المنتج
3. يتم تحديث إعدادات التصميم
4. يتم تحديث الواجهة تلقائياً

## 📚 الملفات المُعدلة

- `frontend/app/editor/page.tsx` - إضافة دعم معاملات URL

---

**تاريخ الإضافة**: الآن  
**الحالة**: ✅ جاهز للاستخدام

