"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  MoreVertical,
  KeyRound,
  FolderKanban,
  Tags,
  FileText,
  Scale,
  Percent,
  CircleDollarSign,
  TrendingUp,
  Package,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ArrowUpRight,
  Eye,
  Sliders,
  DollarSign,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

export function InventoryClient() {
  const [products, setProducts] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"sales" | "movements" | "stocktake" | "all">("sales");
  const [loading, setLoading] = useState(true);

  // Drift check state
  const [checkingDrift, setCheckingDrift] = useState(false);
  const [driftResult, setDriftResult] = useState<any>(null);

  // Toggle switch states (visual recreation of screenshot 1)
  const [toggles, setToggles] = useState({
    active: true,
    sell: true,
    trackQty: false,
    pos: true,
    produce: false,
  });

  const loadData = () => {
    setLoading(true);
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => {
        const prods = data.products || [];
        setProducts(prods);
        setLedger(data.ledger || []);
        if (prods.length > 0) {
          // Select default item or table if available
          const found = prods.find((p: any) => p.sku.toLowerCase().includes("tbl") || p.sku.toLowerCase().includes("leg")) || prods[0];
          setSelectedProduct(found);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunDriftCheck = async () => {
    setCheckingDrift(true);
    try {
      const res = await fetch("/api/inventory/drift");
      const data = await res.json();
      setDriftResult(data);
    } catch {
      // ignore
    } finally {
      setCheckingDrift(false);
    }
  };

  if (loading || !selectedProduct) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          Loading CONSENSUS Inventory Registry...
        </div>
      </div>
    );
  }

  // Aggregate metrics matching screenshot
  const totalStockQty = products.reduce((sum, p) => sum + Number(p.stock_on_hand || 0), 0);
  const totalStockVal = products.reduce((sum, p) => sum + Number(p.stock_on_hand || 0) * Number(p.cost_price || 0), 0);

  // Filter movements for selected product
  const productMovements = ledger.filter((l) => l.product_id === selectedProduct.product_id);

  return (
    <div className="space-y-6">
      {/* Real-time Invariant / Drift Check Alert (if performed) */}
      {driftResult && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs transition-all shadow-xs ${
            driftResult.isConsistent
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
              : "bg-amber-50/80 border-amber-200 text-amber-800"
          }`}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold text-slate-900">
                Database Invariant Check: {driftResult.isConsistent ? "PASSED (0 DRIFT)" : "RECONCILED"}
              </div>
              <div className="text-slate-600 mt-0.5">{driftResult.message}</div>
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-500">
            {new Date(driftResult.checkedAt).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* TOP CARD: Product Details (Exact recreation of Screenshot 1) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs relative">
        {/* Card Title & Context Menu */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Package className="h-4 w-4 text-slate-600" />
            <span>Product Details</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Product Switcher Dropdown */}
            <select
              value={selectedProduct.product_id}
              onChange={(e) => {
                const found = products.find((p) => p.product_id === Number(e.target.value));
                if (found) setSelectedProduct(found);
              }}
              className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
            <button className="text-slate-400 hover:text-slate-600 p-1">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Row: Thumbnail + Product Meta Grid */}
        <div className="pt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Block: Image, Name, Status, and Toggles */}
          <div className="flex items-start gap-4 min-w-[280px]">
            {/* 3D-styled product icon/illustration */}
            <div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-tr from-amber-100 to-orange-50 border border-amber-200/60 flex items-center justify-center text-amber-800 shadow-xs">
              <Boxes className="h-8 w-8 text-amber-700/80" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  {selectedProduct.name}
                </h2>
                <span className="bg-emerald-50 text-emerald-700 font-semibold text-[11px] px-2 py-0.5 rounded-full border border-emerald-200/60">
                  Active
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400 font-medium">
                {selectedProduct.sku}
              </div>

              {/* Toggle Pills matching screenshot 1 */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1 text-[11px] font-medium text-slate-600 select-none">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Active</span>
                  <button
                    onClick={() => setToggles({ ...toggles, active: !toggles.active })}
                    className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors ${
                      toggles.active ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full bg-white shadow-xs" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Sell</span>
                  <button
                    onClick={() => setToggles({ ...toggles, sell: !toggles.sell })}
                    className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors ${
                      toggles.sell ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full bg-white shadow-xs" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Track Quantity</span>
                  <button
                    onClick={() => setToggles({ ...toggles, trackQty: !toggles.trackQty })}
                    className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors ${
                      toggles.trackQty ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full bg-white shadow-xs" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">POS</span>
                  <button
                    onClick={() => setToggles({ ...toggles, pos: !toggles.pos })}
                    className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors ${
                      toggles.pos ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full bg-white shadow-xs" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Meta Grid with vertical divider lines matching Screenshot 1 */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
            {/* Column 1 */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                  <span>Product Code</span>
                </div>
                <div className="font-mono text-xs font-bold text-slate-900 mt-0.5">
                  {selectedProduct.sku}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <Scale className="h-3.5 w-3.5 text-slate-400" />
                  <span>Unit of Measure</span>
                </div>
                <div className="text-xs font-semibold text-slate-900 mt-0.5">
                  {selectedProduct.unit} (Standard)
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-4 border-l border-slate-100 pl-4">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <FolderKanban className="h-3.5 w-3.5 text-slate-400" />
                  <span>Inventory Account</span>
                </div>
                <div className="text-xs font-semibold text-slate-900 mt-0.5">
                  12 - Goods (Stock)
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <Percent className="h-3.5 w-3.5 text-slate-400" />
                  <span>Tax Rate</span>
                </div>
                <div className="text-xs font-semibold text-slate-900 mt-0.5">
                  GST 5%
                </div>
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-4 border-l border-slate-100 pl-4">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <Tags className="h-3.5 w-3.5 text-slate-400" />
                  <span>Category</span>
                </div>
                <div className="text-xs font-semibold text-slate-900 mt-0.5 truncate max-w-[120px]">
                  {selectedProduct.category_name || "General Goods"}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <CircleDollarSign className="h-3.5 w-3.5 text-slate-400" />
                  <span>Cost per Unit</span>
                </div>
                <div className="text-xs font-bold text-slate-900 font-mono mt-0.5">
                  {formatCurrency(selectedProduct.cost_price)}
                </div>
              </div>
            </div>

            {/* Column 4 */}
            <div className="space-y-4 border-l border-slate-100 pl-4">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  <span>Note</span>
                </div>
                <div className="font-mono text-xs text-slate-700 mt-0.5">
                  CL-09471
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <Boxes className="h-3.5 w-3.5 text-slate-400" />
                  <span>Minimum Stock</span>
                </div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  {Number(selectedProduct.reorder_level).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI METRICS ROW: 3 Cards matching Screenshot 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Sales */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Sales</span>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">
            ₹ 28,473.84
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">vs last month 7,000</span>
            <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 text-[11px]">
              <ArrowUpRight className="h-3 w-3 stroke-[2.5]" /> 108.16
            </span>
          </div>
        </div>

        {/* Total Gross Profit */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Gross Profit</span>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">
            ₹ 10,959.50
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">vs last month 4,000</span>
            <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 text-[11px]">
              <ArrowUpRight className="h-3 w-3 stroke-[2.5]" /> 43.5%
            </span>
          </div>
        </div>

        {/* Profitability Margin */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Profitability Margin</span>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">
            38.49%
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">vs last month 26%</span>
            <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 text-[11px]">
              <ArrowUpRight className="h-3 w-3 stroke-[2.5]" /> +15%
            </span>
          </div>
        </div>
      </div>

      {/* LOWER SECTION: Dual-Pane Operational Split matching Screenshot 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANE (Col 1-5): Stock Overview */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Sliders className="h-4 w-4 text-slate-600" />
              <span>Stock Overview</span>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Currently <strong>30.4%</strong>, indicating the final phase of stock usage for active SKU catalog.
          </p>

          {/* Mini-stat Tiles with soft round icons */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
              <div className="h-8 w-8 rounded-full bg-cyan-50 border border-cyan-200/60 text-cyan-600 flex items-center justify-center font-bold text-xs">
                ₹
              </div>
              <div>
                <div className="text-[10px] font-medium text-slate-400 uppercase">Total Value</div>
                <div className="text-sm font-bold text-slate-900">
                  {formatCurrency(totalStockVal)}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
              <div className="h-8 w-8 rounded-full bg-sky-50 border border-sky-200/60 text-sky-600 flex items-center justify-center">
                <Boxes className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] font-medium text-slate-400 uppercase">Expected Stock</div>
                <div className="text-sm font-bold text-slate-900">
                  {totalStockQty} Units
                </div>
              </div>
            </div>
          </div>

          {/* Segmented Pill Progress Visualizers exactly matching Screenshot 1 */}
          <div className="space-y-4 pt-1">
            {/* Available Stock */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Available Stock</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Ready for use or sale</span>
              </div>
              {/* Row of segmented cyan pills */}
              <div className="flex gap-1 py-1">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-4 flex-1 rounded-sm ${
                      i < 18 ? "bg-sky-400" : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-400">
                <span className="text-sky-600">{Number(selectedProduct.stock_on_hand)} Units</span>
                <span>Max: {Number(selectedProduct.reorder_level) * 3 || 34}</span>
              </div>
            </div>

            {/* Reserved Stock */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Reserved Stock</span>
                <span className="text-[10px] text-sky-600 font-semibold">Allocated for orders</span>
              </div>
              {/* Row of segmented cyan pills partially filled */}
              <div className="flex gap-1 py-1">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-4 flex-1 rounded-sm ${
                      i < 11 ? "bg-sky-300" : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-400">
                <span className="text-slate-700">4.50 Units</span>
                <span>Cap: 34K</span>
              </div>
            </div>
          </div>

          {/* Action button for drift check */}
          <div className="pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={checkingDrift}
              onClick={handleRunDriftCheck}
              className="w-full text-xs border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl py-2"
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-sky-500" />
              {checkingDrift ? "Validating Ledger..." : "Audit Stock Drift (0-Drift Check)"}
            </Button>
          </div>
        </div>

        {/* RIGHT PANE (Col 6-12): Tabbed Data Ledger matching Screenshot 1 */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          {/* Tab strip + Dropdown Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                { id: "sales", label: "Sales" },
                { id: "movements", label: "Stock Movements" },
                { id: "all", label: "All Products" },
                { id: "stocktake", label: "Stocktake" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    activeTab === t.id
                      ? "text-sky-600 bg-sky-50 border border-sky-200/60"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-100 transition-colors"
            >
              <span>Show Pricing & Inventory</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>

          {/* High Density Table matching Screenshot 1 */}
          <div className="overflow-x-auto">
            {activeTab === "sales" ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="text-left pb-3 font-semibold">Reference</th>
                    <th className="text-left pb-3 font-semibold">Date</th>
                    <th className="text-right pb-3 font-semibold">Quantity</th>
                    <th className="text-right pb-3 font-semibold">Price</th>
                    <th className="text-right pb-3 font-semibold">Margin</th>
                    <th className="text-right pb-3 font-semibold">Cost</th>
                    <th className="text-right pb-3 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Rows formatted exactly like the screenshot: SL30-7-FF in blue text */}
                  {[
                    { ref: "SL30-7-FF", date: "30/11/2025", qty: "4.50", price: 55.20, margin: "45.10%", cost: 300.00, total: 300.00 },
                    { ref: "SL35-6-FF", date: "15/12/2025", qty: "2.75", price: 36.50, margin: "40.00%", cost: 150.00, total: 150.00 },
                    { ref: "SL40-5-FF", date: "05/01/2026", qty: "5.00", price: 70.00, margin: "50.23%", cost: 400.00, total: 400.00 },
                    { ref: "SL45-4-FF", date: "20/02/2026", qty: "3.20", price: 48.75, margin: "38.90%", cost: 250.00, total: 250.00 },
                    { ref: "SL50-3-FF", date: "10/03/2026", qty: "6.10", price: 85.00, margin: "55.60%", cost: 500.00, total: 500.00 },
                    { ref: "SL55-2-FF", date: "25/04/2026", qty: "7.25", price: 95.30, margin: "60.00%", cost: 600.00, total: 600.00 },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-mono font-semibold text-sky-600 hover:underline cursor-pointer">
                        <Link href="/sales">{row.ref}</Link>
                      </td>
                      <td className="py-3 text-slate-500 font-medium">{row.date}</td>
                      <td className="py-3 text-right font-medium text-slate-800">{row.qty}</td>
                      <td className="py-3 text-right text-slate-800 font-medium">USD {row.price.toFixed(2)}</td>
                      <td className="py-3 text-right text-slate-600 font-medium">{row.margin}</td>
                      <td className="py-3 text-right text-slate-800 font-medium">USD {row.cost.toFixed(2)}</td>
                      <td className="py-3 text-right font-bold text-slate-900">USD {row.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : activeTab === "movements" ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="text-left pb-3 font-semibold">Movement #</th>
                    <th className="text-left pb-3 font-semibold">Date</th>
                    <th className="text-left pb-3 font-semibold">Type</th>
                    <th className="text-right pb-3 font-semibold">Quantity</th>
                    <th className="text-right pb-3 font-semibold">Unit Cost</th>
                    <th className="text-right pb-3 font-semibold">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productMovements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No physical movements recorded for this item yet.
                      </td>
                    </tr>
                  ) : (
                    productMovements.map((m) => {
                      const isPositive = Number(m.quantity) > 0;
                      return (
                        <tr key={m.movement_id} className="hover:bg-slate-50">
                          <td className="py-3 font-mono text-slate-500">MOV-{m.movement_id}</td>
                          <td className="py-3 text-slate-500">{formatDate(m.movement_date)}</td>
                          <td className="py-3">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                              isPositive ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"
                            }`}>
                              {m.movement_type}
                            </span>
                          </td>
                          <td className={`py-3 text-right font-mono font-bold ${
                            isPositive ? "text-emerald-700" : "text-rose-700"
                          }`}>
                            {isPositive ? `+${Number(m.quantity)}` : Number(m.quantity)}
                          </td>
                          <td className="py-3 text-right font-mono text-slate-700">
                            {formatCurrency(m.unit_cost)}
                          </td>
                          <td className="py-3 text-right font-mono text-sky-600 font-medium">
                            {m.sales_invoice_no || m.purchase_invoice_no || "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="text-left pb-3 font-semibold">SKU & Item</th>
                    <th className="text-left pb-3 font-semibold">Category</th>
                    <th className="text-right pb-3 font-semibold">Stock</th>
                    <th className="text-right pb-3 font-semibold">Cost (₹)</th>
                    <th className="text-right pb-3 font-semibold">Selling (₹)</th>
                    <th className="text-center pb-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr
                      key={p.product_id}
                      onClick={() => setSelectedProduct(p)}
                      className={`hover:bg-sky-50/50 cursor-pointer transition-colors ${
                        p.product_id === selectedProduct.product_id ? "bg-sky-50/80 font-semibold" : ""
                      }`}
                    >
                      <td className="py-3">
                        <div className="text-slate-900">{p.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{p.sku}</div>
                      </td>
                      <td className="py-3 text-slate-500">{p.category_name}</td>
                      <td className="py-3 text-right font-bold text-slate-900">{Number(p.stock_on_hand)}</td>
                      <td className="py-3 text-right font-mono text-slate-600">{formatCurrency(p.cost_price)}</td>
                      <td className="py-3 text-right font-mono text-emerald-700">{formatCurrency(p.selling_price)}</td>
                      <td className="py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(p);
                          }}
                          className="text-[11px] px-2 py-1 rounded bg-slate-100 hover:bg-sky-100 hover:text-sky-700 text-slate-700"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
