# Tasks: Design Session Management (2D/3D Editor)

**Input**: Design documents from `.specify/specs/029-design-editor/`

**Prerequisites**: plan.md, spec.md

**Tests**: Not requested in spec — test tasks omitted per guidelines.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`
- **Frontend**: `frontend/`
- **Shared**: `shared/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Audit existing codebase, confirm baseline, define shared types

- [X] T001 [P] Audit existing backend design module at `backend/src/modules/designs/` — confirm current CRUD, session management, and routes
- [X] T002 [P] Audit existing frontend design editor at `frontend/components/design-editor/` — confirm 2D canvas, 3D preview, layer panel, toolbar, and export dialog
- [X] T003 [P] Read Zustand design store at `frontend/lib/editor/state/store.ts` — confirm undo/redo stack, face management, and current state shape
- [X] T004 Add `DesignLifecycle` enum to `shared/types/index.ts` with values: DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED, IN_PRODUCTION

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Update `backend/prisma/schema.prisma` — add `lifecycleStatus` field to `Design` model using the new enum
- [X] T006 Generate and run Prisma migration for the `lifecycleStatus` column
- [X] T007 [P] Add `lifecycleStatus` and allowed transitions to the Zustand design store in `frontend/lib/editor/state/store.ts`
- [X] T008 [P] Update auth middleware at `backend/src/middleware/auth.middleware.ts` — add design ownership check and role-based access helpers
- [X] T009 Create `backend/src/services/design-lifecycle/` service with state transition validation rules (Draft → Submitted, Submitted → In Review, In Review → Approved/Rejected, Approved → In Production)
- [X] T010 Add `DesignLifecycle` type to `frontend/lib/editor/state/types.ts` and export from `frontend/lib/editor/state/`

**Checkpoint**: Foundation ready — lifecycle state machine and access control helpers in place

---

## Phase 3: User Story 1 — Create Custom Package Design (Priority: P1) 🎯 MVP

**Goal**: Enforce design lifecycle states and access control on the existing editor. Customers create designs in Draft state, submit for review, and see lifecycle-aware UI.

**Independent Test**: Select a product, add text/shapes/images, verify editor loads in Draft state. Submit the design and verify it transitions to Submitted and becomes read-only for the owner.

### Implementation for User Story 1

- [X] T011 [P] [US1] Add lifecycle state endpoints to `backend/src/modules/designs/design.controller.ts` — submitDesign, recallDesign (Draft←→Submitted)
- [X] T012 [P] [US1] Add lifecycle state routes to `backend/src/modules/designs/design.routes.ts` — POST /designs/:id/submit, POST /designs/:id/recall
- [X] T013 [US1] Implement submit/recall logic in `backend/src/modules/designs/design.service.ts` — validate state transition, enforce owner-only submission, update lifecycleStatus
- [X] T014 [P] [US1] Update `frontend/lib/api-client.ts` — add submitDesign(id) and recallDesign(id) API calls
- [X] T015 [P] [US1] Add "Submit for Review" button to `frontend/components/design-editor/AdvancedDesignEditor.tsx` — visible only in Draft state, triggers submitDesign API
- [X] T016 [US1] Update Zustand store at `frontend/lib/editor/state/store.ts` — add submit/recall actions that call API and update local lifecycleStatus
- [X] T017 [US1] Add lifecycle-aware read-only mode to `frontend/components/design-editor/canvas/` — disable editing tools when lifecycleStatus is not DRAFT
- [X] T018 [P] [US1] Implement concurrent edit warning in `frontend/lib/editor/services/storage.ts` — on save, check if updatedAt changed since load; show warning dialog
- [X] T019 [US1] Add auto-save failure handling in `frontend/lib/editor/state/store.ts` — show error toast on auto-save failure, retry with exponential backoff

**Checkpoint**: Customer can create, edit, submit, and recall designs with lifecycle enforcement. Concurrent edit warning works.

---

## Phase 4: User Story 2 — Preview Design in 3D (Priority: P1) 🎯

**Goal**: Ensure 3D preview respects lifecycle states and access control. Already functionally complete — add lifecycle integration.

**Independent Test**: Create a design with content on multiple faces, activate 3D preview, verify model shows all faces with correct materials and hollow interior.

### Implementation for User Story 2

- [X] T020 [P] [US2] Add lifecycle-aware overlay to `frontend/components/design-editor/3DPreview.tsx` — gray out or watermark preview when design is not in Draft/Approved state
- [X] T021 [US2] Verify 3D preview materials and face assembly at `frontend/components/design-editor/3D/` — confirm hollow geometry, flap pivots, realistic cardboard materials
- [X] T022 [US2] Verify material caching at `frontend/components/design-editor/materials/MaterialSystem.ts` — ensure same material types share instances, no texture creation in render loop

**Checkpoint**: 3D preview works correctly at all lifecycle stages with appropriate access restrictions.

---

