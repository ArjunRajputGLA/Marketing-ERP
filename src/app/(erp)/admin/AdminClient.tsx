"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  UserCheck,
  History,
  UserPlus,
  X,
  Eye,
  EyeOff,
  Check,
  User,
  Mail,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
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
import { Loader } from "@/components/ui/loader";

export function AdminClient() {
  const [activeTab, setActiveTab] = useState<"USERS" | "AUDIT">("USERS");
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "Password@123",
    roleCode: "USER" as "USER" | "MANAGER" | "ADMIN",
  });

  const loadData = () => {
    setLoading(true);
    fetch("/api/admin")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setAuditLogs(data.auditLogs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user account");
      }

      setFormSuccess(data.message || "User created successfully!");
      // Reset form
      setFormData({
        fullName: "",
        username: "",
        email: "",
        password: "Password@123",
        roleCode: "USER",
      });

      // Reload list
      loadData();

      // Close modal after brief delay
      setTimeout(() => {
        setShowAddModal(false);
        setFormSuccess(null);
      }, 1200);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-sky-500" />
            Administration & Immutable Audit Log
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Role definitions, user directory, and database change logs recorded by append-only triggers
          </p>
        </div>

        <div>
          <Button
            size="sm"
            onClick={() => {
              setFormError(null);
              setFormSuccess(null);
              setShowAddModal(true);
            }}
            className="h-10 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium shadow-xs flex items-center gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("USERS")}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "USERS"
                  ? "bg-sky-500 text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              Application Users ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("AUDIT")}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "AUDIT"
                  ? "bg-sky-500 text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              Append-Only Audit Trail (erp.audit_log)
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader size="sm" text="Loading administration records..." />
            </div>
          ) : activeTab === "USERS" ? (
            /* Users Table */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-400 font-semibold pl-5">User ID</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Full Name</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Username</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Email Address</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Assigned Role</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Status</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold pr-5">Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.user_id} className="hover:bg-slate-50/70 border-b border-slate-100/80">
                      <TableCell className="font-mono text-xs text-slate-400 pl-5">
                        #{u.user_id}
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-slate-900">
                        {u.full_name}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-600">
                        @{u.username}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            u.role_code === "ADMIN"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : u.role_code === "MANAGER"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {u.role_name || u.role_code}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            u.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 font-mono pr-5">
                        {u.last_login_at ? formatDate(u.last_login_at) : "Never"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Audit Log Table */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-400 font-semibold pl-5">Log ID</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Timestamp</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Table</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Action</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Record ID</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">User Role</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold pr-5">Old / New Values Preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.audit_id} className="hover:bg-slate-50/70 border-b border-slate-100/80">
                      <TableCell className="font-mono text-xs text-slate-400 pl-5">
                        #{log.audit_id}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-sky-600 font-semibold">
                        erp.{log.table_name}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                            log.action === "INSERT"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : log.action === "UPDATE"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-700">
                        {log.record_id}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-500">
                        {log.user_role || "SYSTEM"}
                      </TableCell>
                      <TableCell className="text-[11px] font-mono text-slate-500 max-w-xs truncate pr-5">
                        {log.new_values ? JSON.stringify(log.new_values) : "-"}
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

    {/* Add User Modal */}
    {showAddModal && (
      <div className="fixed inset-0 z-50 !m-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add System User</h3>
                  <p className="text-[11px] text-slate-500">
                    Provision Manager or Staff account credentials
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateUser}>
              <div className="p-5 space-y-4">
                {formError && (
                  <div className="p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                    {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="p-3 text-xs rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium flex items-center gap-1.5">
                    <Check className="h-4 w-4 stroke-[3]" />
                    {formSuccess}
                  </div>
                )}

                {/* Role Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Assigned Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, roleCode: "USER" })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        formData.roleCode === "USER"
                          ? "border-sky-500 bg-sky-50/50 ring-1 ring-sky-500"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Staff User</span>
                        {formData.roleCode === "USER" && (
                          <Check className="h-3.5 w-3.5 text-sky-600 stroke-[3]" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Sales, stock movement & invoicing
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, roleCode: "MANAGER" })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        formData.roleCode === "MANAGER"
                          ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Manager</span>
                        {formData.roleCode === "MANAGER" && (
                          <Check className="h-3.5 w-3.5 text-blue-600 stroke-[3]" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Full ops, purchases & catalog
                      </p>
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Full Name
                  </label>
                  <Input
                    placeholder="e.g. Priya Sharma"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    required
                    className="h-10 rounded-xl border-slate-200/80 text-xs"
                  />
                </div>

                {/* Username & Email Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Username
                    </label>
                    <Input
                      placeholder="e.g. priyas"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          username: e.target.value.toLowerCase().replace(/\s+/g, ""),
                        })
                      }
                      required
                      className="h-10 rounded-xl border-slate-200/80 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                      className="h-10 rounded-xl border-slate-200/80 text-xs"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Initial Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required
                      className="h-10 rounded-xl border-slate-200/80 pr-10 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Min 6 characters. User can sign in immediately with this password.
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-100 bg-slate-50/50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
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
                  {submitting ? "Provisioning..." : "Create User"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
