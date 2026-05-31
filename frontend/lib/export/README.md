# Export System

This directory contains the export system for PackagePro.

## Features

### ✅ Batch Export
- **File**: `BatchExport.tsx`
- **Features**:
  - Export multiple projects at once
  - Select projects from list
  - Output formats: individual files, ZIP, cloud storage
  - Progress tracking
  - Job management

### ✅ Export Presets
- **File**: `ExportPresets.tsx`
- **Features**:
  - Create and manage export presets
  - Customizable settings (DPI, quality, color mode, etc.)
  - Default preset support
  - Preset templates
  - Reusable configurations

### ✅ Automated Export Scheduling
- **File**: `ExportScheduling.tsx`
- **Features**:
  - Schedule automatic exports
  - Daily, weekly, monthly schedules
  - Custom cron expressions
  - Enable/disable schedules
  - Next run calculation
  - Cloud storage integration

### ✅ Export to Cloud Storage
- **File**: `CloudStorageExport.tsx`
- **Features**:
  - Google Drive integration
  - Dropbox integration
  - OneDrive integration
  - AWS S3 integration
  - Folder organization
  - Direct upload

### ✅ ZIP File with All Assets
- **Features**:
  - Generate ZIP files with all export files
  - Include all project assets
  - Organized file structure
  - Metadata files
  - Instructions and specs

### ✅ Print-Ready Package Generator
- **File**: `PrintReadyPackage.tsx`
- **Features**:
  - Generate complete print packages
  - Include artwork files
  - Die-cut lines
  - Fold lines
  - Color specifications
  - Printing instructions
  - Contact information
  - ZIP download

## Usage

### Create Export Preset

```typescript
import { ExportService } from "@/lib/export/export-service"

const exportService = new ExportService()

const preset = await exportService.createPreset({
  name: "High Quality PDF",
  description: "300 DPI CMYK PDF with bleed",
  format: "pdf",
  settings: {
    dpi: 300,
    quality: 100,
    colorMode: "cmyk",
    format: "pdf",
    includeBleed: true,
    bleedSize: 3,
    includeCropMarks: true,
  },
  isDefault: false,
})
```

### Export Project

```typescript
const job = await exportService.exportProject(projectId, {
  dpi: 300,
  quality: 100,
  colorMode: "cmyk",
  format: "pdf",
  includeBleed: true,
  bleedSize: 3,
  includeCropMarks: true,
})
```

### Batch Export

```typescript
const job = await exportService.batchExport({
  projectIds: ["project-1", "project-2", "project-3"],
  presetId: "preset-123",
  outputFormat: "zip",
})
```

### Export to Cloud

```typescript
const job = await exportService.exportToCloud(projectId, settings, {
  provider: "google-drive",
  folderId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
})
```

### Create Schedule

```typescript
const schedule = await exportService.createSchedule({
  name: "Daily Export",
  projectId: "project-123",
  settings: { /* export settings */ },
  schedule: {
    type: "daily",
    time: "09:00",
    timezone: "Asia/Riyadh",
  },
  enabled: true,
})
```

### Generate Print Package

```typescript
const package = await exportService.generatePrintPackage(projectId, {
  dpi: 300,
  quality: 100,
  colorMode: "cmyk",
  format: "pdf",
  includeBleed: true,
  includeCropMarks: true,
})
```

## API Routes

- `POST /api/export/presets` - Create preset
- `GET /api/export/presets` - List presets
- `PUT /api/export/presets/[id]` - Update preset
- `DELETE /api/export/presets/[id]` - Delete preset
- `POST /api/export/projects/[id]` - Export project
- `POST /api/export/batch` - Batch export
- `GET /api/export/jobs/[id]` - Get job status
- `GET /api/export/jobs/[id]/download` - Download export (ZIP)
- `GET /api/export/jobs/[id]/files/[fileId]/download` - Download single file
- `POST /api/export/projects/[id]/cloud` - Export to cloud
- `POST /api/export/schedules` - Create schedule
- `GET /api/export/schedules` - List schedules
- `PUT /api/export/schedules/[id]` - Update schedule
- `DELETE /api/export/schedules/[id]` - Delete schedule
- `POST /api/export/projects/[id]/print-package` - Generate print package
- `GET /api/export/print-packages/[id]/download` - Download print package

## Store

The export store (`export-store.ts`) provides:
- Preset management
- Job tracking
- Schedule management
- Active job monitoring

## Notes

- Export jobs are processed asynchronously
- Progress is tracked and updated in real-time
- Cloud storage requires OAuth setup
- Schedules use cron expressions for custom timing
- Print packages include all necessary files for printing
- ZIP files are generated server-side using JSZip

