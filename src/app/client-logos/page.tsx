"use client";

import React, { useState, useEffect } from "react";
import { Image as ImageIcon, Plus, Trash2, GripVertical, AlertCircle, CheckCircle2, Pencil, X, Save } from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { getWorkspaceService } from "@/lib/services/api";

interface ClientLogo {
  id?: string;
  client_name: string | null;
  logo_image: string;
  display_order: number;
  is_active: boolean;
  deleted_at?: string | null;
}

const emptyLogo = (): ClientLogo => ({
  client_name: "",
  logo_image: "",
  display_order: 0,
  is_active: true,
});

export default function ClientLogosPage() {
  const [logos, setLogos] = useState<ClientLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [editItem, setEditItem] = useState<ClientLogo | null>(null);
  const [isNew, setIsNew] = useState(false);

  const showAlert = (type: "success" | "error", msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const load = async () => {
    try {
      const service = getWorkspaceService();
      const data = await service.getClientLogos(true);
      setLogos(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const openNew = () => {
    setEditItem({ ...emptyLogo(), display_order: logos.length + 1 });
    setIsNew(true);
  };

  const openEdit = (item: ClientLogo) => { setEditItem({ ...item }); setIsNew(false); };
  const closeEdit = () => { setEditItem(null); setIsNew(false); };

  const saveItem = async () => {
    if (!editItem) return;
    if (!editItem.logo_image.trim()) { showAlert("error", "Logo image URL is required."); return; }
    setSaving("form");
    try {
      if (isNew) {
        const service = getWorkspaceService();
        const created = await service.createClientLogo({
          client_name: (editItem.client_name || "").trim(),
          logo_image: editItem.logo_image.trim(),
          display_order: editItem.display_order,
          is_active: editItem.is_active,
        });
        setLogos((prev) => [...prev, created].sort((a, b) => a.display_order - b.display_order));
        showAlert("success", "Logo added!");
      } else {
        const service = getWorkspaceService();
        const updated = await service.updateClientLogo(editItem.id!, {
          client_name: (editItem.client_name || "").trim(),
          logo_image: editItem.logo_image.trim(),
          display_order: editItem.display_order,
          is_active: editItem.is_active,
        });
        setLogos((prev) => prev.map((logo) => logo.id === updated.id ? updated : logo).sort((a, b) => a.display_order - b.display_order));
        showAlert("success", "Logo updated!");
      }
      closeEdit();
      await load();
    } catch (e: unknown) {
      showAlert("error", e instanceof Error ? e.message : "Save failed.");
    } finally { setSaving(null); }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this logo?")) return;
    setSaving(id);
    try {
      const service = getWorkspaceService();
      const deleted = await service.deleteClientLogo(id);
      setLogos((prev) => prev.filter((logo) => logo.id !== deleted.id));
      showAlert("success", "Deleted.");
      await load();
    } catch (e: unknown) {
      showAlert("error", e instanceof Error ? e.message : "Delete failed.");
    } finally { setSaving(null); }
  };

  const toggleActive = async (item: ClientLogo) => {
    setSaving(item.id!);
    try {
      const service = getWorkspaceService();
      const updated = await service.updateClientLogo(item.id!, { is_active: !item.is_active });
      setLogos((prev) => prev.map((logo) => logo.id === updated.id ? updated : logo));
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(null); }
  };

  return (
    <LayoutShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <ImageIcon className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Client Logos</h1>
              <p className="text-sm text-slate-400">Manage the logo carousel on your homepage — unlimited logos</p>
            </div>
          </div>
          <Button onClick={openNew} className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Add Logo
          </Button>
        </div>

        {alert && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium ${alert.type === "success" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
            {alert.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {alert.msg}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-cyan-400" />
          </div>
        ) : logos.length === 0 ? (
          <div className="text-center py-16 bg-[#0F1629] border border-[#1E2D47] rounded-xl">
            <ImageIcon className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No logos yet. Click &quot;Add Logo&quot; to begin.</p>
          </div>
        ) : (
          <div className="bg-[#0F1629] border border-[#1E2D47] rounded-xl overflow-hidden">
            {logos.map((logo, idx) => (
              <div key={logo.id} className={`flex items-center gap-4 px-5 py-4 ${idx !== logos.length - 1 ? "border-b border-[#1E2D47]" : ""}`}>
                <GripVertical className="h-4 w-4 text-slate-600 shrink-0" />
                <div className="w-12 h-12 rounded-lg bg-[#07090F] border border-[#1E2D47] flex items-center justify-center overflow-hidden shrink-0">
                  {logo.logo_image ? (
                    <Image src={logo.logo_image} alt={logo.client_name || "Logo"} width={48} height={48} className="object-contain w-full h-full p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-slate-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{logo.client_name || <span className="text-slate-500 italic">No name</span>}</p>
                  <p className="text-xs text-slate-500 truncate max-w-xs">{logo.logo_image}</p>
                </div>
                <button onClick={() => toggleActive(logo)} className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${logo.is_active ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-slate-700/40 text-slate-500 border border-slate-700"}`}>
                  {logo.is_active ? "Active" : "Hidden"}
                </button>
                <button onClick={() => openEdit(logo)} className="text-[#0EA5E9] hover:text-[#38BDF8]"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => deleteItem(logo.id!)} disabled={saving === logo.id} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}

        {editItem && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0F1629] border border-[#1E2D47] rounded-2xl w-full max-w-md p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">{isNew ? "Add Logo" : "Edit Logo"}</h2>
                <button onClick={closeEdit} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Client Name (optional)</Label>
                <Input value={editItem.client_name || ""} onChange={(e) => setEditItem({ ...editItem, client_name: e.target.value })} placeholder="Apollo Health" className="bg-[#07090F] border-[#1E2D47] text-white placeholder:text-slate-600" />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Logo Image URL *</Label>
                <Input value={editItem.logo_image} onChange={(e) => setEditItem({ ...editItem, logo_image: e.target.value })} placeholder="https://... or /images/logo.png" className="bg-[#07090F] border-[#1E2D47] text-white placeholder:text-slate-600" />
                {editItem.logo_image && (
                  <div className="mt-2 p-3 bg-[#07090F] border border-[#1E2D47] rounded-lg flex items-center justify-center h-20">
                    <Image src={editItem.logo_image} alt="preview" width={80} height={60} className="object-contain max-h-16" onError={(e) => { (e.target as HTMLImageElement).src = ""; }} />
                  </div>
                )}
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
                <Button onClick={saveItem} disabled={saving === "form"} className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white gap-2">
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
