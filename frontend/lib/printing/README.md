# Printing & Design Features

This directory contains advanced printing and design features for PackagePro.

## Features

### ✅ Die-cut Line Editor
- **File**: `die-cut-editor.ts` + `DieCutEditor.tsx`
- **Features**:
  - Draw cut, perforation, and score lines
  - Visual editor with canvas
  - Export as SVG
  - Line customization (color, thickness)
  - Closed/open line support

### ✅ Fold Line Customization
- **File**: `fold-line-editor.ts` + `FoldLineEditor.tsx`
- **Features**:
  - Draw fold, mountain, and valley fold lines
  - Visual editor with canvas
  - Export as SVG
  - Angle calculation
  - Direction indicators

### ✅ Spot UV / Foil Stamping Simulation
- **File**: `SpotUVSimulator.tsx`
- **Features**:
  - Visual simulation of spot UV effects
  - Foil stamping preview
  - Gloss and matte effects
  - Opacity control
  - Area selection (rectangle, circle, polygon)

### ✅ Embossing / Debossing Preview
- **File**: `EmbossingPreview.tsx`
- **Features**:
  - 3D preview of embossing effects
  - Debossing simulation
  - Depth control
  - Shadow and highlight effects
  - Realistic 3D rendering

### ✅ Pantone Color Matching System
- **File**: `pantone-colors.ts` + `PantoneColorPicker.tsx`
- **Features**:
  - Pantone color database
  - Search by name or code
  - Category filtering (Coated, Uncoated, Metallic)
  - RGB to Pantone conversion
  - HEX to Pantone conversion
  - CMYK values
  - Color selection and management

### ✅ Print Quote Calculator
- **File**: `quote-calculator.ts` + `PrintQuoteCalculator.tsx`
- **Features**:
  - Calculate print quotes based on specifications
  - Material costs
  - Color costs (front, back, sides)
  - Finish costs
  - Special effects pricing
  - Rush order pricing
  - Tax calculation (15% VAT)
  - Quote export

## Usage

### Die-cut Editor

```typescript
import { DieCutEditorComponent } from "@/components/printing/DieCutEditor"

<DieCutEditorComponent
  width={800}
  height={600}
  onSave={(lines) => {
    console.log("Saved lines:", lines)
  }}
/>
```

### Fold Line Editor

```typescript
import { FoldLineEditorComponent } from "@/components/printing/FoldLineEditor"

<FoldLineEditorComponent
  width={800}
  height={600}
  onSave={(lines) => {
    console.log("Saved lines:", lines)
  }}
/>
```

### Spot UV Simulator

```typescript
import { SpotUVSimulator } from "@/components/printing/SpotUVSimulator"

<SpotUVSimulator
  width={800}
  height={600}
  onSave={(effects) => {
    console.log("Saved effects:", effects)
  }}
/>
```

### Embossing Preview

```typescript
import { EmbossingPreview } from "@/components/printing/EmbossingPreview"

<EmbossingPreview
  width={800}
  height={600}
  onSave={(effects) => {
    console.log("Saved effects:", effects)
  }}
/>
```

### Pantone Color Picker

```typescript
import { PantoneColorPicker } from "@/components/printing/PantoneColorPicker"

<PantoneColorPicker
  selectedColors={["PANTONE 19-1664 TPX"]}
  onColorSelect={(color) => {
    console.log("Selected color:", color)
  }}
  onColorRemove={(code) => {
    console.log("Removed color:", code)
  }}
/>
```

### Print Quote Calculator

```typescript
import { PrintQuoteCalculator } from "@/components/printing/PrintQuoteCalculator"

<PrintQuoteCalculator />
```

## API

### DieCutEditor Class

```typescript
const editor = new DieCutEditor()

// Start drawing
editor.startDrawing("cut", { x: 100, y: 100 })

// Add points
editor.addPoint({ x: 200, y: 150 })

// Finish drawing
editor.finishDrawing(true) // closed line

// Get all lines
const lines = editor.getLines()

// Export as SVG
const svg = editor.exportAsSVG()
```

### FoldLineEditor Class

```typescript
const editor = new FoldLineEditor()

// Start drawing
editor.startDrawing("fold", { x: 100, y: 100 })

// Update end point
editor.updateEndPoint({ x: 300, y: 200 })

// Finish drawing
editor.finishDrawing()

// Get all lines
const lines = editor.getLines()
```

### Pantone Colors

```typescript
import {
  PANTONE_COLORS,
  searchPantoneColors,
  getPantoneColorsByCategory,
  rgbToPantone,
  hexToPantone,
} from "@/lib/printing/pantone-colors"

// Search colors
const results = searchPantoneColors("red")

// Get by category
const coated = getPantoneColorsByCategory("Coated")

// Convert RGB to Pantone
const pantone = rgbToPantone(255, 0, 0)

// Convert HEX to Pantone
const pantone = hexToPantone("#FF0000")
```

### Quote Calculator

```typescript
import { calculatePrintQuote } from "@/lib/printing/quote-calculator"

const quote = calculatePrintQuote({
  quantity: 100,
  dimensions: {
    width: 200,
    height: 150,
    unit: "mm",
  },
  material: "cardboard-250",
  finish: ["gloss"],
  colors: {
    front: 4,
    back: 4,
    sides: 0,
  },
  dieCutLines: 2,
  foldLines: 1,
  spotUV: 1,
  embossing: 0,
  debossing: 0,
  pantoneColors: [],
  rushOrder: false,
})

console.log("Total:", quote.total, quote.currency)
```

## Notes

- Die-cut and fold line editors use HTML5 Canvas
- Spot UV and embossing use canvas with gradients and shadows for 3D effects
- Pantone color database is a subset - expand for production
- Quote calculator uses mock pricing - update with real costs
- All components support Arabic/RTL layout
- Export functions generate SVG/PDF files

