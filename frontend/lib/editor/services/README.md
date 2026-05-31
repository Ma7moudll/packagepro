# File Processing Services

This directory contains services for processing various file types in the PackagePro editor.

## Services

### 1. PDF Processing (`pdf-processing.ts`)
- **Processes**: PDF files
- **Status**: ⚠️ Temporarily disabled due to bundler compatibility issues
- **Features**:
  - Extracts pages as images (when enabled)
  - Extracts metadata (title, author, etc.)
  - Converts pages to design layers
  - Supports EPS/AI conversion (via server)

### 2. PSD Processing (`psd-processing.ts`)
- **Processes**: Adobe Photoshop PSD files
- **Features**:
  - Extracts individual layers
  - Preserves layer properties (opacity, blend mode, visibility)
  - Supports flattened image fallback
  - Converts layers to design layers

### 3. SVG Processing (`svg-processing.ts`)
- **Processes**: SVG vector files
- **Features**:
  - Parses SVG structure
  - Extracts layers and elements
  - Converts to raster images (can be enhanced for vector support)
  - Note: SVGO optimization removed to avoid Node.js dependencies in browser

### 4. Image Processing (`image-processing.ts`)
- **Processes**: Raster images (JPG, PNG, WEBP, GIF)
- **Features**:
  - Client-side resizing and format conversion
  - Server-side processing (Sharp) for advanced operations
  - DPI checking
  - Quality optimization

### 5. Unified File Processing (`file-processing.ts`)
- **Processes**: All supported file types
- **Features**:
  - Routes files to appropriate processors
  - Returns standardized layer format
  - Provides metadata and warnings
  - Single entry point for file processing

### 6. Model Loader (`model-loader.ts`)
- **Processes**: 3D models (GLTF/GLB)
- **Features**:
  - GLTF/GLB loading with Draco compression support
  - Model preloading for better performance
  - Integration with @react-three/gltfjsx for optimized components

### 7. Raycasting (`raycasting.ts`)
- **Purpose**: Optimized raycasting using BVH (Bounding Volume Hierarchy)
- **Features**:
  - Setup BVH for meshes and scenes
  - Optimized intersection detection
  - Significantly improves performance for complex meshes

### 8. Template Service (`template-service.ts`)
- **Purpose**: CRUD operations for design templates
- **Features**:
  - Create, read, update, delete templates
  - Search templates with filters
  - Get popular templates
  - Template ratings and reviews

### 9. Template Search (`template-search.ts`)
- **Purpose**: Advanced search with Algolia integration
- **Features**:
  - Search with query and filters
  - Algolia integration (when configured)
  - Index templates for search

## AI Services

See [README-AI.md](./README-AI.md) for AI-powered features.

## Template Services

See [README-TEMPLATES.md](./README-TEMPLATES.md) for template system details.

## 3D Services

See [README-3D.md](./README-3D.md) for 3D features.

## API Routes

### `/api/packagepro/process-image`
Server-side image processing using Sharp (when available).

### `/api/packagepro/check-image-dpi`
Extracts DPI information from image metadata.

### `/api/packagepro/convert-to-pdf`
Converts EPS/AI files to PDF (requires server-side tools like Ghostscript).

### `/api/packagepro/remove-background`
Background removal using remove.bg API or local AI service.

### `/api/packagepro/upscale-image`
Image upscaling using Real-ESRGAN or similar service.

### `/api/packagepro/templates/*`
Template CRUD operations and search.

## Usage

```typescript
import { processFile } from "@/lib/editor/services/file-processing"

const result = await processFile(file, "front")
result.layers.forEach((layer) => {
  addLayer(layer)
})
```

## Supported File Types

- **Images**: JPG, JPEG, PNG, WEBP, GIF
- **Vector**: SVG
- **Documents**: PDF (temporarily disabled)
- **Design Files**: PSD, EPS, AI
- **3D Models**: GLTF, GLB

## Notes

- PSD processing extracts up to 10 layers by default to avoid performance issues
- SVG files are converted to raster images (vector support can be added later)
- EPS/AI conversion requires server-side tools (currently returns error)
- DPI checking requires server-side processing (falls back to client-side if unavailable)
- PDF.js has bundler compatibility issues and is temporarily disabled
- Template system uses in-memory storage (replace with database in production)
