"use client";

import React, { useState, useEffect } from "react";
import {
  Users as UsersIcon,
  FolderOpen,
  Palette,
  Shield,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/lib/context/user-context";
import {
  getWorkspaceService,
  User,
  Category,
  UserRole,
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
  { name: "Purple", hex: "#7C5CFC" },
  { name: "Indigo", hex: "#6366F1" },
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
  const [isLoading, setIsLoading] = useState(true);

  // New Category Form
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#7C5CFC");
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  const loadSettingsData = async () => {
    try {
      const service = getWorkspaceService();
      const all = await service.getUsers();
      const cats = await service.getCategories();
      setUsers(all);
      setCategories(cats);
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
      setNewCatColor("#7C5CFC");
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
        { name: "SOPs", color: "#7C5CFC" },
        { name: "Documentation", color: "#6366F1" },
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
        <div className="h-10 w-48 rounded bg-[#151A2D] animate-pulse" />
        <div className="h-12 w-full rounded bg-[#151A2D] animate-pulse" />
        <div className="h-80 rounded bg-[#151A2D] animate-pulse" />
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
        <TabsList className="bg-[#151A2D] border border-[#252B45] text-slate-400 p-1 mb-6">
          <TabsTrigger
            value="users"
            className="data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white flex items-center gap-1.5 px-4"
          >
            <UsersIcon className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white flex items-center gap-1.5 px-4"
          >
            <FolderOpen className="h-4 w-4" />
            Categories Management
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className="data-[state=active]:bg-[#7C5CFC] data-[state=active]:text-white flex items-center gap-1.5 px-4"
          >
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* ========================================== */}
        {/* TAB 1: User Management */}
        {/* ========================================== */}
        <TabsContent value="users">
          <Card className="border-[#252B45] bg-[#151A2D] p-6 text-white">
            <div className="flex items-center justify-between border-b border-[#252B45] pb-4 mb-6">
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

            <div className="overflow-x-auto rounded-lg border border-[#252B45]">
              <Table>
                <TableHeader className="bg-[#0B1020]">
                  <TableRow className="border-[#252B45] hover:bg-transparent">
                    <TableHead className="text-[#94A3B8] font-bold">User</TableHead>
                    <TableHead className="text-[#94A3B8] font-bold">Email</TableHead>
                    <TableHead className="text-[#94A3B8] font-bold">Permission Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="border-[#252B45] hover:bg-[#252B45]/20">
                      <TableCell className="font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7C5CFC]/15 text-[#7C5CFC] text-xs font-bold">
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
                          <SelectTrigger className="w-[180px] border-[#252B45] bg-[#0B1020] text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-[#252B45] bg-[#151A2D] text-white">
                            <SelectItem value="view" className="hover:bg-[#252B45]">VIEW (Read Only)</SelectItem>
                            <SelectItem value="edit" className="hover:bg-[#252B45]">EDIT (Create & Edit)</SelectItem>
                            <SelectItem value="admin" className="hover:bg-[#252B45]">ADMIN (Full Access)</SelectItem>
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
            <Card className="border-[#252B45] bg-[#151A2D] p-6 text-white md:col-span-2">
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
                    className="border-[#252B45] bg-[#0B1020] text-xs font-semibold text-[#7C5CFC] hover:bg-[#7C5CFC] hover:text-white flex items-center gap-1.5 px-3 py-1.5 h-auto transition-all"
                  >
                    Seed Defaults
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3.5 rounded-lg bg-[#0B1020] border border-[#252B45] transition-all hover:border-[#252B45] hover:bg-[#0B1020]/80"
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
            <Card className="border-[#252B45] bg-[#151A2D] p-6 text-white h-fit">
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
                      className="border-[#252B45] bg-[#0B1020] text-white focus:ring-[#7C5CFC]"
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
                              ? "border-[#7C5CFC] bg-[#7C5CFC]/10 text-white"
                              : "border-[#252B45] bg-[#0B1020] text-slate-400 hover:border-slate-500"
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
                    className="w-full bg-[#7C5CFC] hover:bg-[#6847ea] text-white flex items-center justify-center gap-1.5 font-medium mt-4"
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
          <Card className="border-[#252B45] bg-[#151A2D] p-6 text-white">
            <h2 className="text-lg font-bold text-white mb-1">Brand Style & Layout</h2>
            <p className="text-xs text-[#94A3B8] mb-6">
              Revti Workspace color configurations and font weights.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-300">Workspace Palette Tokens</h3>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="flex items-center gap-2 text-xs p-2 rounded border border-[#252B45] bg-[#0B1020]">
                      <span className="h-4 w-4 rounded bg-[#0B1020] border border-[#252B45]" />
                      <div>
                        <p className="font-semibold text-white">BG Color</p>
                        <p className="text-[9px] text-[#94A3B8]">#0B1020</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs p-2 rounded border border-[#252B45] bg-[#151A2D]">
                      <span className="h-4 w-4 rounded bg-[#151A2D] border border-[#252B45]" />
                      <div>
                        <p className="font-semibold text-white">Card BG</p>
                        <p className="text-[9px] text-[#94A3B8]">#151A2D</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs p-2 rounded border border-[#252B45] bg-[#252B45]">
                      <span className="h-4 w-4 rounded bg-[#252B45] border border-[#252B45]" />
                      <div>
                        <p className="font-semibold text-white">Borders</p>
                        <p className="text-[9px] text-[#94A3B8]">#252B45</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs p-2 rounded border border-[#252B45]">
                      <span className="h-4 w-4 rounded bg-[#7C5CFC]" />
                      <div>
                        <p className="font-semibold text-white">Accent</p>
                        <p className="text-[9px] text-[#94A3B8]">#7C5CFC</p>
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
              <div className="border border-[#252B45] rounded-lg p-5 bg-[#0B1020]/60 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">SaaS Preview</h4>
                <Card className="border-[#252B45] bg-[#151A2D] p-4 text-white shadow-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-[#7C5CFC] font-bold tracking-widest bg-[#7C5CFC]/10 px-2 py-0.5 rounded border border-[#7C5CFC]/30">PREVIEW</span>
                    <span className="text-[9px] text-slate-500">Just now</span>
                  </div>
                  <h5 className="text-sm font-bold">Premium SaaS Design System</h5>
                  <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                    Theme inherits dark properties dynamically. The palette feels similar to Linear and Vercel.
                  </p>
                  <Button size="sm" className="bg-[#7C5CFC] text-white hover:bg-[#6847ea] w-full text-xs font-medium mt-1">
                    Sample Click Button
                  </Button>
                </Card>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
