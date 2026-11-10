# Countly — Universal Retail Stock Audit & Inventory Reconciliation Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-cyan.svg)](https://reactjs.org/)
[![Cloudflare D1](https://img.shields.io/badge/Cloudflare-D1%20SQLite-orange.svg)](https://developers.cloudflare.com/d1/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> A production-grade, multi-tenant retail stock audit and inventory reconciliation platform engineered for fast mobile counting, discrepancy resolution, frozen expected inventory snapshots, and 1-click ledger reconciliation.

---

## 🌟 Executive Overview

**Countly** is a universal retail stock audit platform that solves the friction between physical floor counts and theoretical system balances. Designed for physical stores ranging from boutique apparel and electronics to supermarkets and pharmacies, Countly provides:

1. **Owner / Manager Hub**: Branch-aware stock audits, frozen expected snapshots, automated discrepancy calculations, duplicate conflict resolution, recount triggers, and one-click ledger adjustment.
2. **Mobile Employee Workspace**: Fast, touch-first counting interface accessed via a 6-character Audit Code and a secure 4-digit employee PIN. No passwords or app installation required.
3. **Relational Database Backend**: Powered by Cloudflare Workers and Cloudflare D1 (SQLite), featuring an universal local adapter powered by Node.js 22's built-in `node:sqlite` for seamless zero-setup development.
4. **Author Credit**: *Developed by Rakesh, BCS Student.*

---

## 📐 Architecture & Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Layer                          │
│  React 18 + TypeScript + Tailwind CSS + Lucide Icons        │
│  • Public Marketing & Product Showcase                      │
│  • Owner / Manager Operations Hub                           │
│  • Mobile-First Employee Counting Interface                 │
│  • PDF Export (jsPDF + AutoTable) & Excel Export (xlsx)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON API
┌──────────────────────────────▼──────────────────────────────┐
│                    API & Service Layer                      │
│  Cloudflare Workers (Edge) / Vite API Middleware            │
│  • Multi-tenant session verification & PBKDF2 cryptography  │
│  • Frozen snapshot capture at audit commencement            │
│  • Duplicate conflict detection & atomic recount requests    │
│  • Centralized Discrepancy Calculation Engine                │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQL Transactions
┌──────────────────────────────▼──────────────────────────────┐
│                      Data Store                             │
│  Cloudflare D1 / SQLite with Foreign Keys & Indexes         │
│  • 17 Normalized Relational Tables                          │
│  • Strict Multi-Tenant Partitioning (business_id scoping)   │
│  • Full Audit Logs, Count Revisions & Inventory Movements   │
└─────────────────────────────────────────────────────────────┘
```

### Core Technologies
- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React icons, jsPDF, jspdf-autotable, SheetJS (`xlsx`).
- **Backend**: Cloudflare Workers API architecture (`functions/api/worker.ts`), Cloudflare D1 SQLite.
- **Local Dev Parity**: Custom Vite API plugin (`vite-api-plugin.ts`) backed by Node 22's built-in `node:sqlite`, providing exact parity with Cloudflare D1 locally without external emulators.
- **Security & Cryptography**: Web Crypto PBKDF2 password hashing (210,000 iterations), 4-digit PIN hashing (100,000 iterations), SHA-256 session token hashing, timing-safe equality checks.

---

## 🧮 The 6 Mandatory Calculation Engine Cases

Countly guarantees mathematical consistency across all stock reconciliation views through its centralized calculation engine (`src/lib/calculations.ts` and `functions/api/calculations.ts`).

| Case | Scenario | Expected | Actual | Variance | Status | Business Meaning |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Case 1** | Shortage | `50` | `44` | `-6` | `Shortage` | Stock lost, stolen, or misplaced. Units missing from floor. |
| **Case 2** | Excess | `30` | `35` | `+5` | `Excess` | Unrecorded stock receipt or mislabeling. Extra units present. |
| **Case 3** | Matched | `20` | `20` | `0` | `Matched` | Perfect agreement between system record and physical count. |
| **Case 4** | Expected Unavailable | `NULL` | `12` | `NULL` | `Variance Unavailable` | Product physically found but not in system catalogue. |
| **Case 5** | Not Counted | `15` | `NULL` | `NULL` | `Not Counted` | Expected item never counted by any auditor. **Not treated as zero.** |
| **Case 6** | Physical Zero | `15` | `0` | `-15` | `Shortage` | Verified physical absence. Explicit 0 entered by staff. |
| **Special** | Duplicate Conflict | Any | Multiple | Flags | `Conflict` | Different staff members submitted conflicting counts. |

### Duplicate Conflict Rules
- If two or more staff members submit counts for the same variant without an owner resolution, the line is flagged as a `Duplicate Conflict`.
- **Approval Blocking**: The system strictly prevents an audit from being approved while unresolved conflicts exist.
- **Resolution**: The owner can review individual auditor submissions, select a winning count or specify an override with audit notes, which unblocks approval.

---

## 🗄️ Relational Database Schema

The database consists of 17 normalized tables enforcing foreign key constraints, cascading deletions, and composite indexes:

1. `businesses`: Multi-tenant organization accounts.
2. `branches`: Store locations per business.
3. `users`: Owner and manager accounts with salted PBKDF2 password hashes.
4. `business_users`: Role bindings (`owner`, `manager`, `auditor`).
5. `sessions`: Scoped session tokens with expiration and SHA-256 tokens.
6. `categories`: Hierarchical or flat product taxonomy.
7. `products`: Universal products supporting any retail industry (clothing, electronics, grocery, hardware, cosmetics).
8. `product_variants`: SKU, barcode, size, color, specifications, price, cost.
9. `inventory_balances`: Real-time stock balance per branch/variant.
10. `inventory_movements`: Immutable stock transaction ledger (`audit_adjustment`, `manual_adjustment`, `sale`, `return`, `transfer`).
11. `audits`: Audit sessions with status (`draft`, `in_progress`, `review`, `completed`, `cancelled`).
12. `audit_expected_snapshots`: Point-in-time expected quantity frozen at audit start.
13. `audit_assignments`: Employee assignments with generated 4-digit PIN hashes.
14. `audit_count_entries`: Auditor-submitted counts with notes and timestamps.
15. `audit_count_revisions`: Revision history tracking count adjustments.
16. `product_requests`: Staff requests for uncatalogued items discovered on the floor.
17. `audit_activity_logs`: Immutable audit trail of all actions and resolutions.

---

## 🚀 Quick Start (Run Locally)

### Prerequisites
- **Node.js 20.x or 22.x** (Node 22 recommended for built-in SQLite engine).
- **npm** (v10+).

### 1. Clone & Install
```bash
git clone https://github.com/Sanjay-Hiweb/audit.git
cd audit/retail-stock-audit
npm install
```

### 2. Launch Local Development Server
```bash
npm run dev
```
The server will start at `http://localhost:5173/`. 
On first run, the local SQLite database (`.data/countly.sqlite`) is automatically initialized and pre-seeded with the **Countly Demo Store**.

### 3. Run Backend Verification Suite
You can execute the automated 26-check verification suite covering the schema, calculation engine, duplicate conflict resolution, approval locks, and multi-tenant isolation:
```bash
node --experimental-strip-types scratch/test-backend.ts
```

### 4. Build for Production
```bash
npm run typecheck
npm run build
```

---

## 🔑 Demo Access Credentials

The platform includes a pre-configured **Countly Demo Store** demonstrating all 6 calculation cases and an active duplicate conflict:

### 👔 Owner / Manager Access
- **URL**: `http://localhost:5173/` -> Click **"Sign In"** -> Click **"Quick Demo Login"**
- **Email**: `demo@countly.store`
- **Password**: `DemoStore2026!`
- **Role**: Store Owner (Full Access to Audits, Products, Inventory, Staff PINs, and Settings).

### 📱 Employee Mobile Counting Access
- **URL**: `http://localhost:5173/` -> Click **"Employee Counting"** in the top navigation
- **Audit Join Code**: `DEMO26`
- **Employee PINs**:
  - `1001` — Sarah Chen (Floor Auditor)
  - `1002` — Mike Ross (Stockroom Auditor)
  - `1003` — Alex Patel (Inventory Specialist)

---

## 📱 Features Walkthrough

### 1. Mobile-First Employee Workspace
- **Zero Friction Access**: Staff simply enter the 6-character Audit Code (e.g. `DEMO26`) and their assigned 4-digit PIN.
- **Large Stepper Buttons**: Touch-friendly `+` / `-` buttons, numeric keyboard input, and quick zero (`0`) button for verified stockouts.
- **Recount Alerts**: If an owner requests a recount on a specific item, the employee workspace highlights that item with a prominent warning banner.
- **Floor Item Discovery**: If staff find a product that is not in the system, they can tap **"Request Missing Product"** to submit the barcode, name, and count directly to the owner review queue.

### 2. Owner Review & Reconciliation Hub
- **Executive KPI Cards**: Real-time summary of Total Expected, Total Counted, Matched Units, Shortages, Excesses, and Net Discrepancy Value.
- **Case Filtering**: Instant tabbed filtering by `All`, `Shortages`, `Excesses`, `Matched`, `Not Counted`, `Uncatalogued`, and `Conflicts`.
- **Conflict Resolver**: Visual side-by-side comparison of conflicting staff submissions with single-click resolution.
- **Approval Locking**: Audits in `review` cannot be finalized until all conflicts are resolved. Once approved, the audit is permanently locked to prevent tampering.
- **1-Click Ledger Sync**: Upon approval, owners can click **"Reconcile Inventory"** to automatically generate balancing inventory ledger transactions and update live branch stock.

### 3. Universal Product Catalogue & Inventory Management
- **Cross-Industry Variants**: Manage products with multiple attributes (Size, Color, Material, Flavor, Pack Size, Voltage, etc.).
- **Bulk CSV / Excel Import**: Intelligent column mapper accepting `.csv`, `.xlsx`, and `.xls` files with preview and error checking.
- **Movement Ledger**: Complete historical log of stock adjustments with before/after snapshots and user attribution.

### 4. Scoped Export Engine
- **Formal Audit PDF Report**: Generates a branded, printable audit summary report with executive metrics, breakdown tables, and signature blocks.
- **Detailed Reconciliation Excel**: Exports a comprehensive multi-column workbook with expected balances, physical counts, unit variances, and financial variance values.

---

## ☁️ Cloudflare Production Deployment

Countly is architected for deployment to Cloudflare's edge platform:

### 1. Configure Cloudflare D1 Database
```bash
# Log in to your Cloudflare account
npx wrangler login

# Create production D1 database
npx wrangler d1 create retail-stock-audit

# Apply relational schema migrations
npx wrangler d1 migrations apply retail-stock-audit --remote
```

### 2. Configure `wrangler.toml`
Update the `database_id` in `wrangler.toml` with the ID generated in step 1:
```toml
name = "retail-stock-audit"
main = "functions/api/worker.ts"
compatibility_date = "2024-04-01"

[[d1_databases]]
binding = "DB"
database_name = "retail-stock-audit"
database_id = "<YOUR_D1_DATABASE_ID>"
```

### 3. Deploy Worker API & Static Assets
```bash
# Deploy Edge Worker API
npx wrangler deploy

# Deploy Frontend to Cloudflare Pages
npm run build
npx wrangler pages deploy dist --project-name retail-stock-audit
```

---

## 🛡️ Security & Privacy Architecture

- **No Third-Party Tracker / Zero External Ads**: Strictly privacy-focused business tooling.
- **Tenant Isolation**: Every database query joins through `business_id` and enforces session ownership at the database layer. Cross-tenant access attempts return `403 Forbidden`.
- **PBKDF2 Password Protection**: High-iteration key derivation preventing rainbow table and brute-force attacks.
- **Brute-Force PIN Protection**: Employee PIN attempts are rate-limited and logged.
- **Immutable Audit Trail**: All count submissions, revisions, and status changes are recorded in `audit_activity_logs`.

---

## 👨‍💻 Author & Credits

Countly was conceived and engineered by:
**Rakesh**, BCS Student.

*Special thanks to the open-source community for React, Tailwind CSS, Lucide, and Cloudflare Workers.*

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
