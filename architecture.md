## Architecture — Service Structure (NestJS + Next.js + Three.js)

### Purpose
This file explains **how the system components are divided** and how they communicate: Backend (NestJS) + Frontend (Next.js) + 3D Layer (Three.js via React Three Fiber) + texture generation and product data services.

---

## 1) Monorepo Overview

- **`backend/` (NestJS)**: API + Business logic + Integrations + Jobs/Workers.
- **`frontend/` (Next.js)**: User interface + 2D/3D Design editor + Product display + State management.
- **`shared/`**: Shared Types/definitions between frontend and backend as needed.
- **`docs/`**: Additional documentation (already exists).

---

## 2) Backend (NestJS) — Layers and Services

### General Structure (based on existing code)
Inside `backend/src/` you will typically find:

- **`modules/`**: Modules for each domain (Auth/Users/Orders…).
- **`services/`**: Shared services (e.g., email, Handlebars templates, etc.).
- **`integrations/`**: External integrations (Gateways / Providers).
- **`workers/`**: Background tasks (Queues/Cron) if present.
- **`middleware/`**: General middleware.
- **`utils/` / `lib/`**: Helpers and Utilities.

### Request Flow Model
Client (Next.js) → API (NestJS Controller) → Service (Business Logic) → DB/Prisma/Integrations → Response

### Key Rules
- **Controller**: Thin (Validation + call service).
- **Service**: Source of truth for business logic.
- **Data access**: Via Prisma/Repository (based on existing implementation).
- **Workers**: For heavy tasks (generation/rendering/sending…).

---

## 3) Frontend (Next.js) — Editor + Rendering

### Main Breakdown
- **`frontend/app/`**: Pages/Routes (Next App Router).
- **`frontend/components/`**: UI components (including editor/layout).
- **`frontend/lib/`**: Data/service/Generator logic (e.g., texture generator).
- **`frontend/store/`**: State management (based on current implementation).
- **`frontend/providers/`**: Providers (Theme/Query/State…).

### Design Editor (2D/3D)

#### 2D
- 2D design layer for composing Layers (text/Shapes/Images).
- Export layers for each face to Canvas/Bitmap.

#### 3D (Three.js via `@react-three/fiber`)
- **`frontend/components/design-editor/models/BoxModels.tsx`**: Product models (MailerBox/ShippingBox…).
- **`frontend/components/editor/canvas/DesignCanvas3D.tsx`**: Scene setup (Camera/Lighting/Controls) and model composition.
- **`frontend/lib/editor/services/texture-generator.ts`**: Converts Layers → textures for each face, ignoring empty faces to reveal the base cardboard material.

**Composition Concept**:
- The Editor produces Layers.
- The Generator produces textures.
- The 3D Model applies textures to materials/faces, and leaves a default cardboard material where there is no print.

---

## 4) Three.js Materials & Textures — Realistic Materials

### What Do We Need for Realism?
- **`map`**: Base color/Texture (kraft cardboard/white…).
- **`normalMap`**: Fiber/wave details to break the "plastic feel".
- **`roughnessMap`**: Roughness variations to prevent the "wood/weird shine look".
- **`aoMap`**: Subtle corner shadow for visual depth.

### Implementation Principles
- Generate textures inside `useMemo` only (avoid recreating on every render).
- Cache materials (Material cache) by material type/inside-outside/quality… for performance.
- Separate inside material from outside (inside is typically lighter and rougher).

---

## 5) Data Services (Products/Materials) — Source of Truth

- **`frontend/lib/editor/data/products-data.ts`**:
  - Product definitions (Product types) + size presets + available materials.
  - This should be the primary reference for what appears in the UI (materials/colors/prices/description).

---

## 6) Key Integration Points Between Services

### Editor → Texture Generator → 3D
- Any change in layers or the selected face:
  - Re-generates texture for the specific face(s).
  - Applies incrementally to the 3D model to avoid performance stuttering.

### UI/State → 3D Animation
- **`openState`** (0..1) controls flap opening/closing.
- Easing (e.g., `easeInOutCubic`) is essential for realistic motion.
- Closing sequence for some products (RSC) prevents clipping overlap.

---

## 7) Quality Standards

- **Geometry**: The box should be "hollow" inside, not a solid block.
- **Flaps**: Pivot on the edge, not at the center.
- **Closing**: Smooth + sequential where needed.
- **Material**: Clear cardboard look (not wood/plastic).
- **Performance**: No texture/material creation inside the render loop.
