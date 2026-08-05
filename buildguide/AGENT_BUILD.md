# PC Builder — Inventory & Quotation Software
### Agent Build Specification

> Hand this file to a coding agent (Claude Code, Cursor, etc.) as the master spec.
> Build it phase by phase in the order given in Section 12. Do not skip the data model —
> everything else depends on it being right.

---

## 1. Overview

A desktop-usable, browser-based tool for a PC building shop. The owner maintains a
catalog of PC components (CPU, RAM, cabinet, keyboard, etc.), organized by category,
each with specs and pricing. He then assembles a **build** (a set of components) for a
customer and generates a professional, GST-itemized **PDF quotation** to send.

**Primary user:** shop owner / sales staff (single-user or small team, not public-facing).

---

## 2. User Story

> "I want to search my parts list, pick a CPU, motherboard, RAM, cabinet, PSU, keyboard,
> mouse etc., see the total price with GST, attach a client's name, and export a clean
> PDF quote I can WhatsApp or email to them — in under 5 minutes."

---

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite | fast, simple CRUD UIs |
| Backend | Node.js + Express | simple REST API |
| Database | SQLite (via `better-sqlite3` or Prisma) | zero-config, single-file, runs on any PC |
| PDF generation | Puppeteer (HTML→PDF) **or** `pdfkit` | Puppeteer is easier for nice-looking layouts |
| Styling | Tailwind CSS | fast to build clean UI |
| Auth | Optional — simple single-password gate (local tool, not multi-tenant) |

Agent may substitute Postgres for SQLite if the owner wants network/multi-device access later — keep the DB layer abstracted (repository pattern) so this swap is cheap.

---

## 4. Data Model

### 4.1 Category
```
Category {
  id: string          // slug, e.g. "cpu", "ram", "cabinet"
  name: string         // "CPU", "RAM", "Cabinet"
  prefix: string        // "CPU", "RAM", "CAB" — used to build product IDs
  sort_order: int
}
```

Seed categories (owner can add more later via CRUD):
`CPU, Motherboard, RAM, GPU (Graphics Card), Storage - SSD, Storage - HDD, PSU (Power Supply), Cabinet, CPU Cooler, Monitor, Keyboard, Mouse, Mousepad, Headset/Speakers, OS/Software, Cables & Others`

### 4.2 Product (Component)
```
Product {
  id: string             // auto: "<category.prefix>-0001" e.g. "CPU-0007"
  category_id: string     // FK -> Category
  brand: string            // "Intel", "Corsair", "NZXT"
  model_name: string        // "Core i5-14600K"
  specs: { key: value }[]    // free-form spec list, e.g. [{Cores:"14"},{Socket:"LGA1700"}]
  base_price: number          // price before GST, in INR
  gst_percent: number          // default 18, editable (12/18/28 all occur in this industry)
  price_after_gst: number       // AUTO-CALCULATED, never manually entered
  stock_qty: number | null       // optional, nullable if not tracking stock
  warranty: string | null         // "3 Years"
  image_url: string | null
  is_active: boolean              // soft-delete / hide from catalog
  created_at, updated_at
}
```

**price_after_gst = base_price + (base_price × gst_percent / 100)**, rounded to 2 decimals.
Recalculate on every create/update — never trust a stale stored value on read.

### 4.3 Client
```
Client {
  id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  gstin: string | null      // if client is a business
  created_at
}
```

### 4.4 Quotation (a "Build")
```
Quotation {
  id: string                  // e.g. "QTN-2026-0034"
  client_id: string            // FK -> Client
  build_name: string | null     // "Sarah's 1440p Gaming Rig"
  status: enum                   // draft | sent | accepted | rejected
  items: QuotationItem[]
  labour_charge: number | null    // optional assembly/service fee
  discount: number | null          // flat or % — pick one, be explicit in UI
  notes: string | null
  valid_until: date
  created_at, updated_at
}

QuotationItem {
  id: string
  quotation_id: string
  product_id: string        // FK -> Product (snapshot fields below protect
  product_snapshot: {         // against future price changes on old quotes)
    brand, model_name, specs, base_price, gst_percent, price_after_gst
  }
  quantity: number
  line_total: number          // price_after_gst × quantity
}
```

