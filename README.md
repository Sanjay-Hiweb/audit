# Countly — Universal Retail Stock Audit (V1 starter)

A mobile-first React + TypeScript starter for a multi-business stock audit product. It includes a working browser demo UI, product catalogue, product creation, CSV/XLSX import, audit creation, join-code display, count entry, discrepancy display, and PDF/XLSX export. A Cloudflare Worker API and D1 schema are included as the production backend foundation.

## Important current status

**This is a functional front-end prototype, not a production-ready multi-user deployment yet.** The visible app currently stores demo data in the current browser's `localStorage`. The Worker API and D1 migration are included separately but are not yet wired into the React screens. Employee PIN/invite management, owner approval UI, full branch-aware stock snapshots, conflict resolution, offline queueing, and production authentication hardening still need integration and testing. Do not enter real confidential business data until the backend is connected and security-tested.

## Requirements

- Node.js 20 or newer
- npm
- Cloudflare account for deployment (you sign in yourself; never share passwords or API tokens in chat)

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Demo records are stored in that browser only. Use the browser's local storage reset if you want to clear demo data.

## Build check

```bash
npm run typecheck
npm run build
```

## Cloudflare D1 setup

1. Install Wrangler: `npm install -g wrangler`.
2. Sign in locally: `wrangler login`.
3. Create the database: `wrangler d1 create retail-stock-audit`.
4. Copy the returned database ID into `wrangler.toml`.
5. Apply schema: `wrangler d1 migrations apply retail-stock-audit --local`.
6. For remote deployment, apply migrations with `--remote` after reviewing the target account/database.
7. Deploy Worker: `wrangler deploy`.
8. Deploy the frontend to Cloudflare Pages using the Vite build command `npm run build` and output directory `dist`.

## API endpoints currently scaffolded

- `POST /api/register`
- `POST /api/login`
- `GET /api/businesses`
- `GET /api/products?businessId=...`
- `POST /api/products`
- `POST /api/audits`
- `POST /api/audits/join`
- `POST /api/audits/count`

The API is a foundation and requires a security review, rate limiting, CSRF/cookie strategy, business/branch checks on every route, duplicate-count/recount rules, product approval endpoints, report endpoints, and integration tests before production.

## Import template

The first worksheet should contain these column headings (case-insensitive aliases are supported by the demo importer):

`SKU | Product | Category | Brand | Variant | Expected | Unit`

Example:

`SH-001 | Classic Cotton Shirt | Clothing | Northline | Blue / M | 42 | pcs`

## Product decisions / limitations

- No Firebase is used.
- Cloudflare plan quotas and pricing can change; do not assume the service is permanently free.
- Demo mode uses local browser storage; it does not synchronize between devices.
- The join code shown in the demo is for workflow demonstration only. Production access must use scoped, expiring employee invitations or PINs, and owner approval must be server-enforced.
- The current demo export shows the latest saved count per product across audits; production reports must be scoped to one selected audit and branch.
