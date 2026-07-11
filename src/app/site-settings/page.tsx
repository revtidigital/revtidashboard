"use client";

import React, { useState, useEffect } from "react";
import { Globe, Save, Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getWorkspaceService, JsonRecord } from "@/lib/services/api";

interface HeroButton {
  text: string;
  link: string;
  icon: string;
  new_tab: boolean;
}

interface HeroSection {
  tagline: string;
  heading: string;
  heading_highlight: string;
  sub_heading: string;
  buttons: HeroButton[];
}

interface ContactSection {
  heading: string;
  heading_highlight: string;
  button: { text: string; link: string };
}

const defaultHero: HeroSection = {
  tagline: "Digital Agency · Est. 2018",
  heading: "We Make Digital Matter.",
  heading_highlight: "Digital",
  sub_heading:
    "From SEO-driven growth strategies to full-scale enterprise software — Revti Digital builds things that perform.",
  buttons: [
    { text: "View Our Work", link: "#portfolio", icon: "fa-arrow-down", new_tab: false },
    { text: "Start a Project", link: "#contact", icon: "fa-paper-plane", new_tab: false },
  ],
};

const defaultContact: ContactSection = {
  heading: "Let's Create Something Together",
  heading_highlight: "Together",
  button: { text: "Get In Touch!", link: "mailto:hello@revtidigital.com" },
};