> **Important:** always snapshot product details into the QuotationItem at the moment
> it's added. If the owner edits a product's price next week, old sent quotations must
> NOT silently change.

---

## 5. Functional Requirements

### 5.1 Category Management (CRUD)
- List, create, edit, delete (block delete if products exist in it — offer "reassign or archive" instead).
- Reorder categories (drag-and-drop or sort_order field) — this becomes the tab/section order everywhere else.

### 5.2 Product Management (CRUD)
- Create/edit form: category select, brand, model name, dynamic spec key-value rows (add/remove rows), base price, GST % (dropdown: 0/5/12/18/28 + custom), stock qty, warranty, image upload, active toggle.
- `price_after_gst` shown live as user types base price / GST — read-only field.
- Delete = soft delete (`is_active = false`) so historical quotations referencing it still resolve via snapshot; hard-delete only if never used in any quotation.
- Bulk import via CSV (nice-to-have, Phase 5) — useful since he'll have an existing price list in Excel already.

### 5.3 Search & Filter
- Global search bar: matches brand, model_name, and spec values.
- Filter by category, brand, price range, "in stock only".
- Must be fast enough to filter-as-you-type on a catalog of a few thousand items — index the DB columns used (`category_id`, `brand`, `model_name`).

### 5.4 Quotation Builder ("Build a PC")
- Pick a client (or create new inline).
- For each category, a searchable picker to add one or more products with quantity (e.g. 2× 16GB RAM stick, but only 1 CPU — don't hard-block multi-select on any category, some builds need 2 GPUs or extra fans).
- Running summary panel: subtotal, GST breakdown (grouped by GST %, since 12%/18%/28% items will co-exist), discount, labour charge, grand total — updates live.
- Save as draft, or finalize.

### 5.5 Client Management (CRUD)
- Simple list/search/add/edit. Each client shows their quotation history.

### 5.6 PDF Export
See Section 10 for layout. Must be a single button: "Download / Send PDF" from a finalized quotation.

### 5.7 Quotation List & CRUD
- List all quotations: client, date, total, status.
- Edit a draft (add/remove items, quantities), delete drafts.
- Duplicate a quotation (handy for "same build, different client" or "same client, revised quote").
- Change status: draft → sent → accepted/rejected.

---

## 6. GST Calculation Logic (be exact — this is money math)

```
line_base        = product.base_price * quantity
line_gst_amount   = line_base * (product.gst_percent / 100)
line_total         = line_base + line_gst_amount

quotation_subtotal        = Σ line_base
quotation_gst_breakdown     = group lines by gst_percent, sum each group's gst_amount
                              (needed because Indian invoices show tax split by rate)
quotation_gst_total          = Σ all line_gst_amount

discount applied AFTER subtotal, BEFORE showing final total (state clearly in UI
whether discount is pre-tax or post-tax — recommend pre-tax, i.e. discount reduces
base_price effectively, applied on subtotal).

grand_total = quotation_subtotal - discount + quotation_gst_total + labour_charge
```
Round every currency value to 2 decimals; round only at the line level, then sum (don't round the grand total from unrounded lines — avoids off-by-a-rupee mismatches against the printed line items).

---

## 7. Non-Functional Requirements

- Runs locally on a single Windows/Mac PC with no internet dependency for core CRUD (PDF generation should also work offline).
- All data lives in one SQLite file — must support **export/backup** (copy the .db file or a "Download full backup as JSON" button) and **restore**.
- Currency formatting: ₹ with Indian digit grouping (e.g. ₹1,24,999.00).
- Responsive enough to use on a laptop; doesn't need to be mobile-first.
- No data loss on browser refresh mid-build — persist draft quotation state to DB as they go, not just in frontend memory.

---

## 8. Suggested Folder Structure

```
pc-quote-app/
├── server/
│   ├── db/
│   │   ├── schema.sql
│   │   └── seed.js
│   ├── routes/
│   │   ├── categories.js
│   │   ├── products.js
│   │   ├── clients.js
│   │   └── quotations.js
│   ├── services/
│   │   ├── pricing.js         # all GST math lives here, unit-test this file
│   │   └── pdf.js             # PDF generation
│   ├── templates/
│   │   └── quotation.html     # HTML template Puppeteer renders to PDF
│   └── index.js
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── CatalogPage.jsx
│   │   │   ├── ProductFormPage.jsx
│   │   │   ├── CategoryManagerPage.jsx
│   │   │   ├── ClientsPage.jsx
│   │   │   ├── BuildQuotationPage.jsx
│   │   │   └── QuotationListPage.jsx
│   │   ├── components/
│   │   └── api/               # fetch wrappers per resource
│   └── vite.config.js
└── README.md
```

---

## 9. API Endpoints

| Method | Route | Purpose |
|---|---|---|
| GET/POST | `/api/categories` | list / create |
| PUT/DELETE | `/api/categories/:id` | edit / delete |
| GET/POST | `/api/products` | list (supports `?search=&category=&minPrice=&maxPrice=`) / create |
| GET/PUT/DELETE | `/api/products/:id` | read / edit / soft-delete |
| POST | `/api/products/import` | CSV bulk import |
| GET/POST | `/api/clients` | list / create |
| PUT/DELETE | `/api/clients/:id` | edit / delete |
| GET/POST | `/api/quotations` | list / create draft |
| GET/PUT/DELETE | `/api/quotations/:id` | read / edit / delete |
| POST | `/api/quotations/:id/items` | add line item |
| DELETE | `/api/quotations/:id/items/:itemId` | remove line item |
| POST | `/api/quotations/:id/finalize` | lock in snapshot, generate quote number |
| GET | `/api/quotations/:id/pdf` | stream/download the PDF |

---

## 10. PDF Quotation — Layout Requirements

Page 1 header:
- Shop name, logo, address, phone, GSTIN (from a one-time "Shop Settings" config, not hardcoded).
- Quotation number, date, valid-until date.
- "Bill To" block: client name, phone, address, GSTIN if present.

Body:
- Table grouped by category (CPU, Motherboard, RAM, …) — this is the whole point, the client should be able to read it like a spec sheet: | Category | Brand & Model | Key Specs | Qty | Unit Price | GST% | Line Total |
- Subtotal row.
- GST breakdown rows (e.g. "GST @18% on ₹X = ₹Y", one row per rate present).
- Discount row if any.
- Labour/assembly charge row if any.
- **Grand Total** — bold, larger font.

Footer:
- Terms & conditions (editable text block in Shop Settings — e.g. warranty policy, payment terms, price validity).
- Authorized signatory line.

Build this as an HTML template (`quotation.html`) styled with plain CSS, rendered via Puppeteer — far easier to make it look professional than fighting a low-level PDF library.

---

## 11. UI Pages

1. **Dashboard** — quick stats (total products, draft quotations, recent quotes) + shortcuts to "New Quotation" and "Add Product".
2. **Catalog** — category tabs/sidebar, search bar, product grid/table, add/edit/delete.
3. **Category Manager** — simple CRUD list + reorder.
4. **Clients** — searchable list, add/edit, click-through to their quote history.
5. **Build Quotation** — the core workflow: client picker → category-by-category product picker with live running total → save/finalize.
6. **Quotations List** — filter by status/client/date, open to view/edit/duplicate/download PDF.
7. **Shop Settings** — logo, name, address, GSTIN, default GST%, T&Cs text, quotation numbering format.

---

## 12. Build Phases (agent: build in this order, get each working before moving on)

1. **Scaffold** — Express + SQLite backend, React+Vite frontend, basic routing shell.
2. **Data layer** — schema.sql for all 5 tables, seed.js with the default categories from §4.1 and ~10 sample products across a few categories for testing.
3. **Category CRUD** — full stack, working end to end.
4. **Product CRUD** — including the live GST calculation on the form and the dynamic spec key-value editor. This is the highest-value screen — polish it.
5. **Catalog search/filter** — wire up the search bar and filters against the product list.
6. **Client CRUD**.
7. **Quotation builder** — the multi-category picker + live totals panel (§5.4, §6). Persist drafts as items are added, don't hold it only in React state.
8. **Quotations list + status transitions + duplicate**.
9. **PDF generation** — HTML template + Puppeteer route, tested against a real multi-category quotation with mixed GST rates.
10. **Shop Settings page** — wire the PDF header/footer to pull from this instead of hardcoded values.
11. **CSV import for products** (nice-to-have, only after everything above works).
12. **Backup/restore** (export DB or JSON snapshot, re-import).

---

## 13. Acceptance Criteria

- [ ] Can create a category, then a product under it with specs and price, and see the correct `price_after_gst`.
- [ ] Can search "16GB" and get every matching RAM stick regardless of brand.
- [ ] Can build a quotation spanning at least 6 categories (CPU, mobo, RAM, GPU, cabinet, keyboard), with mixed GST rates, and the on-screen grand total matches manual calculation.
- [ ] Editing a product's price after a quotation was finalized does **not** change that old quotation's numbers.
- [ ] Downloaded PDF opens cleanly, shows shop letterhead, client details, itemized specs table, correct GST breakdown, and grand total.
- [ ] Deleting a category with active products in it is blocked with a clear message.
- [ ] All money values round consistently (no ₹0.01 mismatches between line items and total).

---

## 14. Sample Seed Data

```json
{
  "categories": [
    { "id": "cpu", "name": "CPU", "prefix": "CPU", "sort_order": 1 },
    { "id": "motherboard", "name": "Motherboard", "prefix": "MB", "sort_order": 2 },
    { "id": "ram", "name": "RAM", "prefix": "RAM", "sort_order": 3 },
    { "id": "gpu", "name": "GPU", "prefix": "GPU", "sort_order": 4 },
    { "id": "storage-ssd", "name": "Storage - SSD", "prefix": "SSD", "sort_order": 5 },
    { "id": "psu", "name": "PSU", "prefix": "PSU", "sort_order": 6 },
    { "id": "cabinet", "name": "Cabinet", "prefix": "CAB", "sort_order": 7 },
    { "id": "cooler", "name": "CPU Cooler", "prefix": "CLR", "sort_order": 8 },
    { "id": "monitor", "name": "Monitor", "prefix": "MON", "sort_order": 9 },
    { "id": "keyboard", "name": "Keyboard", "prefix": "KB", "sort_order": 10 },
    { "id": "mouse", "name": "Mouse", "prefix": "MS", "sort_order": 11 }
  ],
  "sample_products": [
    {
      "category_id": "cpu",
      "brand": "Intel",
      "model_name": "Core i5-14600K",
      "specs": [{ "Cores": "14 (6P+8E)" }, { "Socket": "LGA1700" }, { "Base Clock": "3.5GHz" }],
      "base_price": 27500,
      "gst_percent": 18,
      "warranty": "3 Years"
    },
    {
      "category_id": "ram",
      "brand": "Corsair",
      "model_name": "Vengeance 16GB DDR5 6000MHz",
      "specs": [{ "Capacity": "16GB" }, { "Speed": "6000MHz" }, { "Type": "DDR5" }],
      "base_price": 4200,
      "gst_percent": 18,
      "warranty": "Lifetime"
    }
  ]
}
```

---

### Notes for the agent
- Keep all GST/pricing math in one service file and unit test it — this is the part a shop owner will actually notice if it's wrong.
- Snapshot product data into quotation line items; never let historical quotes drift.
- Favor a plain, information-dense PDF over a flashy one — the client reading it wants specs and price, not decoration.
