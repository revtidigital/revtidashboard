"use client";

import React, { useState, useEffect } from "react";
import { BarChart2, Plus, Trash2, Save, GripVertical, AlertCircle, CheckCircle2, Pencil, X } from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getWorkspaceService } from "@/lib/services/api";

interface ImpactNumber {
  id?: string;
  number: number;
  suffix: string | null;
  title: string;
  short_desc: string | null;
  display_order: number;
  is_active: boolean;
  deleted_at?: string | null;
}

const emptyItem = (): ImpactNumber => ({
  number: 0,
  suffix: "+",
  title: "",
  short_desc: "",
  display_order: 0,
  is_active: true,
});

const SUFFIX_OPTIONS = ["+", "%", "K", "M", "x", ""];

export default function ImpactPage() {
  const [items, setItems] = useState<ImpactNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [editItem, setEditItem] = useState<ImpactNumber | null>(null);
  const [isNew, setIsNew] = useState(false);

  const showAlert = (type: "success" | "error", msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const load = async () => {
    try {
      const service = getWorkspaceService();
      const data = await service.getImpactNumbers(true);
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const openNew = () => {
    setEditItem({ ...emptyItem(), display_order: items.length + 1 });
    setIsNew(true);
  };

  const openEdit = (item: ImpactNumber) => {
    setEditItem({ ...item });
    setIsNew(false);
  };

  const closeEdit = () => {
    setEditItem(null);
    setIsNew(false);
  };

  const saveItem = async () => {
    if (!editItem) return;
    if (!editItem.title.trim()) { showAlert("error", "Title is required."); return; }
    setSaving("form");
    try {
      if (isNew) {
        const service = getWorkspaceService();
        const created = await service.createImpactNumber({
          number: editItem.number,
          suffix: editItem.suffix,
          title: editItem.title.trim(),
          short_desc: (editItem.short_desc || "").trim(),
          display_order: editItem.display_order,
          is_active: editItem.is_active,
        });
        setItems((prev) => [...prev, created].sort((a, b) => a.display_order - b.display_order));
        showAlert("success", "Impact stat added!");
      } else {
        const service = getWorkspaceService();
        const updated = await service.updateImpactNumber(editItem.id!, {
          number: editItem.number,
          suffix: editItem.suffix,
          title: editItem.title.trim(),
          short_desc: (editItem.short_desc || "").trim(),
          display_order: editItem.display_order,
          is_active: editItem.is_active,
        });
        setItems((prev) => prev.map((item) => item.id === updated.id ? updated : item).sort((a, b) => a.display_order - b.display_order));
        showAlert("success", "Impact stat updated!");
      }
      closeEdit();
      await load();
    } catch (e: unknown) {
      showAlert("error", e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(null);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this stat?")) return;
    setSaving(id);
    try {
      const service = getWorkspaceService();
      const deleted = await service.deleteImpactNumber(id);
      setItems((prev) => prev.filter((item) => item.id !== deleted.id));
      showAlert("success", "Deleted.");
      await load();
    } catch (e: unknown) {
      showAlert("error", e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setSaving(null);
    }
  };

  const toggleActive = async (item: ImpactNumber) => {
    setSaving(item.id!);
    try {
      const service = getWorkspaceService();
      const updated = await service.updateImpactNumber(item.id!, { is_active: !item.is_active });
      setItems((prev) => prev.map((entry) => entry.id === updated.id ? updated : entry));
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(null); }
  };

  return (
    <LayoutShell>
      <div className="website-content-container space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <BarChart2 className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Impact Numbers</h1>
              <p className="text-sm text-slate-400">Manage homepage stats — add as many as needed</p>
            </div>
          </div>
          <Button onClick={openNew} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Add Stat
          </Button>
        </div>

        {/* Alert */}
        {alert && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium ${alert.type === "success" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
            {alert.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {alert.msg}
          </div>
        )}

        {/* Grid preview */}
        {items.filter(i => i.is_active).length > 0 && (
          <div className="p-4 bg-[#0F1629] border border-[#1E2D47] rounded-xl">
            <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-semibold">Live Preview — {items.filter(i => i.is_active).length} active boxes</p>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(160px, 1fr))` }}>
              {items.filter(i => i.is_active).map((item) => (
                <div key={item.id} className="bg-[#07090F] border border-[#1E2D47] rounded-xl p-4 text-center">
                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                    {item.number}{item.suffix}
                  </div>
                  <div className="text-sm font-semibold text-white mt-1">{item.title}</div>
                  {item.short_desc && <div className="text-xs text-slate-500 mt-1">{item.short_desc}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-[#0F1629] border border-[#1E2D47] rounded-xl">
            <BarChart2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No stats yet. Click &quot;Add Stat&quot; to begin.</p>
          </div>
        ) : (
          <div className="bg-[#0F1629] border border-[#1E2D47] rounded-xl overflow-hidden">
            {items.map((item, idx) => (
              <div key={item.id} className={`flex items-center gap-4 px-5 py-4 ${idx !== items.length - 1 ? "border-b border-[#1E2D47]" : ""}`}>
                <GripVertical className="h-4 w-4 text-slate-600 shrink-0" />
                <div className="text-2xl font-black text-white min-w-[60px]">{item.number}{item.suffix}</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  {item.short_desc && <p className="text-xs text-slate-500">{item.short_desc}</p>}
                </div>
                <button
                  onClick={() => toggleActive(item)}
                  className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${item.is_active ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-slate-700/40 text-slate-500 border border-slate-700"}`}
                >
                  {item.is_active ? "Active" : "Hidden"}
                </button>
                <button onClick={() => openEdit(item)} className="text-[#0EA5E9] hover:text-[#38BDF8] transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => deleteItem(item.id!)} disabled={saving === item.id} className="text-red-400 hover:text-red-300 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Edit/Add Modal */}
        {editItem && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0F1629] border border-[#1E2D47] rounded-2xl w-full max-w-md p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">{isNew ? "Add Stat" : "Edit Stat"}</h2>
                <button onClick={closeEdit} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Number</Label>
                  <Input type="number" value={editItem.number} onChange={(e) => setEditItem({ ...editItem, number: Number(e.target.value) })} className="bg-[#07090F] border-[#1E2D47] text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Suffix</Label>
                  <select value={editItem.suffix || ""} onChange={(e) => setEditItem({ ...editItem, suffix: e.target.value })} className="w-full rounded-md border border-[#1E2D47] bg-[#07090F] text-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0EA5E9]">
                    {SUFFIX_OPTIONS.map((s) => <option key={s} value={s}>{s || "(none)"}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Title / Label *</Label>
                <Input value={editItem.title} onChange={(e) => setEditItem({ ...editItem, title: e.target.value })} placeholder="Years of Experience" className="bg-[#07090F] border-[#1E2D47] text-white placeholder:text-slate-600" />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Short Description</Label>
                <Input value={editItem.short_desc || ""} onChange={(e) => setEditItem({ ...editItem, short_desc: e.target.value })} placeholder="Delivering results since 2018" className="bg-[#07090F] border-[#1E2D47] text-white placeholder:text-slate-600" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Display Order</Label>
                  <Input type="number" value={editItem.display_order} onChange={(e) => setEditItem({ ...editItem, display_order: Number(e.target.value) })} className="bg-[#07090F] border-[#1E2D47] text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Status</Label>
                  <select value={editItem.is_active ? "active" : "hidden"} onChange={(e) => setEditItem({ ...editItem, is_active: e.target.value === "active" })} className="w-full rounded-md border border-[#1E2D47] bg-[#07090F] text-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0EA5E9]">
                    <option value="active">Active</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={closeEdit} className="flex-1 border-[#1E2D47] text-slate-300 hover:bg-[#1E2D47]">Cancel</Button>
                <Button onClick={saveItem} disabled={saving === "form"} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white gap-2">
                  <Save className="h-4 w-4" />{saving === "form" ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