export default function SiteSettingsPage() {
  const [hero, setHero] = useState<HeroSection>(defaultHero);
  const [contact, setContact] = useState<ContactSection>(defaultContact);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"hero" | "contact">("hero");

  useEffect(() => {
    const load = async () => {
      try {
        const service = getWorkspaceService();
        const data = await service.getSiteSettings();
        const heroRow = data.find((r) => r.key === "hero_section");
        const contactRow = data.find((r) => r.key === "contact_section");
        if (heroRow?.value) setHero({ ...defaultHero, ...heroRow.value } as HeroSection);
        if (contactRow?.value) setContact({ ...defaultContact, ...contactRow.value } as ContactSection);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const showAlert = (type: "success" | "error", msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const saveHero = async () => {
    setSaving(true);
    try {
      const service = getWorkspaceService();
      const saved = await service.upsertSiteSetting("hero_section", hero as unknown as JsonRecord);
      setHero({ ...defaultHero, ...saved.value } as HeroSection);
      showAlert("success", "Hero section saved successfully!");
    } catch (e: unknown) {
      showAlert("error", e instanceof Error ? e.message : "Failed to save hero section.");
    } finally {
      setSaving(false);
    }
  };

  const saveContact = async () => {
    setSaving(true);
    try {
      const service = getWorkspaceService();
      const saved = await service.upsertSiteSetting("contact_section", contact as unknown as JsonRecord);
      setContact({ ...defaultContact, ...saved.value } as ContactSection);
      showAlert("success", "Contact section saved successfully!");
    } catch (e: unknown) {
      showAlert("error", e instanceof Error ? e.message : "Failed to save contact section.");
    } finally {
      setSaving(false);
    }
  };

  const updateButton = (index: number, field: keyof HeroButton, value: string | boolean) => {
    const updated = [...hero.buttons];
    updated[index] = { ...updated[index], [field]: value };
    setHero({ ...hero, buttons: updated });
  };

  const addButton = () => {
    if (hero.buttons.length >= 2) return;
    setHero({ ...hero, buttons: [...hero.buttons, { text: "", link: "", icon: "", new_tab: false }] });
  };

  const removeButton = (index: number) => {
    setHero({ ...hero, buttons: hero.buttons.filter((_, i) => i !== index) });
  };

  if (loading) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#0EA5E9]" />
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-[#0EA5E9]/10 border border-[#0EA5E9]/20">
            <Globe className="h-5 w-5 text-[#0EA5E9]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Site Settings</h1>
            <p className="text-sm text-slate-400">Manage hero and contact section content</p>
          </div>
        </div>

        {/* Alert */}
        {alert && (
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium ${
              alert.type === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {alert.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {alert.msg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#0F1629] rounded-lg border border-[#1E2D47] w-fit">
          {(["hero", "contact"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? "bg-[#0EA5E9] text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab === "hero" ? "Hero Section" : "Contact Section"}
            </button>
          ))}
        </div>

        {/* Hero Tab */}
        {activeTab === "hero" && (
          <div className="bg-[#0F1629] border border-[#1E2D47] rounded-xl p-6 space-y-5">
            <h2 className="text-white font-semibold text-base">Hero Section</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Small Tagline / Eyebrow</Label>
                <Input
                  value={hero.tagline}
                  onChange={(e) => setHero({ ...hero, tagline: e.target.value })}
                  placeholder="Digital Agency · Est. 2018"
                  className="bg-[#07090F] border-[#1E2D47] text-white placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Highlighted / Gradient Text</Label>
                <Input
                  value={hero.heading_highlight}
                  onChange={(e) => setHero({ ...hero, heading_highlight: e.target.value })}
                  placeholder="Digital"
                  className="bg-[#07090F] border-[#1E2D47] text-white placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Main Heading</Label>
              <Input
                value={hero.heading}
                onChange={(e) => setHero({ ...hero, heading: e.target.value })}
                placeholder="We Make Digital Matter."
                className="bg-[#07090F] border-[#1E2D47] text-white placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Sub Heading / Description</Label>
              <textarea
                value={hero.sub_heading}
                onChange={(e) => setHero({ ...hero, sub_heading: e.target.value })}
                rows={3}
                placeholder="From SEO-driven growth strategies..."
                className="w-full rounded-md border border-[#1E2D47] bg-[#07090F] text-white px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#0EA5E9] resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 text-sm">CTA Buttons (max 2)</Label>
                {hero.buttons.length < 2 && (
                  <button
                    onClick={addButton}
                    className="flex items-center gap-1 text-xs text-[#0EA5E9] hover:text-[#38BDF8] transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Add Button
                  </button>
                )}
              </div>
              {hero.buttons.map((btn, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-[#07090F] border border-[#1E2D47] rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Button Text</p>
                    <Input
                      value={btn.text}
                      onChange={(e) => updateButton(i, "text", e.target.value)}
                      placeholder="View Our Work"
                      className="bg-[#0F1629] border-[#1E2D47] text-white text-sm placeholder:text-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Link / URL</p>
                    <Input
                      value={btn.link}
                      onChange={(e) => updateButton(i, "link", e.target.value)}
                      placeholder="#portfolio"
                      className="bg-[#0F1629] border-[#1E2D47] text-white text-sm placeholder:text-slate-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Icon class (optional)</p>
                    <Input
                      value={btn.icon}
                      onChange={(e) => updateButton(i, "icon", e.target.value)}
                      placeholder="fa-arrow-down"
                      className="bg-[#0F1629] border-[#1E2D47] text-white text-sm placeholder:text-slate-600"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer pb-2">
                      <input
                        type="checkbox"
                        checked={btn.new_tab}
                        onChange={(e) => updateButton(i, "new_tab", e.target.checked)}
                        className="rounded"
                      />
                      New Tab
                    </label>
                    <button
                      onClick={() => removeButton(i)}
                      className="text-red-400 hover:text-red-300 pb-2 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={saveHero}
                disabled={saving}
                className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Hero Section"}
              </Button>
            </div>
          </div>
        )}

        {/* Contact Tab */}
        {activeTab === "contact" && (
          <div className="bg-[#0F1629] border border-[#1E2D47] rounded-xl p-6 space-y-5">
            <h2 className="text-white font-semibold text-base">Contact Section</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Main Heading</Label>
                <Input
                  value={contact.heading}
                  onChange={(e) => setContact({ ...contact, heading: e.target.value })}
                  placeholder="Let's Create Something Together"
                  className="bg-[#07090F] border-[#1E2D47] text-white placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Muted / Highlighted Word</Label>
                <Input
                  value={contact.heading_highlight}
                  onChange={(e) => setContact({ ...contact, heading_highlight: e.target.value })}
                  placeholder="Together"
                  className="bg-[#07090F] border-[#1E2D47] text-white placeholder:text-slate-600"
                />
                <p className="text-xs text-slate-500">This word will appear in a muted color in the heading.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Button Text</Label>
                <Input
                  value={contact.button.text}
                  onChange={(e) =>
                    setContact({ ...contact, button: { ...contact.button, text: e.target.value } })
                  }
                  placeholder="Get In Touch!"
                  className="bg-[#07090F] border-[#1E2D47] text-white placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Button Link / URL</Label>
                <Input
                  value={contact.button.link}
                  onChange={(e) =>
                    setContact({ ...contact, button: { ...contact.button, link: e.target.value } })
                  }
                  placeholder="mailto:hello@revtidigital.com or Calendly link"
                  className="bg-[#07090F] border-[#1E2D47] text-white placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={saveContact}
                disabled={saving}
                className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Contact Section"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
