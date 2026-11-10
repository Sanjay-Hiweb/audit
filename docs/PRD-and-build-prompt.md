# Universal Retail Stock Audit System

## Product Requirements Document (PRD) and Implementation Build Prompt

**Version:** 1.0\
**Date:** 4 November 2026\
**Product direction:** Multi-business, universal retail stock auditing,
mobile-first

------------------------------------------------------------------------

# Part A --- Product Requirements Document

## 1. Product summary

Build a mobile-first web application that replaces paper-based retail
stock audits with a structured digital workflow. Multiple independent
businesses can register and manage their own products, branches,
employees, audits, stock counts, discrepancies, reports, and audit
history.

The application itself is the primary place to view and manage stock
audit information. Excel is an optional import/export format, not the
main interface.

Version 1 must support different retail categories without being
hardcoded for clothing. Examples include clothing, footwear, groceries,
electronics, cosmetics, hardware, and wholesale products.

## 2. Product goals

1.  Let an owner see the business's products and stock information
    clearly inside the application.
2.  Let owners import an existing expected-stock list or create products
    manually.
3.  Let multiple employees count physical stock during the same audit
    using their phones.
4.  Consolidate employee counts without silently overwriting entries.
5.  Compare expected quantities with physical counts and calculate
    shortages and excesses.
6.  Give owners clear, searchable, filterable audit results and
    professional PDF/Excel exports.
7.  Preserve an audit history and make changes traceable.
8.  Make the experience excellent on mobile, because employees and many
    owners will primarily use phones.

## 3. Non-goals for Version 1

-   Full point-of-sale billing.
-   Purchasing, supplier payments, accounting, or GST filing.
-   Continuous GPS tracking of employees.
-   Live location surveillance.
-   Complex warehouse automation.
-   AI demand forecasting.
-   Replacing every existing inventory or ERP system.
-   Native Android/iOS applications. Version 1 is a responsive web
    application and should be installable as a Progressive Web App (PWA)
    where supported.

## 4. User roles and permissions

### Business owner

-   Registers and manages a business.
-   Creates branches and invites/manages managers.
-   Creates and schedules audits.
-   Imports and manages product master data and expected stock.
-   Creates employee audit access.
-   Reviews product requests.
-   Reviews, approves, locks, and reopens audits subject to recorded
    reasons.
-   Views all business audit data and history.
-   Generates PDF and Excel reports.

### Manager (permission-based)

-   Can create/manage audits if granted permission.
-   Can assign categories, zones, or product groups to employees.
-   Can review submitted counts and discrepancies if granted permission.
-   Cannot access another business's data.
-   Cannot change owner-level settings unless explicitly permitted.

### Employee / auditor

-   Joins a specific audit using an audit code and a short-lived access
    credential or PIN.
-   Sees only the assigned audit and permitted work area.
-   Enters physical counts and submits work.
-   Can request a missing product to be added.
-   Cannot directly create or edit the official product master.
-   Cannot approve their own product requests.
-   Cannot view unrelated business data or owner-only reports.

Important security note: an audit code alone is a shared secret, not
proof of identity. Use a separate employee PIN or owner-issued invite
token for accountability. Do not rely on a permanent universal code.

## 5. Core user journeys

### 5.1 Business onboarding

1.  Owner creates an account using email and password.
2.  Owner verifies email.
3.  Owner creates a business profile: business name, business type,
    country, time zone, and optional logo/contact details.
4.  Owner can create one or more branches.
5.  System creates an isolated tenant/business record.
6.  Owner lands on the business dashboard.

### 5.2 Product and expected-stock setup

The owner can: - Add products manually. - Create categories and optional
subcategories. - Define product attributes/variants suitable for the
business. - Import products and expected quantities from CSV/XLSX. -
Review import preview, validation errors, and duplicates before
confirming. - Download a sample import template.

Product model must be universal. Do not hardcode fields such as clothing
size or colour into the core schema. Support configurable attributes and
variants, for example: - Clothing: colour, size, brand. - Footwear:
size, colour, model. - Electronics: brand, model, storage, serial/IMEI
where appropriate. - Grocery: brand, weight, batch/lot, expiry date
where appropriate. - Cosmetics: brand, shade, volume.

