"use client";

import React, { useState, useEffect } from "react";
import {
  KeyRound,
  Plus,
  Trash2,
  CheckCircle,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Server,
  Globe,
  Cpu,
  Database,
  AtSign,
  Share2,
  Tag,
  StickyNote,
  AlertCircle,
} from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/lib/context/user-context";
import {
  getWorkspaceService,
  Credential,
  CredentialCategory,
} from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CredentialsPage() {
  return (
    <LayoutShell>
      <CredentialsContent />
    </LayoutShell>
  );
}

function CredentialsContent() {
  const { user } = useUser();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Credential Form
  const [showCredForm, setShowCredForm] = useState(false);
  const [recoveryFile, setRecoveryFile] = useState<File | null>(null);
  const [credForm, setCredForm] = useState<Omit<Credential, "id" | "created_at" | "updated_at">>({
    label: "",
    category: "hosting",
    username: "",
    password: "",
    url: "",
    notes: "",
    recovery_codes: "",
    recovery_file_name: "",
    recovery_file_path: "",
    created_by: null,
  });
  const [isSavingCred, setIsSavingCred] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadCredentialsData = async () => {
    try {
      const service = getWorkspaceService();
      const creds = await service.getCredentials();
      setCredentials(creds);
    } catch (err) {
      console.error("Failed to load credentials configuration:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCredentialsData();
    }
  }, [user]);

  const handleSaveCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!isAdmin || !credForm.label.trim()) return;
    setIsSavingCred(true);
    try {
      const service = getWorkspaceService();
      let updatedForm = { ...credForm };

      if (recoveryFile) {
        const fileData = await service.uploadCredentialFile(recoveryFile);
        updatedForm.recovery_file_name = fileData.fileName;
        updatedForm.recovery_file_path = fileData.filePath;
      }

      await service.createCredential({ ...updatedForm, created_by: user?.id || null });
      setCredForm({ 
        label: "", 
        category: "hosting", 
        username: "", 
        password: "", 
        url: "", 
        notes: "", 
        recovery_codes: "",
        recovery_file_name: "",
        recovery_file_path: "",
        created_by: null 
      });
      setRecoveryFile(null);
      setShowCredForm(false);
      loadCredentialsData();
    } catch (err: any) {
      console.error("Failed to save credential:", err);
      setErrorMsg(err.message || "Failed to save credential. Please try again.");
    } finally {
      setIsSavingCred(false);
    }
  };

  const handleDeleteCredential = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm("Delete this credential? This cannot be undone.")) return;
    try {
      const service = getWorkspaceService();
      await service.deleteCredential(id);
      loadCredentialsData();
    } catch (err: any) {
      console.error("Failed to delete credential:", err);
      alert(err.message || "Failed to delete credential.");
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-10 w-48 rounded bg-[#0F1629] animate-pulse" />
        <div className="h-12 w-full rounded bg-[#0F1629] animate-pulse" />
        <div className="h-80 rounded bg-[#0F1629] animate-pulse" />
      </div>
    );
  }

  const isAdmin = user?.role === "admin";

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-center justify-between border-b border-[#1E2D47] pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Credentials Vault
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Stored account credentials, tokens, and access details. Visible to all team members.
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setErrorMsg(null);
              setShowCredForm((v) => !v);
            }}
            className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white flex items-center gap-2 font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Credential
          </Button>
        )}
      </div>

      {/* Add Credential Form */}
      {showCredForm && isAdmin && (
        <Card className="border-[#1E2D47] bg-[#0F1629] p-6 text-white">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#0EA5E9]" />
            New Credential
          </h3>
          {errorMsg && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded bg-red-500/10 border border-red-500/20 text-xs text-[#EF4444]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          <form onSubmit={handleSaveCredential} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Label *</Label>
              <Input
                placeholder="e.g. GoDaddy Hosting, Vercel, cPanel"
                value={credForm.label}
                onChange={(e) => setCredForm((f) => ({ ...f, label: e.target.value }))}
                className="border-[#1E2D47] bg-[#07090F] text-white"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Category</Label>
              <Select
                value={credForm.category}
                onValueChange={(v) => setCredForm((f) => ({ ...f, category: v as CredentialCategory }))}
              >
                <SelectTrigger className="border-[#1E2D47] bg-[#07090F] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white">
                  <SelectItem value="hosting">Hosting</SelectItem>
                  <SelectItem value="domain">Domain</SelectItem>
                  <SelectItem value="cms">CMS</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="api">API / Token</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Username / Email</Label>
              <Input
                placeholder="login@example.com"
                value={credForm.username || ""}
                onChange={(e) => setCredForm((f) => ({ ...f, username: e.target.value }))}
                className="border-[#1E2D47] bg-[#07090F] text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Password / Token</Label>
              <Input
                placeholder="••••••••"
                value={credForm.password || ""}
                onChange={(e) => setCredForm((f) => ({ ...f, password: e.target.value }))}
                className="border-[#1E2D47] bg-[#07090F] text-white font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Website / Login URL</Label>
              <Input
                placeholder="https://login.example.com"
                value={credForm.url || ""}
                onChange={(e) => setCredForm((f) => ({ ...f, url: e.target.value }))}
                className="border-[#1E2D47] bg-[#07090F] text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Notes</Label>
              <Input
                placeholder="Any extra info (optional)"
                value={credForm.notes || ""}
                onChange={(e) => setCredForm((f) => ({ ...f, notes: e.target.value }))}
                className="border-[#1E2D47] bg-[#07090F] text-white"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-slate-300">Recovery Codes (Optional)</Label>
              <textarea
                placeholder="Paste recovery codes / 2FA backup codes here..."
                value={credForm.recovery_codes || ""}
                onChange={(e) => setCredForm((f) => ({ ...f, recovery_codes: e.target.value }))}
                className="w-full min-h-[80px] rounded-md border border-[#1E2D47] bg-[#07090F] p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#0EA5E9]"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-slate-300">Backup Codes File (Optional)</Label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  onChange={(e) => setRecoveryFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1E2D47] file:text-white hover:file:bg-[#252B45] cursor-pointer"
                />
                {recoveryFile && (
                  <button
                    type="button"
                    onClick={() => setRecoveryFile(null)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove File
                  </button>
                )}
              </div>
            </div>
            <div className="sm:col-span-2 flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={isSavingCred || !credForm.label.trim()}
                className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold flex items-center gap-2"
              >
                <KeyRound className="h-4 w-4" />
                {isSavingCred ? "Saving..." : "Save Credential"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setErrorMsg(null);
                  setRecoveryFile(null);
                  setShowCredForm(false);
                }}
                className="border-[#1E2D47] text-slate-300 hover:bg-[#1E2D47]"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Credentials List */}
      {credentials.length === 0 ? (
        <Card className="border-[#1E2D47] bg-[#0F1629] p-12 text-center text-[#94A3B8]">
          <KeyRound className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No credentials saved yet.</p>
          {isAdmin && <p className="text-xs mt-1">Click "Add Credential" to get started.</p>}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {credentials.map((cred) => {
            const isRevealed = revealedIds.has(cred.id);
            const categoryIcons: Record<CredentialCategory, React.ReactNode> = {
              hosting: <Server className="h-4 w-4" />,
              domain: <Globe className="h-4 w-4" />,
              cms: <Cpu className="h-4 w-4" />,
              database: <Database className="h-4 w-4" />,
              email: <AtSign className="h-4 w-4" />,
              social: <Share2 className="h-4 w-4" />,
              api: <Tag className="h-4 w-4" />,
              other: <StickyNote className="h-4 w-4" />,
            };
            const categoryColors: Record<CredentialCategory, string> = {
              hosting: "text-[#0EA5E9] bg-[#0EA5E9]/10 border-[#0EA5E9]/20",
              domain: "text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/20",
              cms: "text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20",
              database: "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20",
              email: "text-[#A78BFA] bg-[#A78BFA]/10 border-[#A78BFA]/20",
              social: "text-[#FB7185] bg-[#FB7185]/10 border-[#FB7185]/20",
              api: "text-[#34D399] bg-[#34D399]/10 border-[#34D399]/20",
              other: "text-slate-400 bg-slate-400/10 border-slate-400/20",
            };

            return (
              <Card
                key={cred.id}
                className="border-[#1E2D47] bg-[#0F1629] p-5 text-white flex flex-col gap-4 hover:border-[#0EA5E9]/30 transition-colors"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`flex-shrink-0 rounded-md border p-1.5 ${categoryColors[cred.category]}`}>
                      {categoryIcons[cred.category]}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-white truncate">{cred.label}</p>
                      <p className="text-[10px] text-[#94A3B8] capitalize mt-0.5">{cred.category}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteCredential(cred.id)}
                      className="flex-shrink-0 p-1.5 rounded hover:bg-[#EF4444]/10 text-slate-500 hover:text-[#EF4444] transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Fields */}
                <div className="flex flex-col gap-2.5 text-xs">
                  {cred.username && (
                    <div className="flex items-center justify-between gap-2 p-2 rounded bg-[#07090F] border border-[#1E2D47]">
                      <div className="min-w-0">
                        <p className="text-[#94A3B8] text-[10px] uppercase tracking-wider mb-0.5">Username / Email</p>
                        <p className="font-mono text-slate-200 truncate">{cred.username}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(cred.username!, `${cred.id}-user`)}
                        className="flex-shrink-0 p-1.5 rounded hover:bg-[#1E2D47] text-[#94A3B8] hover:text-white transition-colors"
                        title="Copy"
                      >
                        {copiedKey === `${cred.id}-user` ? (
                          <CheckCircle className="h-3.5 w-3.5 text-[#22C55E]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {cred.password && (
                    <div className="flex items-center justify-between gap-2 p-2 rounded bg-[#07090F] border border-[#1E2D47]">
                      <div className="min-w-0 flex-1">
                        <p className="text-[#94A3B8] text-[10px] uppercase tracking-wider mb-0.5">Password / Token</p>
                        <p className={`font-mono text-slate-200 truncate ${!isRevealed ? "blur-sm select-none" : ""}`}>
                          {cred.password}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1">
                        <button
                          onClick={() => toggleReveal(cred.id)}
                          className="p-1.5 rounded hover:bg-[#1E2D47] text-[#94A3B8] hover:text-white transition-colors"
                          title={isRevealed ? "Hide" : "Show"}
                        >
                          {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(cred.password!, `${cred.id}-pass`)}
                          className="p-1.5 rounded hover:bg-[#1E2D47] text-[#94A3B8] hover:text-white transition-colors"
                          title="Copy"
                        >
                          {copiedKey === `${cred.id}-pass` ? (
                            <CheckCircle className="h-3.5 w-3.5 text-[#22C55E]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {cred.url && (
                    <div className="flex items-center justify-between gap-2 p-2 rounded bg-[#07090F] border border-[#1E2D47]">
                      <div className="min-w-0 flex-1">
                        <p className="text-[#94A3B8] text-[10px] uppercase tracking-wider mb-0.5">Login URL</p>
                        <p className="font-mono text-[#0EA5E9] truncate text-[11px]">{cred.url}</p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1">
                        <a
                          href={cred.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-[#1E2D47] text-[#94A3B8] hover:text-white transition-colors"
                          title="Open"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() => copyToClipboard(cred.url!, `${cred.id}-url`)}
                          className="p-1.5 rounded hover:bg-[#1E2D47] text-[#94A3B8] hover:text-white transition-colors"
                          title="Copy"
                        >
                          {copiedKey === `${cred.id}-url` ? (
                            <CheckCircle className="h-3.5 w-3.5 text-[#22C55E]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {cred.notes && (
                    <div className="p-2 rounded bg-[#07090F] border border-[#1E2D47]">
                      <p className="text-[#94A3B8] text-[10px] uppercase tracking-wider mb-0.5">Notes</p>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{cred.notes}</p>
                    </div>
                  )}

                  {cred.recovery_codes && (
                    <div className="flex items-center justify-between gap-2 p-2 rounded bg-[#07090F] border border-[#1E2D47]">
                      <div className="min-w-0 flex-1">
                        <p className="text-[#94A3B8] text-[10px] uppercase tracking-wider mb-0.5">Recovery Codes</p>
                        <p className={`font-mono text-slate-200 truncate ${!revealedIds.has(`${cred.id}-recovery`) ? "blur-sm select-none" : ""}`}>
                          {cred.recovery_codes}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1">
                        <button
                          onClick={() => toggleReveal(`${cred.id}-recovery`)}
                          className="p-1.5 rounded hover:bg-[#1E2D47] text-[#94A3B8] hover:text-white transition-colors"
                          title={revealedIds.has(`${cred.id}-recovery`) ? "Hide" : "Show"}
                        >
                          {revealedIds.has(`${cred.id}-recovery`) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(cred.recovery_codes!, `${cred.id}-recovery-copy`)}
                          className="p-1.5 rounded hover:bg-[#1E2D47] text-[#94A3B8] hover:text-white transition-colors"
                          title="Copy"
                        >
                          {copiedKey === `${cred.id}-recovery-copy` ? (
                            <CheckCircle className="h-3.5 w-3.5 text-[#22C55E]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {cred.recovery_file_path && (
                    <div className="flex items-center justify-between gap-2 p-2 rounded bg-[#07090F] border border-[#1E2D47]">
                      <div className="min-w-0 flex-1">
                        <p className="text-[#94A3B8] text-[10px] uppercase tracking-wider mb-0.5">Backup Codes File</p>
                        <p className="font-semibold text-white truncate text-[11px]">{cred.recovery_file_name || "backup_codes"}</p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1">
                        <a
                          href={cred.recovery_file_path}
                          download={cred.recovery_file_name || "backup-codes"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-[#1E2D47] text-[#0EA5E9] hover:text-[#38BDF8] transition-colors"
                          title="Download File"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
