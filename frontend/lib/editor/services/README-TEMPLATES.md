# Template System Services

This directory contains services for the template system in PackagePro editor.

## Services

### 1. Template Service (`template-service.ts`)
- **Purpose**: CRUD operations for templates
- **Features**:
  - Create, read, update, delete templates
  - Search templates with filters
  - Get popular templates
  - Get templates by category
  - Add and retrieve ratings
  - Load template into editor

### 2. Template Search (`template-search.ts`)
- **Purpose**: Advanced search with Algolia integration
- **Features**:
  - Search with query and filters
  - Algolia integration (when configured)
  - Index templates for search
  - Remove templates from index

## API Routes

### `/api/packagepro/templates`
- `GET`: List templates (with optional filters)
- `POST`: Create new template

### `/api/packagepro/templates/search`
- `GET`: Search templates with filters and pagination

### `/api/packagepro/templates/[id]`
- `GET`: Get template by ID
- `PUT`: Update template
- `DELETE`: Delete template

### `/api/packagepro/templates/[id]/ratings`
- `GET`: Get template ratings
- `POST`: Add rating to template

### `/api/packagepro/templates/slug/[slug]`
- `GET`: Get template by slug

### `/api/packagepro/templates/popular`
- `GET`: Get popular templates

## Database Schema

### Template
```typescript
{
  id: string
  slug: string
  name: string
  description: string
  category: TemplateCategory
  style: TemplateStyle
  thumbnailUrl: string
  preview3DUrl?: string
  designState: DesignCoreState
  createdBy: string
  isPublic: boolean
  tags: string[]
  avgRating: number
  ratingsCount: number
  createdAt: string
  updatedAt: string
}
```

### TemplateRating
```typescript
{
  id: string
  templateId: string
  userId: string
  userName?: string
  userAvatar?: string
  rating: number // 1-5
  comment?: string
  createdAt: string
}
```

## Usage

### Create Template

```typescript
import { createTemplate } from "@/lib/editor/services/template-service"

const template = await createTemplate({
  name: "My Template",
  description: "A great template",
  category: "box",
  style: "modern",
  tags: ["minimal", "clean"],
  designState: currentDesignState,
  thumbnailDataUrl: "...",
})
```

### Search Templates

```typescript
import { searchTemplates } from "@/lib/editor/services/template-service"

const result = await searchTemplates(
  {
    category: "box",
    style: "modern",
    minRating: 4,
    searchQuery: "minimal",
  },
  1,
  20
)
```

### Load Template into Editor

```typescript
import { getTemplate, loadTemplateIntoEditor } from "@/lib/editor/services/template-service"

const template = await getTemplate(templateId)
const designState = loadTemplateIntoEditor(template)
// Apply to editor store
```

## Algolia Integration

To enable Algolia search:

1. Install Algolia:
```bash
npm install algoliasearch
```

2. Set environment variables:
```env
NEXT_PUBLIC_ALGOLIA_APP_ID=your_app_id
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=your_search_key
ALGOLIA_ADMIN_KEY=your_admin_key
```

3. Configure index in Algolia dashboard with fields:
   - name (searchable)
   - description (searchable)
   - category (facet)
   - style (facet)
   - tags (searchable, facet)
   - avgRating (numeric)

4. Index templates when created/updated:
```typescript
import { templateSearchService } from "@/lib/editor/services/template-search"

await templateSearchService.indexTemplate(template)
```

## Notes

- Current implementation uses in-memory storage (mock database)
- In production, replace with actual database (PostgreSQL, MongoDB, etc.)
- Algolia integration is optional but recommended for better search
- Template thumbnails should be generated from design state
- Ratings are automatically aggregated in template stats