## Phase 5: User Story 3 — Export Design for Production (Priority: P1)

**Goal**: Add AI/EPS vector export to existing PNG/PDF capability. Create async export worker.

**Independent Test**: Create a design, export as AI and EPS, verify files download and open correctly with proper dimensions and layers.

### Implementation for User Story 3

- [X] T023 [P] [US3] Create `backend/src/workers/export-queue/` — BullMQ worker that converts design data to AI/EPS vector format using sharp + svg-to-vector pipeline
- [X] T024 [P] [US3] Register export queue in `backend/src/lib/queues.ts` — add exportQueue definition with Redis connection
- [X] T025 [US3] Add export endpoint to `backend/src/modules/designs/design.controller.ts` — POST /designs/:id/export with format parameter (png, pdf, ai, eps)
- [X] T026 [US3] Add export route to `backend/src/modules/designs/design.routes.ts` — POST /designs/:id/export
- [X] T027 [US3] Implement export orchestration in `backend/src/modules/designs/design.service.ts` — validate lifecycle (must be Draft or Approved), enqueue export job, return download URL
- [X] T028 [P] [US3] Update `frontend/components/design-editor/export/ExportDialog.tsx` — add AI and EPS format options alongside existing PNG/PDF
- [X] T029 [P] [US3] Add export format API call to `frontend/lib/api-client.ts` — exportDesign(id, format)
- [X] T030 [US3] Update `frontend/lib/editor/services/export.ts` — wire export dialog to backend export endpoint, handle download

**Checkpoint**: All four export formats (PNG, PDF, AI, EPS) functional. Exports include bleed/crop marks for print formats.

---

## Phase 6: User Story 4 — Review and Approve Design (Priority: P2)

**Goal**: Enable designers to review submitted designs, add comments on specific elements, and approve/reject.

**Independent Test**: Submit a design, log in as a designer, review the design, add a comment, approve it, and verify the customer sees the approved status.

### Implementation for User Story 4

- [X] T031 [P] [US4] Add review endpoints to `backend/src/modules/designs/design.controller.ts` — getDesignForReview, addComment, approveDesign, rejectDesign, requestChanges
- [X] T032 [P] [US4] Add review routes to `backend/src/modules/designs/design.routes.ts` — GET /designs/:id/review, POST /designs/:id/review/comment, POST /designs/:id/review/approve, POST /designs/:id/review/reject, POST /designs/:id/review/request-changes
- [X] T033 [US4] Implement review business logic in `backend/src/modules/designs/design.service.ts` — validate designer role, enforce lifecycle transitions (Submitted→In Review on first view, In Review→Approved or Rejected), store comments with element references
- [X] T034 [P] [US4] Add `DesignComment` model to `backend/prisma/schema.prisma` — fields: id, designId, userId, elementRef (JSON pointer to layer), commentText, createdAt
- [X] T035 [P] [US4] Generate and run Prisma migration for DesignComment model
- [X] T036 [P] [US4] Update `frontend/lib/api-client.ts` — add getDesignForReview, addComment, approveDesign, rejectDesign API calls
- [X] T037 [P] [US4] Create review panel at `frontend/components/projects/ApprovalWorkflow.tsx` — show design with element-level comment pins, approve/reject/request-changes buttons
- [X] T038 [US4] Wire review status into `frontend/app/(customer)/designs/[id]/page.tsx` — show lifecycle state, comments, and approval status to customer
- [X] T039 [US4] Add lifecycle state badge to design listing at `frontend/app/(customer)/designs/page.tsx` — color-coded status indicator per design card

**Checkpoint**: Designers can review and approve/reject designs. Customers see comments and lifecycle state.

---

## Phase 7: User Story 5 — Manage Brand Templates (Priority: P3)

**Goal**: Enterprise customers can create brand kits with locked colors, fonts, and logos that apply automatically to new designs.

**Independent Test**: Create a brand kit with brand colors and a logo. Start a new design and verify brand colors are locked and logo is available in the editor.

### Implementation for User Story 5

