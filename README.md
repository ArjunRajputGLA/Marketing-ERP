# Marketing ERP + Evidence-Grounded Multi-Agent AI Decision Support

[![Next.js](https://img.shields.io/badge/Next.js-15.1.7-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)

An authoritative enterprise resource planning (ERP) system integrated with a verifiable, evidence-grounded multi-agent AI decision support framework. Built for GLA University research benchmarks and production business operations.

---

## 🌟 Key Highlights

- **Complete Business Operations**: Seamless lifecycle for Sales Invoicing, Purchasing & Vendor Bills, Inventory Movement Ledger, Operating Expenses & Cashflow, Master Data, and Executive P&L Reporting.
- **Evidence-Grounded Multi-Agent AI**: Specialized autonomous analytical agents (Inventory, Sales & Demand, Finance & Margin, Supplier & Risk, Executive Synthesizer) generating grounded findings with mathematical evidence traces.
- **Enforced Security Isolation**: Complete database-level privilege boundary. AI agents access business data **strictly** via 17 audited `SECURITY DEFINER` tools in a dedicated `tools` schema with **zero** direct table privileges on `erp` or `research` schemas.
- **CONSENSUS Modern Design Aesthetic**: Sleek desktop shell layout with fixed sidebar, smooth collapse/expand animations, isolated content scrolling, responsive mobile drawer, and interactive role switching.
- **Deterministic Analytics**: 14 PostgreSQL views providing transparent, unhallucinated baselines for executive KPI tracking and research benchmarking.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 15 Web Application                      │
│      React 19 • App Router • Server Components • Tailwind CSS          │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Database Schemas (PostgreSQL 16)                  │
├─────────────────┬─────────────────┬──────────────────┬─────────────────┤
│  erp Schema     │  tools Schema   │  ai Schema       │ research Schema │
│  ──────────     │  ────────────   │  ─────────       │ ─────────────── │
│  • Master Data  │  • 17 Audited   │  • Query Runs    │ • Benchmark     │
│  • Sales Orders │    Functions    │  • Tool Traces   │   Questions     │
│  • Purchasing   │  • Strict Param │  • Agent Findings│ • Injected      │
│  • Inventory    │    Validation   │  • Consensus     │   Events        │
│  • Finance/Ledg │  • Security     │    Weights       │ • Evaluation    │
│  • P&L Views    │    Definer      │  • ML Registry   │   Metrics       │
└─────────────────┴─────────────────┴──────────────────┴─────────────────┘
```

### Database Roles & Privileges
| Role | Access Scope | Intended Consumer |
|---|---|---|
| `erp_app` | Full DML on `erp`, read/write on `ai`, read-only on `research` | Next.js Application Backend |
| `erp_ai_agent` | `EXECUTE` on `tools` functions only, append to `ai` traces | Multi-Agent LLM Service |
| `erp_tools_owner` | NOLOGIN owner of `tools` functions (read-only ceiling on `erp`) | Tool Execution Boundary |
| `erp_researcher` | Full access to all schemas (including gold labels) | Benchmark & Evaluation Harness |
| `erp_readonly` | `SELECT` on reporting views only | Analytical Dashboards / Baseline A |

---

## 📦 Core ERP Modules

### 1. Dashboard & Executive Overview
- Real-time KPIs: Revenue, Net Profit, Gross Margin %, Inventory Turnover, and Outstanding Receivables.
- Dynamic visual charts for sales trends, category revenue distribution, and pending order pipelines.
- AI Decision Alerts drawer with immediate operational recommendations.

### 2. Sales & Customer Invoicing
- Complete order lifecycle: `DRAFT` $\rightarrow$ `CONFIRMED` $\rightarrow$ `PAID` / `CANCELLED`.
- Automated inventory deduction upon confirmation.
- Partial and full customer payment receipts recording.
- Real-time gross margin and tax computation.

### 3. Purchasing & Supplier Management
- Vendor order processing with automatic weighted average cost (`avg_cost`) recalculation.
- Incoming stock lot additions linked directly to warehouse locations.
- Supplier reliability scores and purchase price variance tracking.

### 4. Inventory & Warehouse Ledger
- Strict append-only ledger (`inventory_movements`) tracking all additions, deductions, transfers, and adjustments.
- Real-time stock-on-hand tracking per product and warehouse.
- Automated drift detection comparing physical inventory ledger with cached balances.

### 5. Finance, Operating Overhead & Cashflow
- Categorized operating expenses (Rent, Utilities, Marketing, Payroll, Logistics).
- Cash inflows (customer payments) vs. outflows (expenses + vendor payments).
- Real-time cash position and operational burn rate monitoring.

### 6. Master Data Management
- Complete catalog for Products, Product Categories, Customer Accounts, Suppliers, and Warehouses.
- Minimum reorder points, safety stocks, unit costs, and retail pricing.

### 7. Reports & Deterministic Views
- Profit & Loss Statements (P&L), Inventory Valuation, Customer Concentration, and Supplier Spend.
- Historical revenue vs. gross margin trends with CSV export capabilities.

### 8. Administration & Security
- User management and Role-Based Access Control (Admin, Manager, Staff).
- Immutable system audit trail (`audit_log`) capturing every critical business event.
- Instant role-switcher in development mode for seamless multi-persona evaluation.

---

## 🤖 Evidence-Grounded Multi-Agent Decision Support

The `/ai-assistant` console orchestrates multi-agent deliberation:
1. **Inventory Specialist**: Evaluates stock-outs, holding costs, dead stock, and reorder triggers.
2. **Sales & Demand Specialist**: Detects demand spikes, seasonal patterns, customer churn, and price sensitivity.
3. **Finance & Margin Specialist**: Audits unit economics, gross margins, cash runways, and overhead anomalies.
4. **Supplier & Risk Specialist**: Scans lead times, vendor price creep, supplier concentration, and fulfillment risks.
5. **Executive Consensus Synthesizer**: Reconciles conflicting findings with weighted confidence profiles to produce decisive action recommendations with grounded SQL evidence.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.18+ or v20+
- **npm** or **pnpm**
- **PostgreSQL**: v15 or v16 with `pgcrypto` and `pg_trgm` extensions

### 1. Clone the Repository
```bash
git clone https://github.com/ArjunRajputGLA/Marketing-ERP.git
cd Marketing-ERP
```

### 2. Database Initialization
Create the database and execute the ordered schema scripts:

```bash
# Create PostgreSQL Database
createdb -U postgres erp_ai

# Execute all schema scripts in order
cd scripts
psql -U postgres -d erp_ai -v ON_ERROR_STOP=1 -f 00_run_all.sql

# Run regression and security probes
psql -U postgres -d erp_ai -v ON_ERROR_STOP=1 -f 16_smoke_test.sql
psql -U postgres -d erp_ai -v ON_ERROR_STOP=1 -f 17_security_probe.sql
cd ..
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your database credentials in `.env`:
```env
# Application Database Connection
DATABASE_URL=postgresql://erp_app:change_me_app@localhost:5432/erp_ai

# JWT Auth Secret
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long

# Next.js Port
PORT=3000
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Start Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Credentials

| Username | Password | Role | Access Level |
|---|---|---|---|
| `admin` | `Password@123` | Administrator | Full access to all ERP modules, Admin settings, & AI suite |
| `manager` | `Password@123` | Manager | Operational access to Sales, Purchases, Inventory, & Finance |
| `staff` | `Password@123` | Staff | Access to Sales Invoicing, Inventory, & Master Data |

> **Quick Switcher**: When logged in, click the user profile avatar at the bottom-left of the sidebar to instantly switch between roles during testing!

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Actions, Route Handlers)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Database Driver**: [node-postgres (`pg`)](https://node-postgres.com/)
- **Authentication**: Stateless JWT via [jose](https://github.com/panva/jose) & [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- **Database**: [PostgreSQL 16](https://www.postgresql.org/)

---

## 🧪 Verification & Testing

```bash
# Type check TypeScript codebase
npx tsc --noEmit

# Run Next.js production build check
npm run build

# Run database smoke test
psql -U postgres -d erp_ai -f scripts/16_smoke_test.sql

# Run AI security isolation probe
psql -U postgres -d erp_ai -f scripts/17_security_probe.sql
```

---

## 👥 Authors & Academic Attribution

Developed for **GLA University** research in evidence-grounded multi-agent LLM systems and ERP domain benchmarks.

- **Author**: Arjun Rajput & Research Team
- **Repository**: [ArjunRajputGLA/Marketing-ERP](https://github.com/ArjunRajputGLA/Marketing-ERP)
