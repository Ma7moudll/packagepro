# SPEC-015: File Upload & Processing

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P0 — Core Feature  
> **Dependencies:** None (foundation layer)

---

## 1. What

Secure file upload and processing system:

**Upload:**
- Drag-and-drop interface
- Progress bar with resume on failure
- Max file size: 50MB
- Allowed types: PNG, JPG, PDF, AI, EPS, PSD, TIFF

**Processing:**
- Malware scan: every upload before storage
- Thumbnail generation: preview for images, first page for PDFs
- RGB to CMYK conversion: auto-convert for print compatibility
- Image optimization: compress without quality loss (<5MB for web)
- EXIF data stripping: remove metadata for privacy

**Storage:**
- AWS S3 or Cloudflare R2
- CDN for fast global access
- Organized by entity: `designs/`, `orders/`, `samples/`, `invoices/`
- Access control: signed URLs with expiry

**Lifecycle:**
- Auto-delete files 90 days after order completion
- Customer can extend retention
- Archive cold files to Glacier after 1 year

---

## 2. Why

Customers upload large design files that need processing before production. Manual handling is slow and risky. Automation ensures files are print-ready, secure, and accessible globally.

**Business Impact:**
- Reduce upload failures: -90% with resume
- Ensure print readiness: auto CMYK conversion
- Improve security: malware scan + EXIF stripping
- Reduce storage costs: lifecycle management

---

## 3. Who

| Role | Need |
|------|------|
| **Customer** | Upload design files, download processed files |
| **Pre-Press** | Download original and processed files |
| **Admin** | Monitor storage usage, configure retention |

---

## 4. Success Criteria

### Functional
- [ ] Drag-and-drop upload with progress bar
- [ ] Resume interrupted uploads (multipart)
- [ ] File validation: type, size, corruption check
- [ ] Malware scan: quarantine if suspicious, notify admin
- [ ] Thumbnail: auto-generate for images and PDFs
- [ ] RGB to CMYK: auto-convert with color profile embedding
- [ ] Image optimization: compress to <5MB, quality ≥80%
- [ ] EXIF stripping: remove GPS, camera info, etc.
- [ ] Storage: S3/R2 with CDN, organized paths
- [ ] Signed URLs: time-limited access (1h default, 30 days for POs)
- [ ] Retention: auto-delete 90 days post-completion, extendable

### Non-Functional
- [ ] Upload speed: max bandwidth utilization
- [ ] Processing: <10s for 50MB file
- [ ] Thumbnail: <2s generation
- [ ] CDN latency: <100ms global

---

## 5. Out of Scope

- Video file processing
- CAD/3D model support (STL, OBJ)
- Blockchain-based file verification
- Real-time collaborative editing on files

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/files/files.controller.ts` | File API endpoints |
| `backend/src/modules/files/files.service.ts` | Upload and processing logic |
| `backend/src/modules/files/processors/image.processor.ts` | Image processing (Sharp) |
| `backend/src/modules/files/processors/pdf.processor.ts` | PDF processing |
| `backend/src/modules/files/scanners/malware.scanner.ts` | Malware scanning |
| `backend/src/modules/files/storage/s3.provider.ts` | S3 storage |
| `backend/src/modules/files/storage/r2.provider.ts` | R2 storage |
| `backend/src/workers/file-processing.worker.ts` | Background processing |
| `backend/prisma/schema.prisma` | File, FileProcessingJob tables |
| `frontend/components/files/FileUploader.tsx` | Upload component |
| `frontend/components/files/FilePreview.tsx` | File preview component |
| `frontend/components/files/FileGallery.tsx` | Gallery/grid view |
