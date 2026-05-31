# Asset Management System

This directory contains the asset management system for PackagePro.

## Features

### ✅ Media Library
- **File**: `MediaLibrary.tsx`
- **Features**:
  - Grid and list view modes
  - Asset browsing and filtering
  - Search functionality
  - Category and tag filtering
  - Asset selection
  - Asset preview
  - Download assets

### ✅ Brand Asset Manager
- **File**: `BrandAssetManager.tsx`
- **Features**:
  - Organize assets by brand
  - Role-based asset organization (logo, colors, fonts, etc.)
  - Brand-specific asset views
  - Asset role assignment

### ✅ Shared Assets Between Projects
- **Features**:
  - Share assets with projects
  - Project-based asset filtering
  - Shared asset indicators
  - Access control

### ✅ Version Control for Assets
- **File**: `AssetVersionControl.tsx`
- **Features**:
  - Upload new versions
  - Version history
  - Restore previous versions
  - Version comparison
  - Change logs
  - Current version indicator

### ✅ Asset Categories and Tags
- **Features**:
  - Category organization
  - Tag system
  - Category filtering
  - Tag filtering
  - Bulk category/tag operations

### ✅ Bulk Asset Operations
- **File**: `BulkOperations.tsx`
- **Features**:
  - Bulk delete
  - Bulk tag/untag
  - Bulk category change
  - Bulk share/unshare
  - Multi-select support

## Usage

### Upload Asset

```typescript
import { AssetService } from "@/lib/assets/asset-service"

const assetService = new AssetService()

const asset = await assetService.uploadAsset({
  file: file,
  name: "My Asset",
  category: "logos",
  tags: ["brand", "logo"],
  brandId: "brand-123",
  projectId: "project-456",
})
```

### List Assets

```typescript
const assets = await assetService.listAssets({
  type: ["image", "logo"],
  category: ["logos"],
  tags: ["brand"],
  brandId: "brand-123",
  search: "logo",
})
```

### Create Version

```typescript
const version = await assetService.createVersion(
  assetId,
  newFile,
  "Updated logo design"
)
```

### Bulk Operations

```typescript
await assetService.bulkOperation({
  type: "tag",
  assetIds: ["asset-1", "asset-2", "asset-3"],
  data: {
    tags: ["new-tag", "updated"],
  },
})
```

## Store

The asset store (`asset-store.ts`) provides:
- Asset state management
- Filtering and sorting
- Selection management
- Version tracking
- Category and tag management

## API Routes

- `POST /api/assets/upload` - Upload new asset
- `GET /api/assets` - List assets with filters
- `GET /api/assets/[id]` - Get asset by ID
- `PUT /api/assets/[id]` - Update asset
- `DELETE /api/assets/[id]` - Delete asset
- `GET /api/assets/[id]/versions` - Get asset versions
- `POST /api/assets/[id]/versions` - Create new version
- `POST /api/assets/[id]/versions/[versionId]/restore` - Restore version
- `POST /api/assets/bulk` - Bulk operations

## Notes

- Assets are stored in cloud storage (S3, Cloudinary, etc.) in production
- Thumbnails are generated automatically for images/videos
- Version control maintains full history
- Shared assets are accessible across projects
- Bulk operations are optimized for performance

