"use client";

import React, { useEffect, useState } from "react";
import {
  Boxes,
  Building2,
  Check,
  CheckCircle2,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  Warehouse as WarehouseIcon,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import Loader from "@/components/ui/loader";

export function WarehousesClient() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: "",
    name: "",
    location: "",
    isDefault: false,
  });

  const loadWarehouses = () => {
    setLoading(true);
    fetch("/api/inventory/warehouses")
      .then((res) => res.json())
      .then((data) => {
        setWarehouses(data.warehouses || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/inventory/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create warehouse");
      }

      setShowModal(false);
      setForm({ code: "", name: "", location: "", isDefault: false });
      loadWarehouses();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const defaultWh = warehouses.find((w) => w.is_default) || warehouses[0];
  const totalSkus = warehouses.reduce(
    (sum, w) => sum + Number(w.stocked_products_count || 0),
    0
  );
  const totalUnits = warehouses.reduce(
    (sum, w) => sum + Number(w.total_units_stored || 0),
    0
  );

  return (
    <>
      <div className="space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-sky-500" />
              Warehouses & Storage Facilities
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Distribution centers, logistics bays, and authoritative warehouse inventory nodes
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setFormError(null);
                setShowModal(true);
              }}
              className="h-10 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium shadow-xs flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Warehouse
            </Button>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Active Facilities</span>
              <div className="h-7 w-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <WarehouseIcon className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
              {warehouses.length}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">
              Operational Storage Nodes
            </div>
          </Card>

          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Default Storage Hub</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-lg font-bold text-slate-900 mt-2 font-mono truncate">
              {defaultWh ? defaultWh.code : "None"}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1 truncate">
              {defaultWh ? defaultWh.name : "No default designated"}
            </div>
          </Card>

          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Stocked Product SKUs</span>
              <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
              {totalSkus}
            </div>
            <div className="text-[11px] text-indigo-600 font-medium mt-1">
              Distinct Items in Stock
            </div>
          </Card>

          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Stock Stored</span>
              <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Boxes className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
              {Math.max(0, totalUnits).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              Aggregate Ledger Stock
            </div>
          </Card>
        </div>

        {/* Warehouses Visual Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {warehouses.map((wh) => (
            <Card
              key={wh.warehouse_id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {wh.code.slice(0, 3)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{wh.name}</h3>
                    <div className="text-xs font-mono text-slate-500">{wh.code}</div>
                  </div>
                </div>
                {wh.is_default && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Default
                  </span>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{wh.location || "Central Location"}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-400">Stocked SKUs:</span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {wh.stocked_products_count || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Facility Status:</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Operational
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Warehouses Table Card */}
        <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-100 bg-white">
            <h2 className="text-sm font-bold text-slate-900">
              Storage Facility Directory ({warehouses.length})
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <Loader size="sm" text="Loading facility directory..." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-100 hover:bg-transparent">
                      <TableHead className="text-xs text-slate-400 font-semibold pl-5">
                        Facility ID
                      </TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold">
                        Code
                      </TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold">
                        Facility Name
                      </TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold">
                        Location / Address
                      </TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold">
                        Default Hub
                      </TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold text-right">
                        Stocked SKUs
                      </TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold pr-5 text-right">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouses.map((wh) => (
                      <TableRow
                        key={wh.warehouse_id}
                        className="hover:bg-slate-50/70 border-b border-slate-100/80"
                      >
                        <TableCell className="font-mono text-xs text-slate-400 pl-5">
                          #{wh.warehouse_id}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-xs text-sky-600">
                          {wh.code}
                        </TableCell>
                        <TableCell className="font-semibold text-xs text-slate-900">
                          {wh.name}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {wh.location || "Primary Central Facility"}
                        </TableCell>
                        <TableCell>
                          {wh.is_default ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Yes
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">No</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-700">
                          {wh.stocked_products_count || 0}
                        </TableCell>
                        <TableCell className="text-right pr-5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                            Active
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Warehouse Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 !m-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Warehouse</h3>
                  <p className="text-[11px] text-slate-500">
                    Register a new storage location or distribution facility
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse}>
              <div className="p-5 space-y-4">
                {formError && (
                  <div className="p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Facility Code
                    </label>
                    <Input
                      placeholder="e.g. WH-NORTH"
                      value={form.code}
                      onChange={(e) =>
                        setForm({ ...form, code: e.target.value.toUpperCase() })
                      }
                      required
                      className="h-10 rounded-xl border-slate-200/80 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Facility Name
                    </label>
                    <Input
                      placeholder="e.g. North Hub"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      className="h-10 rounded-xl border-slate-200/80 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Physical Location / Address
                  </label>
                  <Input
                    placeholder="e.g. Industrial Area, Phase 2, Bay 4"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="h-10 rounded-xl border-slate-200/80 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="whDefault"
                    checked={form.isDefault}
                    onChange={(e) =>
                      setForm({ ...form, isDefault: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                  />
                  <label htmlFor="whDefault" className="text-xs text-slate-700 font-medium cursor-pointer">
                    Set as default destination warehouse for new purchases & sales
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-100 bg-slate-50/50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border-slate-200 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs shadow-xs"
                >
                  {submitting ? "Saving..." : "Create Warehouse"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
