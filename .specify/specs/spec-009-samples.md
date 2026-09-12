# SPEC-009: Sample Upload & Approval Workflow

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P1 — Important  
> **Dependencies:** SPEC-008 (Production)

---

## 1. What

Quality assurance workflow for physical samples:

**Vendor Actions:**
- Upload sample photos (minimum 3) and video (360° rotation)
- Add notes about materials, colors, dimensions
- Submit for review

**Review Criteria:**
- Color accuracy vs design
- Material quality and texture
- Dimensions accuracy (±1mm tolerance)
- Print quality (resolution, registration)
- Structural integrity (folds, glue, flaps)

**Approval Options:**
- Approve: proceed to full production
- Reject with feedback: specify issues with annotated photos
- Approve with Notes: minor issues acceptable

**Rejection Limits:**
- Max 3 rejection cycles
- After 3rd rejection, escalate to admin
- Admin can approve, request new vendor, or cancel order

---

## 2. Why

Sampling catches color mismatches, material issues, and sizing errors before full production. This reduces costly rework by 80% and customer complaints by 70%.

**Business Impact:**
- Reduce rework: -80%
- Reduce complaints: -70%
- Improve quality consistency: +40%
- Build customer trust: physical proof before commitment

---

## 3. Who

| Role | Need |
|------|------|
| **Vendor** | Upload samples, make adjustments based on feedback |
| **Customer/Pre-Press** | Review samples, approve or request changes |
| **Admin** | Monitor sample turnaround, mediate disputes |

---

## 4. Success Criteria

### Functional
- [ ] Vendor uploads: min 3 photos + 1 video per sample
- [ ] Review criteria: color, material, dimensions, print, structure
- [ ] Approval options: Approve, Reject with feedback, Approve with Notes
- [ ] Photo annotation: draw/markup on photos to highlight issues
- [ ] Rejection limits: max 3 cycles, then admin escalation
- [ ] Sample SLA: vendor must upload within 48h of PO confirmation
- [ ] Customer notification: email + in-app when sample ready
- [ ] Sample history: all versions, feedback, decisions stored
- [ ] Sample cost tracking: charge customer for samples if applicable

### Non-Functional
- [ ] Sample upload <10s (optimized media)
- [ ] Review page load <2s
- [ ] Notification delivery <1m

---

## 5. Out of Scope

- 3D scan comparison of physical to digital design
- Automated visual quality inspection (AI)
- Customer facility visits for in-person sampling
- Sample shipping tracking (use existing shipment system)

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/samples/samples.controller.ts` | Sample API endpoints |
| `backend/src/modules/samples/samples.service.ts` | Sample workflow logic |
| `backend/src/modules/samples/dto/upload-sample.dto.ts` | Upload validation |
| `backend/src/modules/samples/dto/review-sample.dto.ts` | Review validation |
| `backend/prisma/schema.prisma` | Sample, SampleReview, SamplePhoto tables |
| `frontend/app/(dashboard)/orders/[id]/samples/page.tsx` | Sample review page |
| `frontend/components/samples/SampleUploader.tsx` | Upload component |
| `frontend/components/samples/SampleViewer.tsx` | Photo/video viewer |
| `frontend/components/samples/PhotoAnnotator.tsx` | Annotation tool |
| `frontend/components/samples/ReviewForm.tsx` | Approval/rejection form |
