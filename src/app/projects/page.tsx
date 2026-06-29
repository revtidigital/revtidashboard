"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  GanttChartSquare,
  Plus,
  Trash2,
  Calendar,
  Users,
  ArrowRight,
  X,
  Layers,
} from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/lib/context/user-context";
import { getWorkspaceService, PMProject } from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_META: Record<PMProject["status"], { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  on_hold: { label: "On Hold", cls: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
  completed: { label: "Completed", cls: "bg-sky-500/15 text-sky-400 border border-sky-500/30" },
  archived: { label: "Archived", cls: "bg-slate-500/15 text-slate-400 border border-slate-500/30" },
};

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function ProjectsPage() {
  return (
    <LayoutShell>
      <ProjectsContent />
    </LayoutShell>
  );
}

function ProjectsContent() {
  const { user } = useUser();
  const [projects, setProjects] = useState<PMProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<PMProject["status"]>("active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const isAuthorized = user?.role === "admin" || user?.role === "edit";

  const load = async () => {
    try {
      const data = await getWorkspaceService().getPMProjects();
      setProjects(data);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const resetForm = () => {
    setName("");
    setClient("");
    setDescription("");
    setStatus("active");
    setStartDate("");
    setEndDate("");
    setShowForm(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized || !name.trim()) return;
    setIsSaving(true);
    try {
      await getWorkspaceService().createPMProject({
        name: name.trim(),
        client: client.trim() || null,
        description: description.trim() || null,
        status,
        start_date: startDate || null,
        end_date: endDate || null,
      });
      resetForm();
      await load();
    } catch (err) {
      console.error("Failed to create project:", err);
      alert("Could not create project.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAuthorized) return;
    if (!confirm("Delete this project and all its workstreams & tasks?")) return;
    try {
      await getWorkspaceService().deletePMProject(id);
      await load();
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <GanttChartSquare className="h-7 w-7 text-[#0EA5E9]" />
            Project Management
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Track clients, workstreams and task timelines on a Gantt roadmap.
          </p>
        </div>
        {isAuthorized && (
          <Button onClick={() => setShowForm((v) => !v)} className="gap-2">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "New Project"}
          </Button>
        )}
      </div>

      {/* Create form */}
      {showForm && isAuthorized && (
        <Card className="border-[#1E2D47] bg-[#0F1629] p-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Project Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sparklebox" required />
              </div>
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Sparcrew Inc." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary of the engagement…" rows={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as PMProject["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : "Create Project"}</Button>
            </div>
          </form>
        </Card>
      )}

      {/* List */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-[#94A3B8]">Loading projects…</div>
      ) : projects.length === 0 ? (
        <Card className="border-dashed border-[#1E2D47] bg-[#0F1629]/40 py-16 text-center">
          <Layers className="mx-auto h-10 w-10 text-[#334155]" />
          <p className="mt-3 text-sm font-medium text-white">No projects yet</p>
          <p className="mt-1 text-xs text-[#94A3B8]">Create your first project to start building its roadmap.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const meta = STATUS_META[p.status];
            return (
              <Card key={p.id} className="group relative flex flex-col border-[#1E2D47] bg-[#0F1629] p-5 transition-colors hover:border-[#0EA5E9]/50">
                <div className="flex items-start justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${meta.cls}`}>{meta.label}</span>
                  {isAuthorized && (
                    <button onClick={() => handleDelete(p.id)} className="text-[#475569] opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100" title="Delete project">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Link href={`/projects/${p.id}`} className="mt-3 flex-1">
                  <h3 className="text-lg font-semibold text-white group-hover:text-[#0EA5E9]">{p.name}</h3>
                  {p.client && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#94A3B8]"><Users className="h-3.5 w-3.5" />{p.client}</p>
                  )}
                  {p.description && <p className="mt-2 line-clamp-2 text-sm text-[#64748B]">{p.description}</p>}
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-[#64748B]">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(p.start_date)} → {formatDate(p.end_date)}
                  </p>
                </Link>
                <Link href={`/projects/${p.id}`} className="mt-4 flex items-center gap-1 text-xs font-medium text-[#0EA5E9] hover:gap-2 transition-all">
                  Open roadmap <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
