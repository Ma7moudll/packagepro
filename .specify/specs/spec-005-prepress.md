# SPEC-005: Pre-Press Quality Checker

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P0 — Core Feature  
> **Dependencies:** SPEC-002 (Design), SPEC-015 (File Upload)

---

## 1. What

Automated quality validation system for uploaded designs:

**Automated Checks:**
- Resolution: ≥300 DPI
- Color mode: CMYK (reject RGB)
- Bleed margin: ≥3mm
- Safe zone: ≥5mm from trim edge
- Font embedding: all fonts embedded or outlined
- File corruption: valid file structure
- Image compression: not over-compressed (quality ≥80%)

**Soft Proof Generation:**
- Watermarked PDF scaled to print size
- Color bars and registration marks
- Trim marks and bleed indicators
- Dieline overlay (cut/fold lines)

**Approval Workflow:**
- Customer reviews check results
- Approves soft proof or requests revision
- Auto-escalation if no response within 72h
- Pre-press team can override any check

---

## 2. Why

40% of production errors stem from incorrect design files. Automated pre-press checks catch issues before printing, saving $500-2000 per error in material waste and rework time.

**Business Impact:**
- Reduce production errors: -40%
- Save rework costs: $500-2000 per error avoided
- Speed up approval: automated vs 1-2 days manual review
- Reduce designer workload: -60% on file checking

---

## 3. Who

| Role | Need |
|------|------|
| **Customer** | Upload design, receive pass/fail report, approve soft proof |
| **Pre-Press Team** | Review flagged issues, manually approve edge cases |
| **Admin** | Configure check rules and thresholds |

---

## 4. Success Criteria

### Functional
- [ ] Automated checks: resolution, color mode, bleed, safe zone, fonts, corruption
- [ ] Check results: pass/warning/fail per criterion with visual indicators
- [ ] Soft proof: watermarked PDF with color bars, trim marks, dieline
- [ ] Customer approval: approve, request revision, or auto-approve after 72h
- [ ] Auto-escalation: reminder at 48h, auto-approve at 72h
- [ ] Pre-press override: any check can be overridden with mandatory comment
- [ ] Failed designs block progression to "In Production"
- [ ] Check history: all runs stored with results and timestamps

### Non-Functional
- [ ] Check execution <5s per file
- [ ] Soft proof generation <10s
- [ ] Support files up to 50MB
- [ ] Queue heavy checks in BullMQ worker

---

## 5. Out of Scope

- AI-powered design quality scoring
- Automatic design correction (resize, color conversion)
- 3D print simulation
- Pantone color matching verification

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/prepress/prepress.controller.ts` | Pre-press API endpoints |
| `backend/src/modules/prepress/prepress.service.ts` | Check logic and soft proof generation |
| `backend/src/modules/prepress/dto/run-check.dto.ts` | Check request validation |
| `backend/src/modules/prepress/checkers/resolution.checker.ts` | Resolution validation |
| `backend/src/modules/prepress/checkers/color-mode.checker.ts` | CMYK validation |
| `backend/src/modules/prepress/checkers/bleed.checker.ts` | Bleed margin validation |
| `backend/src/workers/prepress.worker.ts` | Background check processing |
| `backend/prisma/schema.prisma` | PrePressCheck, PrePressResult tables |
| `frontend/app/(dashboard)/orders/[id]/prepress/page.tsx` | Pre-press review page |
| `frontend/components/prepress/CheckResults.tsx` | Check results display |
| `frontend/components/prepress/SoftProofViewer.tsx` | Soft proof PDF viewer |
| `frontend/components/prepress/ApprovalActions.tsx` | Approve/reject buttons |
