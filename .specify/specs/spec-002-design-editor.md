# SPEC-002: Design Session Management (2D/3D Editor)

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P0 — Core Feature  
> **Dependencies:** SPEC-001 (Pricing), SPEC-015 (File Upload)

---

## 1. What

An interactive browser-based design editor for custom packaging:

**2D Editor:**
- Layer-based editing (text, shapes, images)
- Face-by-face editing (front, back, left, right, top, bottom, inside)
- Typography: 50+ fonts, colors, alignment, rotation, kerning
- Shapes: rectangle, circle, line, polygon, custom paths
- Image upload: PNG, JPG, AI, EPS, PSD, TIFF (max 50MB)
- Alignment guides and snap-to-grid
- Undo/redo stack (50 actions minimum)
- Auto-save every 30 seconds

**3D Preview:**
- Real-time 3D preview via Three.js / React Three Fiber
- Realistic cardboard materials (kraft, white, black, recycled)
- Material properties: color map, normal map, roughness map, AO map
- Open/close animation with easing (easeInOutCubic)
- Hollow geometry (not solid blocks)
- Flap pivots on edge (not center)
- 360° rotation, zoom, pan controls

**Export:**
- PNG preview (web-optimized)
- PDF print-ready (with bleed, crop marks, color bars)
- AI/EPS source files
- 3D render (PNG, 4K resolution)

---

## 2. Why

Customers currently send design files via email and wait for mockups. An integrated editor reduces revision cycles from 5+ rounds to 1-2, speeds up approval by 70%, and reduces design team workload by 50%.

**Business Impact:**
- Reduce design iterations: 5 → 1-2
- Speed up approval: +70%
- Reduce design team workload: -50%
- Increase self-service: 60% of designs created without designer help

---

## 3. Who

| Role | Need |
|------|------|
| **Customer** | Create designs without design software knowledge |
| **Designer/Pre-Press** | Review, approve, or request changes |
| **Admin** | Monitor design sessions, intervene when needed |
| **Enterprise Customer** | Save brand templates, lock brand colors/fonts |

---

## 4. Success Criteria

### Functional
- [ ] 2D editor supports text, shapes, images, and alignment tools
- [ ] 3D preview updates within 200ms of any design change
- [ ] Realistic materials: kraft, white, black, recycled with proper texture maps
- [ ] Face-by-face editing with visual face selector
- [ ] Auto-save every 30 seconds; 50 version history per design
- [ ] Export: PNG, PDF (print-ready), AI/EPS, 3D render
- [ ] Undo/redo: minimum 50 actions, persists across sessions
- [ ] Design validation: resolution ≥300 DPI, color mode CMYK, bleed ≥3mm, safe zone ≥5mm
- [ ] Template library: 20+ starter templates per product type
- [ ] Brand kit: enterprise customers can save colors, fonts, logos as templates

### Non-Functional
- [ ] 60fps minimum in 3D editor
- [ ] No texture/material creation inside render loop
- [ ] Texture caching by face + layer hash
- [ ] Material reuse: same material type shares one Three.js Material instance
- [ ] Design session data <5MB per session

---

## 5. Out of Scope

- AI design generation from text prompts (Phase 2)
- Collaborative real-time editing (multiple users simultaneously)
- Video/animation export
- AR preview (view box in real space via camera)
- Auto-design from logo upload

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/designs/designs.controller.ts` | Design session API |
| `backend/src/modules/designs/designs.service.ts` | Design CRUD and validation |
| `backend/src/modules/designs/dto/save-design.dto.ts` | Design save validation |
| `backend/prisma/schema.prisma` | Design, DesignLayer, DesignVersion tables |
| `frontend/app/(shop)/design/page.tsx` | Design editor page |
| `frontend/components/design-editor/canvas/DesignCanvas2D.tsx` | 2D canvas component |
| `frontend/components/design-editor/canvas/DesignCanvas3D.tsx` | 3D canvas component |
| `frontend/components/design-editor/layers/LayerPanel.tsx` | Layer management UI |
| `frontend/components/design-editor/tools/Toolbar.tsx` | Editing tools toolbar |
| `frontend/components/design-editor/face-selector/FaceSelector.tsx` | Face selection UI |
| `frontend/lib/editor/services/texture-generator.ts` | Layer → texture conversion |
| `frontend/lib/editor/services/design-exporter.ts` | Export PNG/PDF/AI |
| `frontend/lib/editor/data/products-data.ts` | Product dimensions and constraints |
| `frontend/store/design.store.ts` | Design state (Zustand) |
