# Deployment checklist

- [ ] Install dependencies and run `npm run typecheck` and `npm run build`.
- [ ] Create Cloudflare D1 database and replace placeholder database ID in `wrangler.toml`.
- [ ] Apply D1 migrations locally, then remotely after checking the target account.
- [ ] Complete security review of Worker routes and add rate limiting.
- [ ] Add business and branch authorization checks to every data route.
- [ ] Integrate React screens with the Worker API; remove localStorage demo persistence for production.
- [ ] Implement employee product-request approval, count revisions, and audit locking endpoints.
- [ ] Implement report endpoints scoped to audit + branch.
- [ ] Test two independent businesses for tenant isolation.
- [ ] Test owner and employee flows on Android Chrome.
- [ ] Configure Cloudflare Pages build: `npm run build`, output `dist`.
- [ ] Configure Worker API route/domain and production environment bindings.
- [ ] Verify backups, restore procedure, and quotas before inviting a real client.