For Version 1, support common fields (SKU/product code, product name,
category, brand, unit of measure) plus configurable variant attributes.
Avoid collecting sensitive customer information.

### 5.3 Create an audit

Owner or authorized manager: 1. Selects business branch. 2. Enters audit
name, date, scope, notes, and optional deadline. 3. Chooses all products
or selected categories/zones. 4. Chooses whether employees count
assigned groups or work from a shared unassigned list. 5. Assigns
employees or creates employee access invitations. 6. System creates a
unique audit ID and join code/token. 7. Owner shares access details with
employees.

### 5.4 Employee stock counting on mobile

Employee opens the mobile web link or PWA: 1. Enters audit code and
employee PIN/invite token. 2. Sees audit name, assigned category/zone,
instructions, and progress. 3. Searches or scans a product barcode if
available. 4. Selects product and variant. 5. Enters physical quantity
using a large numeric input. 6. Saves the count. 7. Adds notes or marks
an item for recount when needed. 8. Continues to the next item. 9.
Reviews and submits the assigned section.

The count-entry interface must minimize taps. Use a fast,
spreadsheet-like list on larger screens and mobile-friendly cards/rows
on phones. Do not force employees through a long multi-screen form for
every product.

### 5.5 Missing product request and owner authorization

Employees cannot directly add official products. 1. Employee selects
"Request missing product". 2. Employee enters product details and
optional photo/barcode. 3. Request is saved as pending. 4.
Owner/authorized manager reviews, edits, approves, or rejects. 5. On
approval, product is added to the product master and can be counted. 6.
The approval event is logged.

Do not make a reusable permanent owner code the only control. Prefer
owner approval in the authenticated owner panel. If a one-time code is
also used, it must be random, single-use, short-lived, bound to the
specific request and business, and stored hashed. The employee must not
approve their own request.

### 5.6 Review, approval, and report

1.  Employees submit their assigned sections.
2.  System validates completeness and flags uncounted products.
3.  Owner/manager sees a consolidated audit.
4.  System calculates expected, actual, variance, shortage, and excess.
5.  Owner reviews exceptions and may request recounts.
6.  Owner approves and locks the audit.
7.  System generates a final report and stores a snapshot.
8.  Owner can export PDF/Excel and revisit the audit later.

## 6. Functional requirements

### FR-01 Multi-business tenancy

-   Support multiple independent businesses from Version 1.
-   Every business-owned record must contain a business/tenant
    identifier.
-   Enforce tenant isolation on the server for every read/write.
-   Never rely only on frontend filtering for security.

### FR-02 Authentication and access

-   Owner/manager authentication.
-   Employee audit access using scoped invitation/code plus PIN/token.
-   Role-based permissions.
-   Session expiry and revocation.
-   Rate limiting and protection against guessing audit codes.

### FR-03 Product master

-   CRUD for products and categories for authorized users.
-   Configurable attributes and variants.
-   SKU/barcode support where available.
-   Active/inactive status.
-   Duplicate detection and merge workflow where safe.
-   Preserve product identifiers referenced by historical audits.

### FR-04 Expected inventory

-   Store expected quantities separately from physical count entries.
-   Support CSV/XLSX import with preview and validation.
-   Record import source, date, user, and import batch.
-   Do not overwrite existing expected inventory without preview and
    confirmation.
-   Allow a business to start an audit without an existing
    expected-stock list; mark expected quantity as unavailable rather
    than assuming zero.

### FR-05 Audit management

-   Create, edit draft, start, pause, submit, review, approve, lock, and
    archive audits.
-   Scope audit by branch/category/zone/product set.
-   Assign employees and track section status.
-   Prevent overlapping active audits for the same product/branch unless
    explicitly allowed by an authorized owner.

### FR-06 Count entries

Each count entry records: - Audit ID. - Business ID. - Product and
variant ID. - Counted quantity and unit. - Employee identity/access
reference. - Timestamp. - Optional note/photo. - Entry status
(draft/submitted/recounted/accepted). - Device/client metadata limited
to what is necessary for security and troubleshooting.

Use append-only or versioned corrections. Do not silently overwrite a
submitted count. A correction must preserve the original value, new
value, actor, timestamp, and reason.

### FR-07 Consolidation and discrepancy calculations

