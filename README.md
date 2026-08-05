# BuildMyPC — Inventory & GST Quotation Software

[![Node.js](https://img.shields.io/badge/Node.js-v24.0+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0-purple.svg)](https://vitejs.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-3.0-lightgrey.svg)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A desktop-ready, full-stack web application designed for PC building shops and hardware retailers to maintain component inventories, build custom PC configurations for clients with live GST calculations, and export professional, itemized PDF quotations.

![BuildMyPC Dashboard](https://raw.githubusercontent.com/Anandakrishnan-VP/buildmypc/main/docs/preview.png)

---

## 🌟 Key Features

### 🖥️ 1. Multi-Category Custom PC Builder
- **Category Component Picker**: Seamlessly search and select parts across 16 categories (CPU, Motherboard, RAM, GPU, SSD, PSU, Cabinet, Cooler, Monitor, Peripherals, OS, Cables, etc.).
- **Live Quantity Controls**: Adjust component quantities (+ / -) or remove items on the fly in a dedicated scrollable build list.
- **Client Association**: Quick-select registered clients or create new B2B/B2C client profiles inline.

### 💰 2. Precise GST & Pricing Engine
- **Auto-Calculated GST**: Enter base prices and GST rates (0%, 5%, 12%, 18%, 28%) to automatically calculate `price_after_gst`.
- **Tax Breakdown by Rate**: Automatic grouping and summation of taxable base amounts and GST totals grouped by rate.
- **Pre-Tax Discounts & Service Fees**: Apply custom discounts and assembly/labour charges with real-time grand total updates.
- **Zero Currency Drift**: Strict line-item rounding (2 decimal places) to prevent off-by-a-rupee rounding mismatches.

### 🛡️ 3. Price Snapshot Protection
- Product pricing and specifications are **snapshotted into quotation line items** upon addition. Modifying a component's price in the inventory catalog next week will **never alter historical sent quotations**.

### 📄 4. Single-Click Puppeteer PDF Generator
- Generates clean, professional PDF quotations using Puppeteer and an HTML/CSS print template.
- Includes shop letterhead, GSTIN, Bill To block, category-grouped spec sheet table, tax summary, and custom Terms & Conditions.

### 🎨 5. 2026 Retro-Tech UI & Theme System
- **Pure OLED Dark Mode**: Techy `#050508` black theme with electric cyan (`#00f0ff`) and purple (`#8b5cf6`) accents.
- **Light Mode Toggle**: Built-in high-contrast Light Mode switcher with `localStorage` persistence.
- **Collapsible Sidebar**: Shrink sidebar to 72px icon mode for full-width workspace view.
- **Fixed Viewport Summary Dock**: Sticky bottom summary bar ensuring GST totals and export actions are always visible without horizontal scrolling.
- **Zero Browser Defaults**: Custom Toast Notifications and Techy Confirmation Modals instead of browser `alert()` / `confirm()`.

---

## 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Lucide Icons, Space Grotesk & JetBrains Mono Fonts, Custom CSS Tokens |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite (via `sqlite` & `sqlite3`) |
| **PDF Engine** | Puppeteer (Headless Chrome HTML → PDF) |

---

## 📁 Repository Structure

```
buildmypc/
├── server/                   # Node.js + Express Backend
│   ├── db/
│   │   ├── database.js       # SQLite database connection & migrations
│   │   ├── schema.sql        # Tables: categories, products, clients, quotations, shop_settings
│   │   └── seed.js           # Pre-loaded PC categories and sample components
│   ├── routes/               # REST API endpoints (categories, products, clients, quotations, settings)
│   ├── services/
│   │   ├── pricing.js        # Pure GST math & quotation totals calculator
│   │   └── pdf.js            # Puppeteer PDF renderer
│   ├── templates/
│   │   └── quotation.html    # Print-ready HTML/CSS quotation template
│   ├── index.js              # Express server entry point
│   └── test_acceptance.js    # Automated acceptance criteria verification suite
├── client/                   # Vite + React Frontend
│   ├── src/
│   │   ├── api/client.js     # Centralized API fetch wrappers
│   │   ├── components/       # Navbar, SpecEditor, GSTSummary, ToastContainer, ConfirmModal, Modals
│   │   ├── pages/            # Dashboard, Catalog, Categories, Clients, BuildQuotation, Quotations, Settings
│   │   ├── App.jsx           # Master router & theme manager
│   │   └── index.css         # Global design system & CSS variables
│   └── vite.config.js
├── package.json              # Root script runner
└── README.md
```

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Clone the Repository
```bash
git clone https://github.com/Anandakrishnan-VP/buildmypc.git
cd buildmypc
```

### 2. Install Dependencies & Seed Database
```bash
# Install server dependencies
cd server
npm install

# Seed initial database (categories, sample parts, shop settings)
node db/seed.js

# Install client dependencies
cd ../client
npm install
```

### 3. Run Development Server
From the root directory (`buildmypc/`):
```bash
npm run dev
```

This starts both:
- **Express Backend API** on `http://localhost:5000`
- **Vite React Frontend** on `http://localhost:5173`

Open `http://localhost:5173` in your browser to launch BuildMyPC.

---

## 🧪 Automated Testing

To run the acceptance verification suite (testing GST calculations, search, quotation building, snapshot price protection, PDF streaming, and category delete guarding):

```bash
cd server
node test_acceptance.js
```

---

## 📑 API Endpoints Summary

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` / `POST` | `/api/categories` | List all categories / Create category |
| `PUT` / `DELETE` | `/api/categories/:id` | Edit category / Delete category (blocked if active products exist) |
| `GET` / `POST` | `/api/products` | List products with search & filters / Create component |
| `PUT` / `DELETE` | `/api/products/:id` | Update product / Soft-delete product if referenced in quotes |
| `POST` | `/api/products/import` | Bulk CSV import |
| `GET` / `POST` | `/api/clients` | List clients with search / Register client |
| `GET` / `PUT` / `DELETE` | `/api/clients/:id` | Client details & quote history / Edit / Delete client |
| `GET` / `POST` | `/api/quotations` | List quotations with status filters / Create draft quote |
| `GET` / `PUT` / `DELETE` | `/api/quotations/:id` | Get quote breakdown / Edit quote / Delete quote |
| `POST` | `/api/quotations/:id/items` | Add component line item (locks product snapshot) |
| `DELETE` | `/api/quotations/:id/items/:itemId` | Remove line item |
| `POST` | `/api/quotations/:id/duplicate` | Duplicate quotation into a new draft |
| `POST` | `/api/quotations/:id/finalize` | Finalize quotation status |
| `GET` | `/api/quotations/:id/pdf` | Render and stream PDF quotation |
| `GET` / `PUT` | `/api/settings` | Get / Update shop letterhead & T&C config |

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

Developed with ❤️ by [Anandakrishnan VP](https://github.com/Anandakrishnan-VP).
