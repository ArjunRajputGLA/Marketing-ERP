"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, UserCheck, History, MoreVertical } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export function AdminClient() {
  const [activeTab, setActiveTab] = useState<"USERS" | "AUDIT">("USERS");
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setAuditLogs(data.auditLogs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
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
      </div>

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
            <div className="py-16 text-center text-xs text-slate-400 font-medium">
              Loading administration records...
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
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {u.role_code}
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
  );
}