For each product/variant: - Expected quantity. - Actual counted
quantity. - Variance = actual minus expected. - Shortage = max(expected
minus actual, 0). - Excess = max(actual minus expected, 0).

If multiple employees count the same item, do not blindly sum duplicate
counts. Use assignment/ownership rules and explicit recount/verification
logic. The system must distinguish: - Separate variant counts that
should be added. - Duplicate counts of the same variant that require
review. - Recounts that supersede a prior count only after an authorized
decision.

### FR-08 Owner dashboard and product visibility

The app is the primary interface. Owner dashboard includes: - Total
products and variants. - Expected units where available. - Counted
units. - Shortage and excess totals. - Audit completion. - Pending
product requests. - Recent audits and exceptions.

Provide a searchable, filterable, sortable product table. Product detail
view includes current product master, variants, expected stock, latest
actual count, discrepancy, count history, and related audit records.

### FR-09 Reports

In-app report views: - Overall audit summary. - Product-wise report. -
Category-wise report. - Variant/attribute breakdown. - Shortage
report. - Excess report. - Not-counted/unresolved items. - Employee
contribution report. - Audit activity and correction history.

Export: - PDF report with business, branch, audit details, summary, line
items, exceptions, approval information. - Excel workbook with separate
sheets for summary, product counts, discrepancies, employee
contributions, and unresolved items.

### FR-10 Audit history and comparison

-   List previous audits.
-   Search by date, branch, status, and audit name.
-   Compare two approved audits for the same product/variant where
    possible.
-   Clearly label changes in scope or product mapping that make
    comparisons unreliable.

### FR-11 Mobile-first and PWA

Mobile is the primary design target, not a later responsive
adjustment. - Responsive layouts for small Android phones, larger
phones, tablets, and desktop. - Touch targets at least approximately
44x44 CSS pixels. - Large numeric quantity inputs and mobile numeric
keyboard. - Sticky Save/Submit controls where useful. - Clear progress
and status indicators. - Fast product search with debouncing. - Camera
barcode scanning only after permission is granted; manual search remains
available. - PWA manifest, app icon, install prompt guidance, and
standalone display where supported. - Accessible contrast, readable
typography, and clear validation messages. - Avoid horizontal scrolling
for core tasks. - Test on Android Chrome and common mobile viewport
sizes.

Offline support should be implemented only if it can be made reliable.
If included, queue unsent entries locally, clearly show "Not synced",
sync safely when online, and handle conflicts. Never tell the user a
count is saved to the server when it exists only on the device.

### FR-12 Data integrity and backups

-   Use database transactions for related operations.
-   Validate quantities (non-negative, appropriate decimal/unit rules).
-   Keep audit snapshots after approval.
-   Provide scheduled backup/export strategy.
-   Define restore procedure and test it.
-   Record important security and administrative events.

## 7. UX and design requirements

-   Professional, clean, calm interface.
-   Mobile-first design; desktop should take advantage of wider tables.
-   Avoid dense desktop tables squeezed onto phones.
-   Use cards or compact stacked rows on mobile.
-   Use consistent terminology: Expected, Counted, Variance, Shortage,
    Excess.
-   Distinguish "not counted" from "counted as zero".
-   Empty states should explain the next action.
-   Confirm destructive or irreversible actions.
-   Provide loading, success, error, and offline states.
-   Make the employee counting workflow usable with one hand where
    practical.

## 8. Suggested information architecture

### Owner/manager

-   Dashboard
-   Products
-   Categories & attributes
-   Inventory / Expected stock
-   Audits
-   Employees & access
-   Product requests
-   Reports
-   Audit history
-   Business settings

### Employee

-   Join audit
-   My assigned work
-   Count products
-   Missing product request
-   Review my entries
-   Submit section

## 9. Suggested data model

Use a relational schema in Cloudflare D1. Suggested tables:

-   businesses
-   business_users
-   branches
-   categories
-   attribute_definitions
-   products
-   product_variants
-   variant_attribute_values
-   inventory_snapshots
-   inventory_import_batches
-   audits
-   audit_assignments
-   audit_scopes
-   audit_count_entries
-   audit_count_revisions
-   product_requests
-   product_request_events
-   audit_approvals
-   audit_activity_logs
-   report_records
-   employee_access_tokens
-   sessions (if application-managed)

