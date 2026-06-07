# SEO Implementation Plan

## 1. Objective
Improve the project's Search Engine Optimization (SEO) to enhance user acquisition. The focus will be on dynamic Meta/OpenGraph tags, i18n URL structure for separate language indexing, dynamic sitemap generation, and making job postings publicly accessible and indexable via JobPosting Schema.

## 2. Key Files & Context
- **Frontend Config:** `frontend/nuxt.config.ts` (needs `@nuxtjs/seo` suite, `i18n` config updates, and SSR optimizations).
- **Frontend Pages:** 
  - `frontend/app/app.vue` or `index.vue` (Global Meta tags).
  - `frontend/app/pages/jobs/[id].vue` (New public job page).
- **Backend API:** `backend/src/modules/jobs/public-jobs.controller.ts` (New module/controller to serve unauthenticated job data).

## 3. Implementation Steps

### Phase 1: Meta Tags & OpenGraph
- **Package Installation:** Install `@nuxtjs/seo` which provides `@unhead/nuxt`, `nuxt-schema-org`, and `@nuxtjs/sitemap`.
- **Global Meta Tags:** Update `frontend/app/app.vue` with `useSeoMeta` to set default titles, descriptions, and OpenGraph/Twitter card images.
- **Config:** Update `frontend/nuxt.config.ts` to include the SEO modules and configure the `site` URL.

### Phase 2: i18n URL Structure
- **Nuxt Config:** In `frontend/nuxt.config.ts`, change the `@nuxtjs/i18n` strategy from `no_prefix` to `prefix_except_default` (or `prefix`).
- **Hreflang Tags:** Ensure `baseUrl` is set in the `i18n` configuration so Nuxt automatically generates `<link rel="alternate" hreflang="...">` tags for English, Russian, and Uzbek locales.
- **Routing Update:** Verify that existing links within the app use `localePath()` to ensure they point to the correct localized URLs.

### Phase 3: Public Job Pages & Schema
- **Backend Endpoint:** Create a new `PublicJobsController` in the backend (e.g., `GET /api/v1/public/jobs/:id` and `GET /api/v1/public/jobs`) that returns only the necessary, safe data for `ACTIVE` jobs without requiring authentication.
- **Frontend Page:** Create `frontend/app/pages/jobs/[id].vue`.
  - Use SSR (`ssr: true` or RouteRules) for this route so search engines can read the content.
  - Implement `useSeoMeta` dynamically using the fetched job data.
  - Implement `useSchemaOrg` with `defineJobPosting` to generate valid JSON-LD schema for Google Jobs.

### Phase 4: Dynamic Sitemap
- **Nuxt Config Update:** Remove the static `frontend/public/sitemap.xml` and configure `@nuxtjs/sitemap` in `nuxt.config.ts`.
- **Dynamic Routes Generation:** Configure the sitemap module to fetch a list of active job IDs from the new backend endpoint (`GET /api/v1/public/jobs`) and automatically inject them into the sitemap for all active locales.

## 4. Verification & Testing
- Inspect the `<head>` of the landing page to verify default OpenGraph and Twitter tags.
- Navigate to `/ru/` or `/uz/` and verify the URL structure and `hreflang` tags.
- Load a public job URL (e.g., `/jobs/123-abc`) and verify that `JobPosting` structured data appears in the DOM.
- Access `/sitemap.xml` to ensure it generates dynamically and includes the new job URLs for all languages.
- Ensure the static `robots.txt` configuration plays well with the new dynamic routes (potentially migrating to `@nuxtjs/robots`).
