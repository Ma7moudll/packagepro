# SPEC-022: Search & Filter

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P1 — Important  
> **Dependencies:** SPEC-003 (Orders), SPEC-002 (Design)

---

## 1. What

Advanced search and filter across the platform:

**Search Entities:**
- Orders: by ID, customer name, product type, status, date range
- Products: by type, material, price range, eco-friendly
- Designs: by name, product type, date, customer
- Vendors: by name, capability, location, quality score
- Customers: by name, company, tier, order count

**Search Features:**
- Full-text search with fuzzy matching
- Typo tolerance (e.g., "box" matches "mailer box")
- Synonyms (e.g., "package" matches "box", "mailer")
- Faceted filters: multi-select, range sliders, toggles
- Saved searches: save filter combinations
- Recent searches: last 10 searches
- Search suggestions: autocomplete

**Admin Cross-Entity Search:**
- Single search bar across orders, customers, vendors, designs
- Quick actions from search results (view, edit, export)

---

## 2. Why

Users struggle to find specific items in growing datasets. Efficient search reduces time-to-task by 70% and improves user satisfaction, especially for admins managing thousands of records.

**Business Impact:**
- Reduce search time: -70%
- Improve admin productivity: +40%
- Reduce support tickets: -30% (users find info themselves)
- Enable data-driven decisions: easy access to insights

---

## 3. Who

| Role | Search Scope |
|------|-------------|
| **Customer** | Own orders, designs, quotes |
| **Admin** | All orders, customers, vendors, designs |
| **Vendor** | Assigned orders, own profile |

---

## 4. Success Criteria

### Functional
- [ ] Full-text search: fuzzy matching, typo tolerance, synonyms
- [ ] Faceted filters: multi-select, ranges, toggles per entity
- [ ] Saved searches: name and save filter combinations
- [ ] Recent searches: last 10, quick re-access
- [ ] Autocomplete: suggestions based on popular and user history
- [ ] Performance: <300ms for datasets up to 100k records
- [ ] Admin cross-entity: single search bar, quick actions
- [ ] Filter persistence: URL-encoded filters for sharing
- [ ] Export: search results to CSV (up to 1000 rows)

### Non-Functional
- [ ] Search query <300ms
- [ ] Index updates: <1s after data change
- [ ] Support 100k records without degradation

---

## 5. Out of Scope

- AI-powered semantic search (Phase 2)
- Voice search
- Image-based search (search by design image)
- Natural language query ("show me urgent orders from last week")

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/search/search.controller.ts` | Search API |
| `backend/src/modules/search/search.service.ts` | Search logic |
| `backend/src/modules/search/dto/search-query.dto.ts` | Search validation |
| `backend/src/modules/search/indexers/order.indexer.ts` | Order search index |
| `backend/src/modules/search/indexers/product.indexer.ts` | Product search index |
| `backend/prisma/schema.prisma` | SearchIndex, SavedSearch tables |
| `frontend/components/search/GlobalSearchBar.tsx` | Universal search bar |
| `frontend/components/search/SearchResults.tsx` | Results display |
| `frontend/components/search/FacetFilters.tsx` | Filter sidebar |
| `frontend/components/search/SavedSearches.tsx` | Saved searches list |
| `frontend/components/search/RecentSearches.tsx` | Recent searches dropdown |