- [X] T040 [P] [US5] Add `BrandKit` model to `backend/prisma/schema.prisma` — fields: id, customerId, name, brandColors (JSON array of hex/brand-color pairs), brandFonts (JSON array of font-family/usage pairs), logoAssetId (FK to uploaded file), createdAt, updatedAt
- [X] T041 [P] [US5] Add `BrandKitTemplate` model to `backend/prisma/schema.prisma` — fields: id, brandKitId, templateId (FK to templates), lockedElements (JSON — which elements are lockable)
- [X] T042 [P] [US5] Generate and run Prisma migration for BrandKit + BrandKitTemplate
- [X] T043 [P] [US5] Create brand kit routes at `backend/src/modules/templates/brand-kit.routes.ts` — CRUD for brand kits, only for enterprise-tier customers
- [X] T044 [P] [US5] Create brand kit controller at `backend/src/modules/templates/brand-kit.controller.ts` — createBrandKit, getBrandKit, updateBrandKit, deleteBrandKit, listBrandKits
- [X] T045 [US5] Implement brand kit service at `backend/src/modules/templates/brand-kit.service.ts` — enforce enterprise tier, validate brand kit ownership, apply brand kit to design templates
- [X] T046 [P] [US5] Add brand kit API calls to `frontend/lib/api-client.ts` — createBrandKit, getBrandKits, getBrandKit, updateBrandKit, deleteBrandKit
- [X] T047 [P] [US5] Create brand kit management UI at `frontend/components/design-editor/templates/BrandKitManager.tsx` — form to define brand colors/fonts, upload logo
- [X] T048 [P] [US5] Create brand kit selector at `frontend/components/design-editor/templates/BrandKitSelector.tsx` — dropdown to apply a brand kit when starting a new design
- [X] T049 [US5] Integrate brand kit into `frontend/components/design-editor/AdvancedDesignEditor.tsx` — on design load, if a brand kit is associated, lock brand colors/fonts in the toolbar and add brand logo as a locked background layer
- [X] T050 [US5] Add brand kit enforcement to `frontend/lib/editor/state/store.ts` — prevent changes to locked brand elements unless user has explicit override permission

**Checkpoint**: Enterprise customers can create and apply brand kits. Brand colors/fonts are locked in the editor.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Edge case handling, error states, and hardening

- [X] T051 [P] Add file size validation on upload in `frontend/components/design-editor/canvas/` — reject images >50MB with user-friendly error message
- [X] T052 [P] Add unsupported format handling in `frontend/lib/editor/services/file-processing.ts` — show clear error when user uploads non-PNG/JPG
- [X] T053 [P] Handle session timeout in `frontend/lib/editor/state/store.ts` — warn user before session expires, auto-save on timeout detection
- [X] T054 [P] Add browser resize handling in `frontend/components/design-editor/AdvancedDesignEditor.tsx` — reflow editor layout on window resize
- [X] T055 [P] Add network failure handling for auto-save in `frontend/lib/editor/services/storage.ts` — queue failed saves, retry on reconnection
- [X] T056 Add structured logging to new backend services in `backend/src/modules/designs/design.service.ts` — log lifecycle transitions, export attempts, review actions via pino
- [X] T057 Add Zod validation schemas for all new endpoints in `backend/src/modules/designs/` — validate lifecycle transitions, export formats, comment input, brand kit data

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — audit tasks only
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (Phase 3) → US2 (Phase 4) — US2 adds lifecycle-aware overlay to 3D preview
  - US1 (Phase 3) → US4 (Phase 6) — US4 review workflow depends on submit/recall from US1
  - US1 (Phase 3) → US3 (Phase 5) — US3 export depends on lifecycle for access control
  - US5 (Phase 7) — independent of other stories
- **Polish (Phase 8)**: Depends on all user stories

### Parallel Opportunities

- All Phase 1 tasks marked [P] can run in parallel (separate files)
- All Phase 2 tasks marked [P] can run in parallel (schema, middleware, service, types)
- US1 tasks are mostly sequential (controller → routes → service → UI)
- US3 backend (T023-T027) and frontend (T028-T030) can run in parallel
- US4 backend (T031-T035) and frontend (T036-T039) can run in parallel
- US5 backend (T040-T045) and frontend (T046-T050) can run in parallel
- All Polish phase tasks marked [P] can run in parallel

---

## Parallel Example: User Story 3 — Export

```bash
# Backend tasks can run in parallel with frontend:
Task: "Create export worker in backend/src/workers/export-queue/"
Task: "Update export dialog in frontend/components/design-editor/export/ExportDialog.tsx"
```

---

## Implementation Strategy

### MVP First (Phase 1 + 2 + US1)

1. Complete Phase 1: Setup (audits)
2. Complete Phase 2: Foundational (lifecycle types, schema, auth helpers)
3. Complete Phase 3: User Story 1 (submit/recall lifecycle)
4. **STOP and VALIDATE**: Customer can create, edit, submit, and recall designs
5. Deploy/demo with lifecycle enforcement

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Create/Submit lifecycle) → Test independently → Deploy (MVP!)
3. Add US2 (3D preview lifecycle integration) → Test independently → Deploy
4. Add US3 (AI/EPS export) → Test independently → Deploy
5. Add US4 (Review workflow) → Test independently → Deploy
6. Add US5 (Brand kits) → Test independently → Deploy
7. Polish Phase → Hardening

### Parallel Team Strategy

With multiple developers:
1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Create/Submit lifecycle — sequential, highest priority)
   - Developer B: US3 (Export worker + backend — can parallelize with A)
   - Developer C: US5 (Brand kit — fully independent of US1)
3. After US1 done:
   - Developer A: US4 (Review workflow — depends on US1 submit)
   - Developer B: US2 (3D preview — lightweight, quick win)
4. Polish phase: All developers together

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group using Conventional Commits
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