Include foreign keys, indexes, unique constraints, created_at/updated_at
timestamps, and tenant/business IDs where relevant. Use migrations.
Define cascade behavior carefully so historical audit records are not
deleted when a product is archived.

## 10. Technical architecture

Recommended initial stack: - Frontend: React + TypeScript. - Styling:
Tailwind CSS. - Hosting: Cloudflare Pages (or Cloudflare's current
recommended static frontend deployment path). - API/backend: Cloudflare
Workers. - Relational database: Cloudflare D1. - Optional file storage:
Cloudflare R2 for business logos, import files, and report files if
persistent storage is needed. - PDF generation: a maintained PDF library
such as jsPDF or server-side generation where appropriate. - Excel
import/export: SheetJS or another suitable maintained library; verify
licensing and package suitability before production. - Validation:
shared schema validation on client and server. - Testing: unit,
integration, and end-to-end tests.

Do not promise that hosting is permanently free. Cloudflare has plan
limits and pricing can change. Design for the free allowance initially,
monitor usage, and document what happens if limits are exceeded. The
domain is not necessarily the only possible cost: email delivery, file
storage, backups, monitoring, and higher usage may introduce costs.

## 11. Security and privacy

-   Enforce tenant isolation server-side.
-   Hash passwords using a proven authentication provider/library; do
    not invent authentication cryptography.
-   Hash employee access tokens/PINs at rest where appropriate.
-   Rate-limit login, join-code, and product-authorization endpoints.
-   Use secure, httpOnly cookies where compatible, CSRF protection, and
    secure headers.
-   Validate and authorize every API request.
-   Prevent IDOR vulnerabilities by checking business ownership on every
    record.
-   Do not expose secrets in frontend code.
-   Do not store unnecessary personal data or track GPS by default.
-   Add audit logs for approvals, corrections, exports, and permission
    changes.
-   Provide account deletion/data export procedures consistent with
    applicable law.

## 12. Acceptance criteria

Version 1 is ready for pilot only when:

1.  Two separate businesses can register and cannot access each other's
    data.
2.  An owner can create a product, category, and variant.
3.  An owner can import a valid stock file and see a preview before
    confirmation.
4.  An audit can be created and joined by authorized employees on
    Android phones.
5.  Employees can enter and save counts without accidental duplicate
    submissions.
6.  The system distinguishes zero, not counted, and expected quantity
    unavailable.
7.  Multiple employees can submit different assigned products to the
    same audit.
8.  Duplicate/recount conflicts are flagged and resolved explicitly.
9.  Owner can see all products and audit results in the application.
10. Variance, shortage, and excess calculations pass tested examples.
11. Product requests require owner/authorized approval.
12. Approved audits preserve a final snapshot and correction history.
13. PDF and Excel exports match the in-app report totals.
14. Core employee and owner workflows work at mobile widths without
    horizontal scrolling.
15. Server-side authorization tests prove tenant isolation.
16. Backup and restore procedures are documented and tested.

## 13. Delivery phases

Build in this order, but keep the complete Version 1 architecture in
view:

1.  Project setup, database schema, migrations, authentication, tenant
    isolation.
2.  Business, branch, roles, and permissions.
3.  Product master, configurable attributes, and inventory import.
4.  Audit creation, employee access, and assignments.
5.  Mobile-first count-entry workflow and safe persistence.
6.  Consolidation, discrepancy engine, duplicate/recount handling.
7.  Owner dashboard, product detail, and in-app reports.
8.  Approval, audit locking, history, and comparisons.
9.  PDF/Excel exports.
10. PWA, mobile testing, security testing, backup/restore, deployment.

------------------------------------------------------------------------

# Part B --- Master Build Prompt

You are a senior full-stack product engineering team. Build a
production-minded Version 1 of a Universal Retail Stock Audit System
using the PRD above as the source of truth.

## Operating rules

1.  Read and understand the entire PRD before coding.
2.  Do not silently omit requirements. If a requirement is technically
    unsafe, contradictory, or too large, explain the issue and propose a
    concrete implementation that preserves the product goal.
3.  Do not hardcode the application for clothing. Use configurable
    categories, products, variants, and attributes.
4.  Mobile-first is mandatory. Design and test the primary workflows on
    Android-sized screens before polishing desktop.
