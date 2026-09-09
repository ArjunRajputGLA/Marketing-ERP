"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Headphones,
  FileText,
  ShieldCheck,
  Users,
  Search,
  ChevronDown,
  Layers,
  HelpCircle,
  ExternalLink,
  Code2,
  CheckCircle2,
  Sparkles,
  Terminal,
  Download,
  Mail,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function SupportDocsClient() {
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "How do I add a new Customer account or Supplier?",
      a: "Navigate to 'Master Data' in the sidebar (accessible to Admin and Manager roles). Select the Customers or Suppliers tab, and click the '+ Add Customer' or '+ Add Supplier' button in the top-right corner. Enter the legal business name, contact person, phone number, GSTIN, and billing address. The record is instantly provisioned with audit tracking.",
    },
    {
      q: "How is Moving-Average Unit Cost recalculated on Purchase intake?",
      a: "When a Purchase Order is confirmed and received into stock, the ERP executes a database trigger that calculates the new moving-average cost: New Cost = ((Existing Stock × Existing Unit Cost) + (New Quantity × Purchase Price)) / (Existing Stock + New Quantity). This ensures your balance sheet reflects true inventory valuation.",
    },
    {
      q: "Why are certain modules hidden or restricted for Staff accounts?",
      a: "The ERP enforces strict Role-Based Access Control (RBAC) and PostgreSQL Row Level Security (RLS). Staff users (role: USER) are limited to operational sales invoicing and catalog inquiries. Sensitive modules like Purchasing (costs and vendor margins), Accounting (cashflow and overheads), and Admin (user management) are strictly guarded.",
    },
    {
      q: "How does the Append-Only Audit Trail guarantee immutability?",
      a: "All state mutations in erp.sales_invoices, erp.purchase_invoices, erp.inventory_movements, and erp.expenses generate an immutable record in erp.audit_log. PostgreSQL triggers prevent any UPDATE or DELETE queries on this table, guaranteeing an audit trail suitable for ISO compliance and enterprise verification.",
    },
    {
      q: "What is the difference between a DRAFT and a CONFIRMED invoice?",
      a: "A DRAFT invoice can have line items edited, quantities altered, and discounts modified without affecting physical stock on hand. Once you click 'Confirm Invoice', the inventory conservation trigger locks the document, decreases physical stock in the warehouse, and records an authoritative accounting receivable.",
    },
    {
      q: "How does the Multi-Agent AI Assistant provide evidence-grounded answers?",
      a: "The AI Decision Support engine runs in a restricted sandbox with security definer functions. It never hallucinates financial figures; instead, it executes validated database probes (such as get_sales_summary and compute_reorder_signals) and synthesizes consensus evidence directly from real PostgreSQL records.",
    },
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200/80 text-[11px] font-semibold text-sky-700 mb-2">
            <BookOpen className="h-3 w-3" />
            GLA University Enterprise Reference Manual
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Support & Documentation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational guide, role security matrix, and interactive FAQ knowledge base for CONSENSUS Marketing ERP.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="h-10 px-4 rounded-xl border-slate-200 text-xs font-medium bg-white hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5 mr-2" />
            Print Manual
          </Button>

          <a href="mailto:admin@marketing-erp.edu">
            <Button className="h-10 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs shadow-xs">
              <Mail className="h-3.5 w-3.5 mr-2" />
              Contact Support
            </Button>
          </a>
        </div>
      </div>

      {/* 4 Feature Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">1. Sales & Invoicing Lifecycle</h2>
              <p className="text-[11px] text-slate-400">Draft creation &bull; Stock deductions &bull; Cash collection</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Create sales orders from the <strong>Sales</strong> module. Draft orders can be adjusted with discounts and customer references. Once confirmed, physical stock automatically deducts from the default warehouse, and payments can be recorded incrementally.
          </p>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-sky-600 font-semibold">
            <span>Learn more in Sales module &rarr;</span>
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">2. Inventory & Stock Conservation</h2>
              <p className="text-[11px] text-slate-400">Multi-warehouse &bull; Append-only movements &bull; Zero drift</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every product maintains an append-only stock ledger in <code>erp.inventory_movements</code>. The system guarantees that current on-hand stock exactly equals cumulative signed movements (+ purchase inflows, - sales outflows).
          </p>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-600 font-semibold">
            <span>Inspect in Stock Movements &rarr;</span>
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">3. Role-Based Access Control (RBAC)</h2>
              <p className="text-[11px] text-slate-400">Admin &bull; Manager &bull; Staff permissions</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Role definitions are enforced at both the UI and database levels. <strong>Admin</strong> has full audit and user management rights; <strong>Manager</strong> handles purchasing, inventory, and accounting; <strong>Staff</strong> manages sales and catalog views.
          </p>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-amber-600 font-semibold">
            <span>View User Registry in Administration &rarr;</span>
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">4. Multi-Agent AI Decision Support</h2>
              <p className="text-[11px] text-slate-400">GLA University Research Benchmark</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Features an AI consensus architecture evaluating inventory reorder points, sales margins, and operational risk. Queries run in security definer functions, producing hallucination-free, auditable business intelligence.
          </p>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-indigo-600 font-semibold">
            <span>Explore AI Decision Support &rarr;</span>
          </div>
        </Card>
      </div>

      {/* Role Matrix Table */}
      <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900">
            Authorization & Permissions Matrix
          </CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">
            Module-level capabilities enforced via session tokens and PostgreSQL RLS.
          </p>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50/50">
                  <th className="text-left py-3.5 px-5">Module / Function</th>
                  <th className="text-center py-3.5 px-4">Admin</th>
                  <th className="text-center py-3.5 px-4">Manager</th>
                  <th className="text-center py-3.5 px-4">Staff (USER)</th>
                  <th className="text-left py-3.5 px-5">Database Enforced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {[
                  { module: "Dashboard & Metrics", admin: "Full", mgr: "Full", staff: "View Only", db: "RLS read" },
                  { module: "Sales & Invoicing", admin: "Full", mgr: "Full", staff: "Create & View", db: "RLS insert/read" },
                  { module: "Purchasing & Cost Price", admin: "Full", mgr: "Full", staff: "No Access", db: "Role guard" },
                  { module: "Inventory & Warehouses", admin: "Full", mgr: "Full", staff: "View Catalog", db: "Trigger balance" },
                  { module: "Accounting & Expenses", admin: "Full", mgr: "Full", staff: "No Access", db: "Role guard" },
                  { module: "Master Data Entities", admin: "Full", mgr: "Full", staff: "Read Only", db: "Foreign key checks" },
                  { module: "P&L Analytical Reporting", admin: "Full", mgr: "Full", staff: "No Access", db: "Aggregations" },
                  { module: "User Admin & Audit Trail", admin: "Full", mgr: "No Access", staff: "No Access", db: "Append-only" },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-slate-900">{row.module}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {row.admin}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                        {row.mgr}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.staff === "No Access"
                            ? "bg-slate-100 text-slate-400"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}
                      >
                        {row.staff}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-[10px] text-slate-500">
                      {row.db}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Interactive FAQ Accordion with Search */}
      <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Frequently Asked Operational Questions
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Quick solutions for day-to-day business operations and system workflows.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search FAQ questions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9 rounded-xl border-slate-200"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 divide-y divide-slate-100">
          {filteredFaqs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No answers matching your search keyword.
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => (
              <div key={idx} className="py-3.5 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between text-left font-semibold text-xs text-slate-900 hover:text-sky-600 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      openFaq === idx ? "rotate-180 text-sky-600" : ""
                    }`}
                  />
                </button>

                {openFaq === idx && (
                  <div className="mt-2 pl-5 text-xs text-slate-600 leading-relaxed animate-in fade-in-50 duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
