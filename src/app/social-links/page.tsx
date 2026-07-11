"use client";

import React, { useState, useEffect } from "react";
import { Share2, Plus, Trash2, GripVertical, AlertCircle, CheckCircle2, Pencil, X, Save } from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getWorkspaceService } from "@/lib/services/api";

const PLATFORMS = [
  "Instagram", "Twitter/X", "LinkedIn", "Facebook", "YouTube",
  "GitHub", "Behance", "Dribbble", "WhatsApp", "Telegram",
  "TikTok", "Pinterest", "Medium", "Threads", "Discord",
];

const PLATFORM_ICONS: Record<string, string> = {
  "Instagram": "fa-instagram",
  "Twitter/X": "fa-twitter",
  "LinkedIn": "fa-linkedin",
  "Facebook": "fa-facebook",
  "YouTube": "fa-youtube",
  "GitHub": "fa-github",
  "Behance": "fa-behance",
  "Dribbble": "fa-dribbble",
  "WhatsApp": "fa-whatsapp",
  "Telegram": "fa-telegram",
  "TikTok": "fa-tiktok",
  "Pinterest": "fa-pinterest",
  "Medium": "fa-medium",
  "Threads": "fa-threads",
  "Discord": "fa-discord",
};

interface SocialLink {
  id?: string;
  platform: string;
  profile_url: string;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  deleted_at?: string | null;
}

const emptyLink = (): SocialLink => ({
  platform: "Instagram",
  profile_url: "",
  icon: "fa-instagram",
  display_order: 0,
  is_active: true,
});

export default function SocialLinksPage() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [editItem, setEditItem] = useState<SocialLink | null>(null);
  const [isNew, setIsNew] = useState(false);

  const showAlert = (type: "success" | "error", msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const load = async () => {
    try {
      const service = getWorkspaceService();
      const data = await service.getSocialLinks(true);
      setLinks(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const openNew = () => {
    setEditItem({ ...emptyLink(), display_order: links.length + 1 });
    setIsNew(true);
  };

  const openEdit = (item: SocialLink) => { setEditItem({ ...item }); setIsNew(false); };
  const closeEdit = () => { setEditItem(null); setIsNew(false); };

  const handlePlatformChange = (platform: string) => {
    if (!editItem) return;
    setEditItem({ ...editItem, platform, icon: PLATFORM_ICONS[platform] || "" });
  };

  const saveItem = async () => {
    if (!editItem) return;
    if (!editItem.profile_url.trim()) { showAlert("error", "Profile URL is required."); return; }
    setSaving("form");
    try {
      if (isNew) {
        const service = getWorkspaceService();
        const created = await service.createSocialLink({
          platform: editItem.platform,
          profile_url: editItem.profile_url.trim(),
          icon: editItem.icon,
          display_order: editItem.display_order,
          is_active: editItem.is_active,
        });
        setLinks((prev) => [...prev, created].sort((a, b) => a.display_order - b.display_order));
        showAlert("success", "Social link added!");
      } else {
        const service = getWorkspaceService();
        const updated = await service.updateSocialLink(editItem.id!, {
          platform: editItem.platform,
          profile_url: editItem.profile_url.trim(),
          icon: editItem.icon,
          display_order: editItem.display_order,
          is_active: editItem.is_active,
        });
        setLinks((prev) => prev.map((link) => link.id === updated.id ? updated : link).sort((a, b) => a.display_order - b.display_order));
        showAlert("success", "Social link updated!");
      }
      closeEdit();
      await load();
    } catch (e: unknown) {
      showAlert("error", e instanceof Error ? e.message : "Save failed.");
    } finally { setSaving(null); }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this social link?")) return;
    setSaving(id);
    try {
      const service = getWorkspaceService();
      const deleted = await service.deleteSocialLink(id);
      setLinks((prev) => prev.filter((link) => link.id !== deleted.id));
      showAlert("success", "Deleted.");
      await load();
    } catch (e: unknown) {
      showAlert("error", e instanceof Error ? e.message : "Delete failed.");
    } finally { setSaving(null); }
  };

  const toggleActive = async (item: SocialLink) => {
    setSaving(item.id!);
    try {
      const service = getWorkspaceService();
      const updated = await service.updateSocialLink(item.id!, { is_active: !item.is_active });
      setLinks((prev) => prev.map((link) => link.id === updated.id ? updated : link));
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(null); }
  };

  return (
    <LayoutShell>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20">
              <Share2 className="h-5 w-5 text-pink-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Social Media Links</h1>
              <p className="text-sm text-slate-400">Manage social links shown on your homepage</p>
            </div>
          </div>
          <Button onClick={openNew} className="bg-pink-600 hover:bg-pink-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Add Link
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
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-pink-400" />
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-16 bg-[#0F1629] border border-[#1E2D47] rounded-xl">
            <Share2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No social links yet. Click &quot;Add Link&quot; to begin.</p>
          </div>
        ) : (
          <div className="bg-[#0F1629] border border-[#1E2D47] rounded-xl overflow-hidden">
            {links.map((link, idx) => (
              <div key={link.id} className={`flex items-center gap-4 px-5 py-4 ${idx !== links.length - 1 ? "border-b border-[#1E2D47]" : ""}`}>
                <GripVertical className="h-4 w-4 text-slate-600 shrink-0" />
                <div className="w-10 h-10 rounded-lg bg-[#07090F] border border-[#1E2D47] flex items-center justify-center shrink-0">
                  <i className={`fa-brands ${link.icon || "fa-link"} text-slate-300`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{link.platform}</p>
                  <p className="text-xs text-slate-500 truncate max-w-xs">{link.profile_url}</p>
                </div>
                <button onClick={() => toggleActive(link)} className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${link.is_active ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-slate-700/40 text-slate-500 border border-slate-700"}`}>
                  {link.is_active ? "Active" : "Hidden"}
                </button>
                <button onClick={() => openEdit(link)} className="text-[#0EA5E9] hover:text-[#38BDF8]"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => deleteItem(link.id!)} disabled={saving === link.id} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}

        {editItem && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0F1629] border border-[#1E2D47] rounded-2xl w-full max-w-md p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">{isNew ? "Add Social Link" : "Edit Social Link"}</h2>
                <button onClick={closeEdit} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Platform</Label>
                <select value={editItem.platform} onChange={(e) => handlePlatformChange(e.target.value)} className="w-full rounded-md border border-[#1E2D47] bg-[#07090F] text-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0EA5E9]">
                  {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Profile URL *</Label>
                <Input value={editItem.profile_url} onChange={(e) => setEditItem({ ...editItem, profile_url: e.target.value })} placeholder="https://instagram.com/revtidigital" className="bg-[#07090F] border-[#1E2D47] text-white placeholder:text-slate-600" />
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
                <Button onClick={saveItem} disabled={saving === "form"} className="flex-1 bg-pink-600 hover:bg-pink-700 text-white gap-2">
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