5.  The application, not Excel, is the primary user interface and source
    of truth.
6.  Expected inventory, physical count entries, and approved audit
    snapshots must be separate records.
7.  Never silently overwrite submitted count entries or approved audit
    results.
8.  Do not use Firebase.
9.  Use React + TypeScript, Tailwind CSS, Cloudflare Workers, and
    Cloudflare D1. Use Cloudflare Pages or the current appropriate
    Cloudflare frontend deployment approach.
10. Do not claim that any service is permanently free. Respect current
    plan quotas and identify possible costs.
11. Do not place secrets in frontend code.
12. Enforce business/tenant isolation in backend authorization, not
    merely in the UI.
13. Do not use fake data in production workflows. Clearly mark seeded
    demo data.
14. Do not leave core buttons nonfunctional or use placeholder screens
    as completed features.
15. Do not claim deployment, testing, or integration succeeded unless it
    was actually verified.

## Before implementation

Produce: - Architecture overview. - Database ERD or Mermaid diagram. -
Database migration plan. - API endpoint list with request/response
contracts. - Role/permission matrix. - Mobile screen map and key
interaction flows. - Import file format and validation rules. - Audit
discrepancy and duplicate-count rules. - Security threat checklist. -
Test plan.

Identify any unresolved product decisions. Use sensible defaults for
non-blocking details; ask only for decisions that materially change
architecture or business rules.

## Implementation requirements

### Frontend

-   React + TypeScript.
-   Tailwind CSS.
-   Reusable components and clear feature-based folder structure.
-   Responsive mobile-first layout.
-   Accessible forms, labels, focus states, and validation.
-   Large quantity inputs and appropriate mobile keyboard.
-   Search, filters, pagination or virtualized lists for large product
    sets.
-   Employee count entry optimized for minimal taps.
-   PWA support where practical.

### Backend

-   Cloudflare Workers API.
-   D1 relational database with migrations and foreign keys.
-   Server-side validation and authorization.
-   Tenant-aware data access in every handler.
-   Transactions for multi-step writes.
-   Rate limits on authentication and audit joining.
-   Structured error responses.
-   Idempotency protection for count submissions where appropriate.

### Core business logic

-   Implement expected vs actual inventory calculations correctly.
-   Do not treat missing expected stock as zero.
-   Distinguish not counted from a physical count of zero.
-   Prevent accidental duplicate counting.
-   Support assigned product groups and explicit recounts.
-   Record who counted each item and when.
-   Preserve original count values when corrections are made.
-   Require owner/authorized manager approval for product requests.
-   Lock approved audit snapshots against silent edits.

### Imports and reports

-   Validate CSV/XLSX imports and show a preview.
-   Report invalid rows with reasons and allow correction.
-   Generate in-app reports first.
-   Generate PDF and Excel exports from the same verified report data.
-   Ensure export totals reconcile exactly with the in-app report.

### Mobile and PWA

-   Test on narrow Android screens.
-   No horizontal scrolling for primary employee tasks.
-   Use touch-friendly controls.
-   Show explicit save/sync state.
-   If offline queueing is implemented, resolve conflicts and never
    misrepresent unsynced data as saved centrally.
-   Ask for camera permission only when barcode scanning is requested.
-   Manual product search must always remain available.

## Testing requirements

Create automated tests for: - Tenant isolation. - Role permissions. -
Product and variant creation. - Import validation. - Audit creation and
joining. - Count submission and idempotency. - Duplicate count/recount
behavior. - Variance/shortage/excess calculations. - Product approval
workflow. - Audit locking and correction history. - PDF/Excel total
reconciliation.

Include end-to-end tests for owner and employee journeys on mobile
viewport sizes.

## Delivery expectations

Deliver: 1. Complete source code. 2. Clear project folder structure. 3.
Database migrations and seed/demo data. 4. `.env.example` with no real
secrets. 5. Local development instructions. 6. Cloudflare deployment
instructions. 7. Test instructions and test results. 8. Backup/restore
instructions. 9. Known limitations and plan/quota assumptions. 10. A
concise handover guide for the owner and employees.

Work incrementally. After each major module, run tests and fix failures
before continuing. Keep a checklist of PRD requirements and mark each as
implemented, tested, or blocked. Do not call the project complete until
the acceptance criteria have been verified.
