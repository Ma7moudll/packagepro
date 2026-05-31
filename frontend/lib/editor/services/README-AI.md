# AI Features Services

This directory contains services for AI-powered features in the PackagePro editor.

## Services

### 1. Background Removal (`ai-background-removal.ts`)
- **Purpose**: Remove background from images using AI
- **Features**:
  - Integration with remove.bg API
  - Server-side processing fallback
  - Returns processed image as data URL

### 2. Image Upscaling (`ai-image-upscaling.ts`)
- **Purpose**: Upscale images using Real-ESRGAN or similar
- **Features**:
  - Supports 2x, 4x, 8x upscaling
  - Server-side processing
  - Returns upscaled image with dimensions

### 3. Color Palette Generation (`ai-color-palette.ts`)
- **Purpose**: Generate color palettes from images or base colors
- **Features**:
  - Extract dominant colors from images
  - Generate complementary, analogous, triadic colors
  - Generate shades and tints
  - Uses colord and tinycolor2 libraries

### 4. Font Pairing Suggestions (`ai-font-pairing.ts`)
- **Purpose**: Suggest font pairings for design
- **Features**:
  - Predefined font pairing combinations
  - Category-based suggestions (modern, classic, playful, elegant, bold)
  - Font pair validation
  - Contrast checking

### 5. Design Compliance Checker (`ai-compliance-checker.ts`)
- **Purpose**: Check design compliance with print standards
- **Features**:
  - Minimum text size checking
  - Color contrast validation
  - Safe zone compliance
  - Image resolution checking
  - Bleed coverage validation
  - Generates compliance report with score

## API Routes

### `/api/packagepro/remove-background`
Server-side background removal (requires remove.bg API key or local AI service).

### `/api/packagepro/upscale-image`
Server-side image upscaling (requires Real-ESRGAN service or Replicate API).

## Usage

### Background Removal

```typescript
import { removeBackground } from "@/lib/editor/services/ai-background-removal"

const result = await removeBackground(imageFile, apiKey)
if (result.success) {
  // Use result.imageDataUrl
}
```

### Image Upscaling

```typescript
import { upscaleImage } from "@/lib/editor/services/ai-image-upscaling"

const result = await upscaleImage(imageFile, 2) // 2x upscale
if (result.success) {
  // Use result.imageDataUrl
}
```

### Color Palette

```typescript
import { generateColorPaletteFromImage, generatePaletteFromColor } from "@/lib/editor/services/ai-color-palette"

// From image
const palette = await generateColorPaletteFromImage(imageFile)

// From color
const palette = generatePaletteFromColor("#ff0000")
```

### Font Pairings

```typescript
import { getFontPairings, validateFontPair } from "@/lib/editor/services/ai-font-pairing"

const pairings = getFontPairings("modern", 5)
const validation = validateFontPair("Roboto", "Open Sans")
```

### Compliance Check

```typescript
import { checkDesignCompliance } from "@/lib/editor/services/ai-compliance-checker"

const report = checkDesignCompliance(layers, faces, dimensions)
console.log(`Compliance Score: ${report.score}%`)
```

## Configuration

### Environment Variables

```env
REMOVE_BG_API_KEY=your_remove_bg_api_key
REPLICATE_API_TOKEN=your_replicate_token
```

### Service Setup

1. **remove.bg**: Sign up at https://www.remove.bg/api and get API key
2. **Real-ESRGAN**: 
   - Option 1: Use Replicate API (easiest)
   - Option 2: Run locally with Docker
   - Option 3: Use cloud service

## Notes

- Background removal and upscaling require external services or API keys
- Color palette generation works client-side (no API needed)
- Font pairings are predefined (can be enhanced with ML)
- Compliance checker runs client-side based on design rules

