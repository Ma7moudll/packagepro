# SPEC-023: Multi-Language (i18n) Support

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P0 — Core Feature  
> **Dependencies:** None (foundation layer)

---

## 1. What

Full internationalization support:

**Languages:**
- Arabic (RTL) — primary for MENA region
- English (LTR) — international customers

**UI Localization:**
- All text externalized in translation files
- No hardcoded strings in code
- RTL support: layouts, components, animations adapt to direction
- Date/number formatting per locale

**Content Localization:**
- Emails: bilingual templates
- PDFs: invoices, POs, shipping labels in customer language
- Notifications: in-app and push in user language
- Product descriptions: translated

**Technical:**
- Translation files: JSON per language, per namespace
- Language detection: browser preference, user setting
- Language switcher: persistent across sessions
- Fallback: Arabic if translation missing
- Pluralization: proper handling (1 box, 2 boxes)

---

## 2. Why

PackagePro serves the MENA region where Arabic is primary. Full localization builds trust, improves accessibility, and increases conversion rates by 40% for Arabic-speaking users.

**Business Impact:**
- Increase Arabic user conversion: +40%
- Improve accessibility: WCAG compliance
- Expand market: English for international growth
- Build trust: native language experience

---

## 3. Who

| Role | Language Preference |
|------|---------------------|
| **Arabic-speaking Customer** | Full Arabic UI, emails, PDFs |
| **English-speaking Customer** | Full English UI, emails, PDFs |
| **Admin** | Can switch language; customer communications respect customer preference |

---

## 4. Success Criteria

### Functional
- [ ] UI: 100% text externalized, no hardcoded strings
- [ ] RTL support: all layouts, components, animations direction-aware
- [ ] Date formatting: Hijri option for Arabic; Gregorian for English
- [ ] Number formatting: Arabic numerals (٠١٢٣٤٥٦٧٨٩) for Arabic
- [ ] Currency: display in user preference with proper formatting
- [ ] Emails: bilingual templates, send in customer language
- [ ] PDFs: generated in customer language (invoices, POs, labels)
- [ ] Language switcher: persistent, detect browser default
- [ ] Translation management: JSON files, easy to add languages
- [ ] Pluralization: correct forms for all languages

### Non-Functional
- [ ] Language switch: <1s (no full page reload)
- [ ] Translation load: <100ms
- [ ] RTL layout: no visual glitches, proper alignment

---

## 5. Out of Scope

- Machine translation for user-generated content
- Additional languages beyond Arabic and English (Phase 2)
- Regional dialect support (Egyptian, Gulf, etc.)
- Right-to-left font optimization (Phase 1.5)

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `frontend/locales/ar/` | Arabic translations |
| `frontend/locales/en/` | English translations |
| `frontend/locales/ar/common.json` | Common Arabic strings |
| `frontend/locales/ar/orders.json` | Order-specific Arabic strings |
| `frontend/locales/ar/emails.json` | Email template Arabic strings |
| `frontend/locales/en/common.json` | Common English strings |
| `frontend/lib/i18n/config.ts` | i18n configuration (next-intl) |
| `frontend/components/i18n/LanguageSwitcher.tsx` | Language switcher |
| `frontend/components/i18n/RTLProvider.tsx` | RTL direction provider |
| `frontend/middleware.ts` | Language detection middleware |
