"use client";

import React, { useState, useEffect } from "react";
import {
  Users as UsersIcon,
  FolderOpen,
  Palette,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Mail,
  Send,
  X,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Globe,
  Server,
  Database,
  AtSign,
  Share2,
  Cpu,
  Tag,
  ExternalLink,
  StickyNote,
} from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/lib/context/user-context";
import {
  getWorkspaceService,
  User,
  Category,
  UserRole,
  Credential,
  CredentialCategory,
} from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PALETTE_COLORS = [
  { name: "Purple", hex: "#0EA5E9" },
  { name: "Indigo", hex: "#38BDF8" },
  { name: "Green", hex: "#22C55E" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Red", hex: "#EF4444" },
  { name: "Orange", hex: "#F59E0B" },
  { name: "Slate", hex: "#64748B" },
];

export default function SettingsPage() {
  return (
    <LayoutShell>
      <SettingsContent />
    </LayoutShell>
  );
}

function SettingsContent() {
  const { user, users: allUsers, refreshUser } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Category Form
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#0EA5E9");
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  // Invite User Form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("view");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

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
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadSettingsData = async () => {
    try {
      const service = getWorkspaceService();
      const [all, cats, creds] = await Promise.all([
        service.getUsers(),
        service.getCategories(),
        service.getCredentials(),
      ]);
      setUsers(all);
      setCategories(cats);
      setCredentials(creds);
    } catch (err) {
      console.error("Failed to load settings configuration:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadSettingsData();
    }
  }, [user]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !isAdmin) return;
    setIsInviting(true);
    setInviteStatus(null);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invite failed");
      setInviteStatus({ type: "success", message: `Invite sent to ${inviteEmail.trim()} successfully!` });
      setInviteEmail("");
      setInviteRole("view");
    } catch (err: any) {
      setInviteStatus({ type: "error", message: err.message || "Failed to send invite" });
    } finally {
      setIsInviting(false);
    }
  };

  const handleSaveCredential = async (e: React.FormEvent) => {
    e.preventDefault();
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
      loadSettingsData();
    } catch (err) {
      console.error("Failed to save credential:", err);
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
      loadSettingsData();
    } catch (err) {
      console.error("Failed to delete credential:", err);
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

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (user?.role !== "admin") return;
    try {
      const service = getWorkspaceService();
      await service.updateUserRole(userId, newRole);
      loadSettingsData();
      if (userId === user.id) {
        await refreshUser();
      }
    } catch (err) {
      console.error("Failed to update user role:", err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== "admin" || !newCatName.trim()) return;
    setIsCreatingCat(true);
    try {
      const service = getWorkspaceService();
      await service.createCategory(newCatName.trim(), newCatColor);
      setNewCatName("");
      setNewCatColor("#0EA5E9");
      loadSettingsData();
    } catch (err) {
      console.error("Failed to create category:", err);
    } finally {
      setIsCreatingCat(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (user?.role !== "admin") return;
    if (!confirm("Are you sure you want to delete this category? Documents assigned to this category will become Uncategorized.")) return;
    try {
      const service = getWorkspaceService();
      await service.deleteCategory(catId);
      loadSettingsData();
    } catch (err) {
      console.error("Failed to delete category:", err);
    }
  };

  const handleSeedDefaultCategories = async () => {
    if (user?.role !== "admin") return;
    setIsLoading(true);
    try {
      const service = getWorkspaceService();
      const defaults = [
        { name: "SOPs", color: "#0EA5E9" },
        { name: "Documentation", color: "#38BDF8" },
        { name: "Training", color: "#22C55E" },
        { name: "Templates", color: "#3B82F6" },
        { name: "Policies", color: "#EF4444" },
        { name: "Resources", color: "#F59E0B" }
      ];

      for (const d of defaults) {
        const exists = categories.some(
          (c) => c.name.toLowerCase() === d.name.toLowerCase() || c.slug === d.name.toLowerCase()
        );
        if (!exists) {
          await service.createCategory(d.name, d.color);
        }
      }
      await loadSettingsData();
      alert("Default categories seeded successfully!");
    } catch (err) {
      console.error("Failed to seed default categories:", err);
      alert("Error seeding categories: " + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
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
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          Settings
        </h1>
        <p className="mt-2 text-sm text-[#94A3B8]">
          Configure company user directories, knowledge-base categories, and client appearances.
        </p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        {/* Navigation Tabs Header */}
        <TabsList className="bg-[#0F1629] border border-[#1E2D47] text-slate-400 p-1 mb-6">
          <TabsTrigger
            value="users"
            className="data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white flex items-center gap-1.5 px-4"
          >
            <UsersIcon className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white flex items-center gap-1.5 px-4"
          >
            <FolderOpen className="h-4 w-4" />
            Categories Management
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className="data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white flex items-center gap-1.5 px-4"
          >
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger
            value="credentials"
            className="data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white flex items-center gap-1.5 px-4"
          >
            <KeyRound className="h-4 w-4" />
            Credentials Vault
          </TabsTrigger>
        </TabsList>

        {/* ========================================== */}
        {/* TAB 1: User Management */}
        {/* ========================================== */}
        <TabsContent value="users">
          {/* Invite User Card */}
          {isAdmin && (
            <Card className="border-[#1E2D47] bg-[#0F1629] p-6 text-white mb-6">
              <div className="flex items-center gap-2 border-b border-[#1E2D47] pb-4 mb-5">
                <Mail className="h-5 w-5 text-[#0EA5E9]" />
                <div>
                  <h2 className="text-lg font-bold text-white">Invite Team Member</h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    An invite email will be sent. User sets their own password on first login.
                  </p>
                </div>
              </div>

              {inviteStatus && (
                <div
                  className={`flex items-start justify-between gap-3 p-3 rounded-lg border text-xs mb-5 ${
                    inviteStatus.type === "success"
                      ? "bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]"
                      : "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {inviteStatus.type === "success" ? (
                      <CheckCircle className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                    )}
                    <span>{inviteStatus.message}</span>
                  </div>
                  <button onClick={() => setInviteStatus(null)} className="shrink-0 opacity-60 hover:opacity-100">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <form onSubmit={handleInviteUser} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Label htmlFor="invite-email" className="text-xs font-semibold text-slate-300 mb-1.5 block">
                    Email Address
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="name@revtidigital.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="border-[#1E2D47] bg-[#07090F] text-white focus:ring-[#0EA5E9]"
                    required
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                    Initial Role
                  </Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                    <SelectTrigger className="border-[#1E2D47] bg-[#07090F] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white">
                      <SelectItem value="view">VIEW (Read Only)</SelectItem>
                      <SelectItem value="edit">EDIT (Create & Edit)</SelectItem>
                      <SelectItem value="admin">ADMIN (Full Access)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="submit"
                    disabled={isInviting || !inviteEmail.trim()}
                    className="w-full sm:w-auto bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold flex items-center gap-2 whitespace-nowrap"
                  >
                    <Send className="h-4 w-4" />
                    {isInviting ? "Sending..." : "Send Invite"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card className="border-[#1E2D47] bg-[#0F1629] p-6 text-white">
            <div className="flex items-center justify-between border-b border-[#1E2D47] pb-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">User Directory Roles</h2>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Manage authorization scopes. Roles enforce viewing/writing rules across the platform.
                </p>
              </div>
            </div>

            {!isAdmin && (
              <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B]">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold">Administrator access required</p>
                  <p className="text-slate-400 mt-0.5">
                    Only administrators can modify user permission levels. You are currently logged in as{" "}
                    <span className="font-semibold text-white">{user?.full_name}</span> (Role:{" "}
                    <span className="font-semibold text-white uppercase">{user?.role}</span>).
                  </p>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-[#1E2D47]">
              <Table>
                <TableHeader className="bg-[#07090F]">
                  <TableRow className="border-[#1E2D47] hover:bg-transparent">
                    <TableHead className="text-[#94A3B8] font-bold">User</TableHead>
                    <TableHead className="text-[#94A3B8] font-bold">Email</TableHead>
                    <TableHead className="text-[#94A3B8] font-bold">Permission Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="border-[#1E2D47] hover:bg-[#1E2D47]/20">
                      <TableCell className="font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0EA5E9]/15 text-[#0EA5E9] text-xs font-bold">
                            {u.full_name?.charAt(0) || "U"}
                          </div>
                          {u.full_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">{u.email}</TableCell>
                      <TableCell>
                        <Select
                          disabled={!isAdmin || u.id === user?.id} // Don't let user change their own admin role
                          value={u.role}
                          onValueChange={(val) => handleRoleChange(u.id, (val as UserRole) || "view")}
                        >
                          <SelectTrigger className="w-[180px] border-[#1E2D47] bg-[#07090F] text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white">
                            <SelectItem value="view" className="hover:bg-[#1E2D47]">VIEW (Read Only)</SelectItem>
                            <SelectItem value="edit" className="hover:bg-[#1E2D47]">EDIT (Create & Edit)</SelectItem>
                            <SelectItem value="admin" className="hover:bg-[#1E2D47]">ADMIN (Full Access)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ========================================== */}
        {/* TAB 2: Categories Management */}
        {/* ========================================== */}
        <TabsContent value="categories">
          <div className="grid gap-6 md:grid-cols-3">
            {/* List existing Categories */}
            <Card className="border-[#1E2D47] bg-[#0F1629] p-6 text-white md:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Knowledge Categories</h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Current folders in the Knowledge Base module.
                  </p>
                </div>
                {isAdmin && (
                  <Button
                    onClick={handleSeedDefaultCategories}
                    variant="outline"
                    size="sm"
                    className="border-[#1E2D47] bg-[#07090F] text-xs font-semibold text-[#0EA5E9] hover:bg-[#0EA5E9] hover:text-white flex items-center gap-1.5 px-3 py-1.5 h-auto transition-all"
                  >
                    Seed Defaults
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3.5 rounded-lg bg-[#07090F] border border-[#1E2D47] transition-all hover:border-[#1E2D47] hover:bg-[#07090F]/80"
                  >
                    <div className="flex items-center gap-3">
                      {/* Color dot */}
                      <span
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div>
                        <p className="font-semibold text-white text-sm">{cat.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">slug: {cat.slug}</p>
                      </div>
                    </div>

                    {isAdmin && (
                      <Button
                        onClick={() => handleDeleteCategory(cat.id)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Create Category Panel */}
            <Card className="border-[#1E2D47] bg-[#0F1629] p-6 text-white h-fit">
              <h2 className="text-lg font-bold text-white mb-1">Create Category</h2>
              <p className="text-xs text-[#94A3B8] mb-6">Add a new folder to the collection.</p>

              {!isAdmin ? (
                <div className="p-4 rounded bg-[#EF4444]/10 border border-[#EF4444]/20 text-xs text-[#EF4444] flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Only administrators can create categories.</span>
                </div>
              ) : (
                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cat-name-input" className="text-xs font-semibold text-slate-300">Category Name</Label>
                    <Input
                      id="cat-name-input"
                      placeholder="e.g. Developer Guides"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="border-[#1E2D47] bg-[#07090F] text-white focus:ring-[#0EA5E9]"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">Category Tag Color</Label>
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {PALETTE_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setNewCatColor(c.hex)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-md border text-[9px] font-semibold transition-all ${
                            newCatColor === c.hex
                              ? "border-[#0EA5E9] bg-[#0EA5E9]/10 text-white"
                              : "border-[#1E2D47] bg-[#07090F] text-slate-400 hover:border-slate-500"
                          }`}
                        >
                          <span
                            className="h-3 w-3 rounded-full border border-black/20"
                            style={{ backgroundColor: c.hex }}
                          />
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isCreatingCat || !newCatName.trim()}
                    className="w-full bg-[#0EA5E9] hover:bg-[#0284C7] text-white flex items-center justify-center gap-1.5 font-medium mt-4"
                  >
                    <Plus className="h-4 w-4" />
                    {isCreatingCat ? "Adding..." : "Add Category"}
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* ========================================== */}
        {/* TAB 3: Appearance Settings */}
        {/* ========================================== */}
        <TabsContent value="appearance">
          <Card className="border-[#1E2D47] bg-[#0F1629] p-6 text-white">
            <h2 className="text-lg font-bold text-white mb-1">Brand Style & Layout</h2>
            <p className="text-xs text-[#94A3B8] mb-6">
              Revti Workspace color configurations and font weights.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-300">Workspace Palette Tokens</h3>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="flex items-center gap-2 text-xs p-2 rounded border border-[#1E2D47] bg-[#07090F]">
                      <span className="h-4 w-4 rounded bg-[#07090F] border border-[#1E2D47]" />
                      <div>
                        <p className="font-semibold text-white">BG Color</p>
                        <p className="text-[9px] text-[#94A3B8]">#07090F</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs p-2 rounded border border-[#1E2D47] bg-[#0F1629]">
                      <span className="h-4 w-4 rounded bg-[#0F1629] border border-[#1E2D47]" />
                      <div>
                        <p className="font-semibold text-white">Card BG</p>
                        <p className="text-[9px] text-[#94A3B8]">#0F1629</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs p-2 rounded border border-[#1E2D47] bg-[#1E2D47]">
                      <span className="h-4 w-4 rounded bg-[#1E2D47] border border-[#1E2D47]" />
                      <div>
                        <p className="font-semibold text-white">Borders</p>
                        <p className="text-[9px] text-[#94A3B8]">#1E2D47</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs p-2 rounded border border-[#1E2D47]">
                      <span className="h-4 w-4 rounded bg-[#0EA5E9]" />
                      <div>
                        <p className="font-semibold text-white">Accent</p>
                        <p className="text-[9px] text-[#94A3B8]">#0EA5E9</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-300">Typography Setup</h3>
                  <div className="space-y-2 mt-3 text-xs text-slate-400">
                    <p>
                      Primary Font: <span className="font-semibold text-white font-sans">Geist (Geist Sans)</span>
                    </p>
                    <p>
                      Secondary Font: <span className="font-semibold text-white font-sans">Inter</span>
                    </p>
                    <p>
                      Code Font: <span className="font-semibold text-white font-mono">Geist Mono</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Theme preview */}
              <div className="border border-[#1E2D47] rounded-lg p-5 bg-[#07090F]/60 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">SaaS Preview</h4>
                <Card className="border-[#1E2D47] bg-[#0F1629] p-4 text-white shadow-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-[#0EA5E9] font-bold tracking-widest bg-[#0EA5E9]/10 px-2 py-0.5 rounded border border-[#0EA5E9]/30">PREVIEW</span>
                    <span className="text-[9px] text-slate-500">Just now</span>
                  </div>
                  <h5 className="text-sm font-bold">Premium SaaS Design System</h5>
                  <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                    Theme inherits dark properties dynamically. The palette feels similar to Linear and Vercel.
                  </p>
                  <Button size="sm" className="bg-[#0EA5E9] text-white hover:bg-[#0284C7] w-full text-xs font-medium mt-1">
                    Sample Click Button
                  </Button>
                </Card>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ========================================== */}
        {/* TAB 4: Credentials Vault */}
        {/* ========================================== */}
        <TabsContent value="credentials">
          <div className="flex flex-col gap-6">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-[#0EA5E9]" />
                  Credentials Vault
                </h2>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Stored account credentials, tokens, and access details. Visible to all team members.
                </p>
              </div>
              {isAdmin && (
                <Button
                  onClick={() => setShowCredForm((v) => !v)}
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
                      onClick={() => setShowCredForm(false)}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
