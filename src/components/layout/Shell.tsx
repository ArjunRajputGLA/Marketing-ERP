"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Database,
  DollarSign,
  BarChart3,
  Bot,
  ShieldCheck,
  LogOut,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Search,
  Bell,
  Sliders,
  Headphones,
  Check,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShellProps {
  children: React.ReactNode;
  user: {
    userId: number;
    username: string;
    fullName: string;
    roleCode: "ADMIN" | "MANAGER" | "USER";
    roleName: string;
  };
}

export function Shell({ children, user }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Submenu toggle for Inventory
  const isInventoryActive = pathname.startsWith("/inventory");
  const [inventoryOpen, setInventoryOpen] = useState(true);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  // Breadcrumb generator
  const getBreadcrumbs = () => {
    if (pathname === "/inventory/movements") {
      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link href="/inventory" className="hover:text-slate-900 transition-colors">Inventory</Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold">Stock Movements Ledger</span>
        </div>
      );
    }
    if (pathname === "/inventory/warehouses") {
      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link href="/inventory" className="hover:text-slate-900 transition-colors">Inventory</Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold">Warehouses & Storage</span>
        </div>
      );
    }
    if (pathname === "/inventory/categories") {
      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link href="/inventory" className="hover:text-slate-900 transition-colors">Inventory</Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold">Product Categories</span>
        </div>
      );
    }
    if (pathname.startsWith("/inventory")) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link href="/inventory" className="hover:text-slate-900 transition-colors">Inventory</Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold">Products & Stock Overview</span>
        </div>
      );
    }
    if (pathname.startsWith("/sales")) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link href="/sales" className="hover:text-slate-900 transition-colors">Sales</Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold">
            {pathname === "/sales/new" ? "New Invoice" : "Invoices & Receipts"}
          </span>
        </div>
      );
    }
    if (pathname.startsWith("/purchases")) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link href="/purchases" className="hover:text-slate-900 transition-colors">Purchasing</Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold">
            {pathname === "/purchases/new" ? "New Purchase Order" : "Orders & Bills"}
          </span>
        </div>
      );
    }
    if (pathname.startsWith("/finance")) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link href="/finance" className="hover:text-slate-900 transition-colors">Accounting</Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold">Operating Expenses & Cashflow</span>
        </div>
      );
    }
    if (pathname.startsWith("/reports")) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link href="/reports" className="hover:text-slate-900 transition-colors">Reporting</Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold">Deterministic P&L Analytics</span>
        </div>
      );
    }
    if (pathname.startsWith("/ai-assistant")) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link href="/ai-assistant" className="hover:text-slate-900 transition-colors">AI Decision Support</Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold">Multi-Agent Consensus</span>
        </div>
      );
    }
    if (pathname.startsWith("/admin")) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link href="/admin" className="hover:text-slate-900 transition-colors">Administration</Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold">Users & Audit Trail</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <span>ERP Solution</span>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-900 font-semibold">Operational Dashboard</span>
      </div>
    );
  };

  const getPageTitle = () => {
    if (pathname === "/inventory/movements") return "Stock Movements";
    if (pathname === "/inventory/warehouses") return "Warehouses";
    if (pathname === "/inventory/categories") return "Product Categories";
    if (pathname.startsWith("/inventory")) return "Products";
    if (pathname.startsWith("/sales")) return "Sales Invoices";
    if (pathname.startsWith("/purchases")) return "Purchasing";
    if (pathname.startsWith("/finance")) return "Accounting";
    if (pathname.startsWith("/master")) return "Master Data";
    if (pathname.startsWith("/reports")) return "Reporting";
    if (pathname.startsWith("/ai-assistant")) return "AI Decision Support";
    if (pathname.startsWith("/admin")) return "Administration";
    return "Dashboard";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      {/* Sidebar for Desktop with smooth animated transition */}
      <aside
        className={`hidden lg:flex flex-col border-r border-slate-200/80 bg-white transition-[width] duration-300 ease-in-out z-20 select-none shrink-0 h-full ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Top Branding matching Vantus inspiration */}
        <div className={`flex h-20 shrink-0 items-center border-b border-slate-100 ${collapsed ? "justify-center px-0 w-full" : "justify-between px-4"}`}>
          <div className={`flex items-center ${collapsed ? "justify-center w-full" : "gap-3 overflow-hidden"}`}>
            {collapsed ? (
              /* When collapsed: C logo normally, replaced by expanding button on hover */
              <div
                onClick={() => setCollapsed(false)}
                className="relative h-11 w-11 flex items-center justify-center group cursor-pointer"
                title="Expand sidebar"
              >
                {/* C Logo */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-700 via-blue-600 to-sky-400 shadow-md shadow-blue-500/25 text-white font-extrabold text-xl tracking-tighter transition-all duration-200 group-hover:opacity-0 group-hover:scale-90 group-hover:pointer-events-none">
                  <span className="transform -rotate-6 select-none font-sans">C</span>
                </div>

                {/* Expanding Button (same UI as collapsing button) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCollapsed(false);
                  }}
                  className="absolute h-8 w-8 rounded-xl border border-slate-200/80 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-2xs opacity-0 scale-90 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto"
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              /* When expanded: standard C logo with branding text */
              <>
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-700 via-blue-600 to-sky-400 shadow-md shadow-blue-500/25 text-white font-extrabold text-xl tracking-tighter cursor-pointer hover:shadow-lg transition-all active:scale-95"
                  title="CONSENSUS ERP"
                >
                  <span className="transform -rotate-6 select-none font-sans">C</span>
                </button>

                <div className="transition-opacity duration-200 overflow-hidden">
                  <div className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                    CONSENSUS
                  </div>
                  <div className="text-[11px] font-medium text-slate-400 tracking-tight">
                    ERP Solution
                  </div>
                </div>
              </>
            )}
          </div>

          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="h-8 w-8 rounded-xl border border-slate-200/80 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}
        </div>


        {/* Navigation Content */}
        <div className={`flex-1 overflow-y-auto ${collapsed ? "px-2 py-3 space-y-2" : "px-3.5 py-4 space-y-6"} transition-all duration-300`}>
          {/* MAIN section */}
          <div>
            {!collapsed && (
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                Main
              </div>
            )}

            <nav className={collapsed ? "space-y-2 flex flex-col items-center" : "space-y-1"}>
              {/* Dashboard */}
              <Link
                href="/dashboard"
                className={`group relative flex items-center transition-all ${
                  collapsed
                    ? `w-11 h-11 justify-center rounded-2xl ${
                        pathname === "/dashboard"
                          ? "bg-sky-500 text-white shadow-md shadow-sky-500/30 font-semibold"
                          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100/80"
                      }`
                    : `justify-between rounded-xl px-3 py-2.5 text-xs font-medium ${
                        pathname === "/dashboard"
                          ? "bg-sky-500 text-white font-semibold shadow-sm shadow-sky-500/25"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard
                    className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                      pathname === "/dashboard" ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                    }`}
                  />
                  {!collapsed && <span className="truncate">Dashboard</span>}
                </div>
                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 -translate-x-1 group-hover:translate-x-0">
                    Dashboard
                  </div>
                )}
              </Link>

              {/* Accounting (Finance & Expenses) */}
              {(user.roleCode === "ADMIN" || user.roleCode === "MANAGER") && (
                <Link
                  href="/finance"
                  className={`group relative flex items-center transition-all ${
                    collapsed
                      ? `w-11 h-11 justify-center rounded-2xl ${
                          pathname.startsWith("/finance")
                            ? "bg-sky-500 text-white shadow-md shadow-sky-500/30 font-semibold"
                            : "text-slate-400 hover:text-slate-700 hover:bg-slate-100/80"
                        }`
                      : `justify-between rounded-xl px-3 py-2.5 text-xs font-medium ${
                          pathname.startsWith("/finance")
                            ? "bg-sky-500 text-white font-semibold shadow-sm shadow-sky-500/25"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <DollarSign
                      className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                        pathname.startsWith("/finance") ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                      }`}
                    />
                    {!collapsed && <span className="truncate">Accounting</span>}
                  </div>
                  {!collapsed && (
                    <ChevronRight className={`h-3.5 w-3.5 ${pathname.startsWith("/finance") ? "text-white/80" : "text-slate-400"}`} />
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 -translate-x-1 group-hover:translate-x-0">
                      Accounting
                    </div>
                  )}
                </Link>
              )}

              {/* Purchasing */}
              {(user.roleCode === "ADMIN" || user.roleCode === "MANAGER") && (
                <Link
                  href="/purchases"
                  className={`group relative flex items-center transition-all ${
                    collapsed
                      ? `w-11 h-11 justify-center rounded-2xl ${
                          pathname.startsWith("/purchases")
                            ? "bg-sky-500 text-white shadow-md shadow-sky-500/30 font-semibold"
                            : "text-slate-400 hover:text-slate-700 hover:bg-slate-100/80"
                        }`
                      : `justify-between rounded-xl px-3 py-2.5 text-xs font-medium ${
                          pathname.startsWith("/purchases")
                            ? "bg-sky-500 text-white font-semibold shadow-sm shadow-sky-500/25"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Package
                      className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                        pathname.startsWith("/purchases") ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                      }`}
                    />
                    {!collapsed && <span className="truncate">Purchasing</span>}
                  </div>
                  {!collapsed && (
                    <ChevronRight className={`h-3.5 w-3.5 ${pathname.startsWith("/purchases") ? "text-white/80" : "text-slate-400"}`} />
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 -translate-x-1 group-hover:translate-x-0">
                      Purchasing
                    </div>
                  )}
                </Link>
              )}

              {/* Sales */}
              <Link
                href="/sales"
                className={`group relative flex items-center transition-all ${
                  collapsed
                    ? `w-11 h-11 justify-center rounded-2xl ${
                        pathname.startsWith("/sales")
                          ? "bg-sky-500 text-white shadow-md shadow-sky-500/30 font-semibold"
                          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100/80"
                      }`
                    : `justify-between rounded-xl px-3 py-2.5 text-xs font-medium ${
                        pathname.startsWith("/sales")
                          ? "bg-sky-500 text-white font-semibold shadow-sm shadow-sky-500/25"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart
                    className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                      pathname.startsWith("/sales") ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                    }`}
                  />
                  {!collapsed && <span className="truncate">Sales</span>}
                </div>
                {!collapsed && (
                  <ChevronRight className={`h-3.5 w-3.5 ${pathname.startsWith("/sales") ? "text-white/80" : "text-slate-400"}`} />
                )}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 -translate-x-1 group-hover:translate-x-0">
                    Sales Invoices
                  </div>
                )}
              </Link>

              {/* Inventory (Vantus signature active pill + tree sub-menu) */}
              <div className="w-full">
                <div
                  onClick={() => {
                    if (collapsed) {
                      router.push("/inventory");
                    } else {
                      setInventoryOpen(!inventoryOpen);
                    }
                  }}
                  className={`group relative flex items-center transition-all cursor-pointer ${
                    collapsed
                      ? `w-11 h-11 mx-auto justify-center rounded-2xl ${
                          isInventoryActive
                            ? "bg-sky-500 text-white shadow-md shadow-sky-500/30 font-semibold"
                            : "text-slate-400 hover:text-slate-700 hover:bg-slate-100/80"
                        }`
                      : `justify-between rounded-xl px-3 py-2.5 text-xs font-medium ${
                          isInventoryActive
                            ? "bg-sky-500 text-white font-semibold shadow-sm shadow-sky-500/25"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Boxes
                      className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                        isInventoryActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                      }`}
                    />
                    {!collapsed && <span className="truncate">Inventory</span>}
                  </div>
                  {!collapsed && (
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        isInventoryActive ? "text-white/90" : "text-slate-400"
                      } ${inventoryOpen ? "rotate-0" : "-rotate-90"}`}
                    />
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 -translate-x-1 group-hover:translate-x-0">
                      Inventory & Products
                    </div>
                  )}
                </div>

                {/* Submenu Tree matching Vantus inspiration */}
                {!collapsed && inventoryOpen && (
                  <div className="tree-line-container my-1.5 space-y-1 transition-all duration-200">
                    <Link
                      href="/inventory"
                      className={`tree-line-item block py-1.5 pl-2 text-xs font-medium transition-colors ${
                        pathname === "/inventory" || pathname === "/inventory/products"
                          ? "text-sky-600 font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Products
                    </Link>
                    <Link
                      href="/inventory/movements"
                      className={`tree-line-item block py-1.5 pl-2 text-xs font-medium transition-colors ${
                        pathname === "/inventory/movements"
                          ? "text-sky-600 font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Stock Movements
                    </Link>
                    <Link
                      href="/inventory/warehouses"
                      className={`tree-line-item py-1.5 pl-2 text-xs font-medium transition-colors flex items-center justify-between pr-2 ${
                        pathname === "/inventory/warehouses"
                          ? "text-sky-600 font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>Warehouses</span>
                      <span className="text-[10px] text-emerald-600 font-mono font-semibold">WH-MAIN</span>
                    </Link>
                    <Link
                      href="/inventory/categories"
                      className={`tree-line-item block py-1.5 pl-2 text-xs font-medium transition-colors ${
                        pathname === "/inventory/categories"
                          ? "text-sky-600 font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Product Categories
                    </Link>
                  </div>
                )}
              </div>

              {/* Master Data */}
              {(user.roleCode === "ADMIN" || user.roleCode === "MANAGER") && (
                <Link
                  href="/master"
                  className={`group relative flex items-center transition-all ${
                    collapsed
                      ? `w-11 h-11 justify-center rounded-2xl ${
                          pathname === "/master" && !isInventoryActive
                            ? "bg-sky-500 text-white shadow-md shadow-sky-500/30 font-semibold"
                            : "text-slate-400 hover:text-slate-700 hover:bg-slate-100/80"
                        }`
                      : `justify-between rounded-xl px-3 py-2.5 text-xs font-medium ${
                          pathname === "/master" && !isInventoryActive
                            ? "bg-sky-500 text-white font-semibold shadow-sm shadow-sky-500/25"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Database
                      className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                        pathname === "/master" && !isInventoryActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                      }`}
                    />
                    {!collapsed && <span className="truncate">Master Data</span>}
                  </div>
                  {!collapsed && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 -translate-x-1 group-hover:translate-x-0">
                      Master Data
                    </div>
                  )}
                </Link>
              )}

              {/* Reporting */}
              {(user.roleCode === "ADMIN" || user.roleCode === "MANAGER") && (
                <Link
                  href="/reports"
                  className={`group relative flex items-center transition-all ${
                    collapsed
                      ? `w-11 h-11 justify-center rounded-2xl ${
                          pathname.startsWith("/reports")
                            ? "bg-sky-500 text-white shadow-md shadow-sky-500/30 font-semibold"
                            : "text-slate-400 hover:text-slate-700 hover:bg-slate-100/80"
                        }`
                      : `justify-between rounded-xl px-3 py-2.5 text-xs font-medium ${
                          pathname.startsWith("/reports")
                            ? "bg-sky-500 text-white font-semibold shadow-sm shadow-sky-500/25"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BarChart3
                      className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                        pathname.startsWith("/reports") ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                      }`}
                    />
                    {!collapsed && <span className="truncate">Reporting</span>}
                  </div>
                  {!collapsed && (
                    <ChevronRight className={`h-3.5 w-3.5 ${pathname.startsWith("/reports") ? "text-white/80" : "text-slate-400"}`} />
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 -translate-x-1 group-hover:translate-x-0">
                      Reporting & P&L
                    </div>
                  )}
                </Link>
              )}

              {/* AI Decision Support (Light blue icon stroke matching inspiration screenshot) */}
              <Link
                href="/ai-assistant"
                className={`group relative flex items-center transition-all ${
                  collapsed
                    ? `w-11 h-11 justify-center rounded-2xl ${
                        pathname.startsWith("/ai-assistant")
                          ? "bg-sky-500 text-white shadow-md shadow-sky-500/30 font-semibold"
                          : "text-sky-500 hover:bg-sky-50"
                      }`
                    : `justify-between rounded-xl px-3 py-2.5 text-xs font-medium ${
                        pathname.startsWith("/ai-assistant")
                          ? "bg-sky-500 text-white font-semibold shadow-sm shadow-sky-500/25"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bot
                    className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                      pathname.startsWith("/ai-assistant") ? "text-white" : "text-sky-500"
                    }`}
                  />
                  {!collapsed && <span className="truncate">AI Decision Support</span>}
                </div>
                {!collapsed && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                    pathname.startsWith("/ai-assistant")
                      ? "bg-white/20 text-white"
                      : "bg-sky-50 text-sky-700 border border-sky-200"
                  }`}>
                    Research
                  </span>
                )}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 -translate-x-1 group-hover:translate-x-0">
                    AI Decision Support
                  </div>
                )}
              </Link>

              {/* Admin & Audit */}
              {user.roleCode === "ADMIN" && (
                <Link
                  href="/admin"
                  className={`group relative flex items-center transition-all ${
                    collapsed
                      ? `w-11 h-11 justify-center rounded-2xl ${
                          pathname.startsWith("/admin")
                            ? "bg-sky-500 text-white shadow-md shadow-sky-500/30 font-semibold"
                            : "text-slate-400 hover:text-slate-700 hover:bg-slate-100/80"
                        }`
                      : `justify-between rounded-xl px-3 py-2.5 text-xs font-medium ${
                          pathname.startsWith("/admin")
                            ? "bg-sky-500 text-white font-semibold shadow-sm shadow-sky-500/25"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck
                      className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                        pathname.startsWith("/admin") ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                      }`}
                    />
                    {!collapsed && <span className="truncate">Administration</span>}
                  </div>
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 -translate-x-1 group-hover:translate-x-0">
                      Administration
                    </div>
                  )}
                </Link>
              )}
            </nav>
          </div>

          {/* Collapsed divider */}
          {collapsed && (
            <div className="w-8 h-[1px] bg-slate-100 mx-auto my-2" />
          )}

          {/* OTHERS section matching inspiration */}
          <div>
            {!collapsed && (
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                Others
              </div>
            )}

            <nav className={collapsed ? "space-y-2 flex flex-col items-center" : "space-y-1"}>
              <Link
                href="/inventory"
                className={`group relative flex items-center transition-all ${
                  collapsed
                    ? "w-11 h-11 justify-center rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80"
                    : "justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sliders className="h-[18px] w-[18px] shrink-0 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  {!collapsed && <span className="truncate">System Invariants</span>}
                </div>
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 -translate-x-1 group-hover:translate-x-0">
                    System Invariants
                  </div>
                )}
              </Link>
              <Link
                href="/ai-assistant"
                className={`group relative flex items-center transition-all ${
                  collapsed
                    ? "w-11 h-11 justify-center rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80"
                    : "justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Headphones className="h-[18px] w-[18px] shrink-0 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  {!collapsed && <span className="truncate">Support & Docs</span>}
                </div>
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 -translate-x-1 group-hover:translate-x-0">
                    Support & Docs
                  </div>
                )}
              </Link>
            </nav>
          </div>
        </div>

        {/* User profile card matching bottom of Screenshot 2 & Collapsed strip */}
        <div className="p-3 border-t border-slate-100 relative shrink-0">
          {collapsed ? (
            /* Collapsed Avatar Circle matching screenshot */
            <div className="relative flex justify-center">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="group relative h-11 w-11 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center shadow-md shadow-slate-900/15 cursor-pointer hover:scale-105 hover:ring-2 hover:ring-sky-500 transition-all active:scale-95"
                title={`${user.fullName} (${user.roleCode})`}
              >
                <span className="font-mono tracking-tight font-extrabold text-slate-100">
                  {user.fullName.slice(0, 1).toUpperCase()}
                </span>
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-sky-500 text-white flex items-center justify-center border-2 border-white">
                  <Check className="h-2 w-2 stroke-[3]" />
                </div>
              </button>

              {/* Floating Tooltip in collapsed mode */}
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 -translate-x-1 group-hover:translate-x-0">
                {user.fullName} &bull; {user.roleCode}
              </div>
            </div>
          ) : (
            /* Expanded Profile Card */
            <div
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                    {user.fullName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-sky-500 text-white flex items-center justify-center border border-white">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {user.fullName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate">
                    {user.roleName} &bull; @{user.username}
                  </div>
                </div>
              </div>

              <ChevronRight className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${showUserMenu ? "-rotate-90" : ""}`} />
            </div>
          )}

          {/* User Profile Dropdown with Sign Out */}
          {showUserMenu && (
            <div
              className={`absolute bottom-16 p-2 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 space-y-1.5 ${
                collapsed ? "left-20 ml-2 w-52" : "left-3 right-3"
              }`}
            >
              <div className="px-2.5 py-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {user.fullName}
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate">
                  {user.roleName} &bull; @{user.username}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 rounded-xl font-medium"
              >
                <LogOut className="h-3.5 w-3.5 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Workspace Area with smooth transition */}
      <div className="flex flex-1 flex-col h-full overflow-y-auto overflow-x-hidden min-w-0">
        {/* Top Navbar matching Vantus layout */}
        <header className="sticky top-0 z-30 flex h-20 shrink-0 items-center justify-between bg-white/95 backdrop-blur-md px-6 sm:px-8 border-b border-slate-200/70">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {getPageTitle()}
              </h1>
              {getBreadcrumbs()}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Outline Search Button */}
            <div className="relative hidden sm:block">
              <button
                type="button"
                className="h-10 w-10 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-700 shadow-xs transition-colors"
                title="Search ERP Data"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>

            {/* Notification Bell with alert dot */}
            <div className="relative">
              <button
                type="button"
                className="h-10 w-10 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-700 shadow-xs transition-colors"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>
            </div>

            {/* Quick action: New Sale */}
            <Link href="/sales/new">
              <Button
                variant="default"
                size="sm"
                className="h-10 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium shadow-sm shadow-sky-500/20 text-xs"
              >
                + New Sale
              </Button>
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 !m-0 bg-slate-900/40 backdrop-blur-sm pt-20 p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-bold text-slate-900">Navigation Menu</span>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <div className="space-y-1">
                {[
                  { name: "Dashboard", href: "/dashboard" },
                  { name: "Inventory & Products", href: "/inventory" },
                  { name: "Sales Invoices", href: "/sales" },
                  { name: "Purchasing", href: "/purchases" },
                  { name: "Accounting & Overhead", href: "/finance" },
                  { name: "Master Data", href: "/master" },
                  { name: "Reports & P&L", href: "/reports" },
                  { name: "AI Decision Support", href: "/ai-assistant" },
                ].map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-600"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">{user.fullName}</div>
                  <div className="text-[10px] text-slate-500">Role: {user.roleCode}</div>
                </div>
                <Button variant="destructive" size="sm" onClick={handleLogout} className="text-xs">
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-5 sm:p-7 max-w-[1400px] w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
