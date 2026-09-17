# URL Parameter Support in the Editor - Packhelp Style

URL parameter support was added to the design editor, similar to the [Packhelp Editor](https://packhelp.com/editor/).

## 📋 Supported URL Parameters

### 1. SKU (Stock Keeping Unit)
**Parameter**: `sku`

**Format**: `category--type--size--material--print--foil`

**Example**: 
```
box--mailer-box--23--cardboard-natural--print-monochrome--foil-none
```

**Parts**:
- `category`: Product type (box, bag, cup, tube)
- `type`: Packaging type (mailer-box, gift-box, etc.)
- `size`: Size (23, 32, etc.)
- `material`: Material (cardboard-natural, cardboard-white, kraft, corrugated)
- `print`: Print type (print-monochrome, print-full-color, print-none)
- `foil`: Foil type (foil-none, foil-gold, foil-silver, foil-rose)

### 2. Source
**Parameter**: `source`

**Possible values**: `editor`, `product-page`, etc.

**Usage**: To track how the user entered the editor

### 3. Composed Product ID
**Parameter**: `composed_product_id`

**Values**: The ID of the composed product

**Usage**: To identify the pre-configured product

## 🔧 Implementation

### Reading the Parameters
URL parameters are read automatically when the page loads:

```typescript
const searchParams = useSearchParams()
const skuParam = searchParams.get("sku")
const sourceParam = searchParams.get("source")
const composedProductId = searchParams.get("composed_product_id")
```

### Parsing the SKU
The SKU is parsed into its components:

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

### Applying the Settings
When an SKU is present in the URL, the settings are applied automatically:

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

## 📝 URL Examples

### Example 1: Plain Mailer Box
```
/editor?sku=box--mailer-box--23--cardboard-natural--print-monochrome--foil-none&source=editor&composed_product_id=1
```

### Example 2: Gift Box with Gold Foil
```
/editor?sku=box--gift-box--32--cardboard-white--print-full-color--foil-gold
```

### Example 3: Bag with Full-Color Print
```
/editor?sku=bag--shopping-bag--large--kraft--print-full-color--foil-none
```

## 🎨 Design Options

### Materials
- `cardboard-natural` - natural cardboard
- `cardboard-white` - white cardboard
- `kraft` - kraft
- `corrugated` - corrugated

### Print
- `print-monochrome` - monochrome printing
- `print-full-color` - full-color printing
- `print-none` - no printing

### Foil
- `foil-none` - no foil
- `foil-gold` - gold foil
- `foil-silver` - silver foil
- `foil-rose` - rose foil

## 🔄 Automatic Updates

When URL parameters change:
1. The new SKU is parsed
2. The product type is updated
3. The design settings are updated
4. The interface updates automatically

## 📚 Modified Files

- `frontend/app/editor/page.tsx` - added URL parameter support

---

**Date added**: Now  
**Status**: ✅ Ready to use