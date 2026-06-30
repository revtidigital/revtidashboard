"use client";

import React, { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  X,
  Layers,
  Calendar,
  Users,
  ChevronDown,
  ChevronRight,
  GanttChartSquare,
} from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/lib/context/user-context";
import {
  getWorkspaceService,
  PMProjectDetail,
  WorkstreamWithTasks,
  PMTask,
  PMStatus,
} from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const WS_COLORS = ["#0EA5E9", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#14B8A6", "#6366F1"];

const STATUS_META: Record<PMStatus, { label: string; cls: string; dot: string }> = {
  not_started: { label: "Not started", cls: "bg-slate-500/15 text-slate-400 border border-slate-500/30", dot: "#64748B" },
  in_progress: { label: "In progress", cls: "bg-sky-500/15 text-sky-400 border border-sky-500/30", dot: "#0EA5E9" },
  blocked: { label: "Blocked", cls: "bg-red-500/15 text-red-400 border border-red-500/30", dot: "#EF4444" },
  done: { label: "Done", cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30", dot: "#10B981" },
};

const DAY = 86400000;
const toDate = (s: string | null) => (s ? new Date(s + "T00:00:00") : null);
const fmt = (d: string | null) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short" }) : "—";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <LayoutShell>
      <ProjectDetailContent id={id} />
    </LayoutShell>
  );
}

function ProjectDetailContent({ id }: { id: string }) {
  const { user } = useUser();
  const [project, setProject] = useState<PMProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthorized = user?.role === "admin" || user?.role === "edit";

  const load = async () => {
    try {
      const data = await getWorkspaceService().getPMProjectDetail(id);
      setProject(data);
    } catch (err) {
      console.error("Failed to load project:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user, id]);

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-[#94A3B8]">Loading roadmap…</div>;
  }
  if (!project) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-white">Project not found.</p>
        <Link href="/projects" className="mt-3 inline-block text-sm text-[#0EA5E9]">← Back to projects</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All projects
      </Link>

      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
          <GanttChartSquare className="h-7 w-7 text-[#0EA5E9]" />
          {project.name}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#94A3B8]">
          {project.client && <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{project.client}</span>}
          <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{fmt(project.start_date)} → {fmt(project.end_date)}</span>
        </div>
        {project.description && <p className="mt-2 max-w-2xl text-sm text-[#64748B]">{project.description}</p>}
      </div>

      <GanttChart project={project} />

      <Workstreams project={project} isAuthorized={isAuthorized} reload={load} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gantt timeline                                                      */
/* ------------------------------------------------------------------ */
function GanttChart({ project }: { project: PMProjectDetail }) {
  const range = useMemo(() => {
    const dates: number[] = [];
    const push = (s: string | null) => { const d = toDate(s); if (d) dates.push(d.getTime()); };
    push(project.start_date);
    push(project.end_date);
    project.workstreams.forEach((w) => {
      push(w.start_date); push(w.end_date);
      w.tasks.forEach((t) => { push(t.start_date); push(t.due_date); });
    });
    const fallback = toDate(project.start_date)?.getTime() ?? new Date().setHours(0, 0, 0, 0);
    const min = dates.length ? Math.min(...dates) : fallback;
    let max = dates.length ? Math.max(...dates) : min + 56 * DAY;
    if (max <= min) max = min + 14 * DAY;
    // snap to week (Monday) boundaries for clean columns
    const snapStart = new Date(min);
    const dow = (snapStart.getDay() + 6) % 7; // 0 = Monday
    snapStart.setDate(snapStart.getDate() - dow);
    snapStart.setHours(0, 0, 0, 0);
    const start = snapStart.getTime();
    const totalDays = Math.ceil((max - start) / DAY) + 1;
    const weeks = Math.ceil(totalDays / 7);
    const span = weeks * 7 * DAY;
    return { start, span, weeks };
  }, [project]);

  const weekCols = Array.from({ length: range.weeks }, (_, i) => new Date(range.start + i * 7 * DAY));

  const todayMs = new Date().setHours(0, 0, 0, 0);
  const todayLeft =
    todayMs >= range.start && todayMs <= range.start + range.span
      ? ((todayMs - range.start) / range.span) * 100
      : null;

  const barGeometry = (s: string | null, e: string | null) => {
    const sd = toDate(s)?.getTime();
    let ed = toDate(e)?.getTime();
    if (!sd && !ed) return null;
    const startMs = sd ?? ed!;
    ed = ed ?? startMs + DAY;
    const rawLeft = ((startMs - range.start) / range.span) * 100;
    const left = Math.max(rawLeft, 0);
    const rawWidth = ((ed - startMs + DAY) / range.span) * 100;
    const width = Math.max(Math.min(rawWidth, 100 - left), 1.5);
    return { left: `${left}%`, width: `${width}%` };
  };

  // Vertical week gridlines + today marker, rendered behind the bars
  const TimelineGrid = () => (
    <div className="pointer-events-none absolute inset-0">
      {weekCols.map((_, i) => (
        <div
          key={i}
          className="absolute inset-y-0 border-l border-[#1E2D47]/40"
          style={{ left: `${(i / range.weeks) * 100}%` }}
        />
      ))}
      {todayLeft !== null && (
        <div
          className="absolute inset-y-0 w-px bg-[#0EA5E9]/60"
          style={{ left: `${todayLeft}%` }}
        />
      )}
    </div>
  );

  const hasAnyDates = project.workstreams.some(
    (w) => w.start_date || w.end_date || w.tasks.some((t) => t.start_date || t.due_date)
  );

  return (
    <Card className="border-[#1E2D47] bg-[#0F1629] p-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#1E2D47] px-5 py-3">
        <h2 className="text-sm font-semibold text-white">Timeline</h2>
        <span className="text-[11px] text-[#64748B]">Parallel workstreams overlap on the same weeks</span>
      </div>

      {!hasAnyDates ? (
        <div className="px-5 py-10 text-center text-sm text-[#64748B]">
          Add start &amp; due dates to workstreams and tasks to see the Gantt timeline.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            {/* week header */}
            <div className="flex border-b border-[#1E2D47]">
              <div className="w-52 shrink-0 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
                Workstream / Task
              </div>
              <div className="relative flex flex-1">
                {weekCols.map((d, i) => (
                  <div
                    key={i}
                    className="flex-1 border-l border-[#1E2D47]/60 px-2 py-2 text-[10px] text-[#64748B]"
                    style={{ minWidth: 56 }}
                  >
                    {d.toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                  </div>
                ))}
              </div>
            </div>

            {/* rows */}
            {project.workstreams.map((w) => {
              const wsBar = barGeometry(w.start_date, w.end_date);
              return (
                <div key={w.id}>
                  {/* workstream row */}
                  <div className="flex items-center border-b border-[#1E2D47]/40 bg-[#0B1120]/40">
                    <div className="w-52 shrink-0 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: w.color }} />
                        <span className="truncate text-sm font-semibold text-white">{w.name}</span>
                      </div>
                    </div>
                    <div className="relative h-9 flex-1">
                      <TimelineGrid />
                      {wsBar && (
                        <div
                          className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full"
                          style={{ ...wsBar, backgroundColor: w.color, opacity: 0.85 }}
                          title={`${fmt(w.start_date)} → ${fmt(w.end_date)}`}
                        />
                      )}
                    </div>
                  </div>
                  {/* task rows */}
                  {w.tasks.map((t) => {
                    const tBar = barGeometry(t.start_date, t.due_date);
                    return (
                      <div key={t.id} className="flex items-center border-b border-[#1E2D47]/20">
                        <div className="w-52 shrink-0 py-2 pl-9 pr-4">
                          <span className="truncate text-xs text-[#94A3B8]">{t.title}</span>
                        </div>
                        <div className="relative h-8 flex-1">
                          <TimelineGrid />
                          {tBar && (
                            <div
                              className="absolute top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-full bg-[#1E2D47]"
                              style={tBar}
                              title={`${t.title}: ${fmt(t.start_date)} → ${fmt(t.due_date)} (${t.progress}%)`}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${t.progress}%`, backgroundColor: STATUS_META[t.status].dot }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Workstreams + tasks management                                      */
/* ------------------------------------------------------------------ */
function Workstreams({ project, isAuthorized, reload }: { project: PMProjectDetail; isAuthorized: boolean; reload: () => Promise<void> }) {
  const [showWsForm, setShowWsForm] = useState(false);
  const [wsName, setWsName] = useState("");
  const [wsDesc, setWsDesc] = useState("");
  const [wsColor, setWsColor] = useState(WS_COLORS[0]);
  const [wsStart, setWsStart] = useState("");
  const [wsEnd, setWsEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const addWorkstream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim()) return;
    setSaving(true);
    try {
      await getWorkspaceService().createWorkstream({
        project_id: project.id,
        name: wsName.trim(),
        description: wsDesc.trim() || null,
        color: wsColor,
        sequence: project.workstreams.length,
        start_date: wsStart || null,
        end_date: wsEnd || null,
      });
      setWsName(""); setWsDesc(""); setWsStart(""); setWsEnd(""); setWsColor(WS_COLORS[0]); setShowWsForm(false);
      await reload();
    } catch (err) {
      console.error(err);
      alert("Could not add workstream.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Layers className="h-5 w-5 text-[#0EA5E9]" /> Workstreams
        </h2>
        {isAuthorized && (
          <Button size="sm" onClick={() => setShowWsForm((v) => !v)} className="gap-1.5">
            {showWsForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showWsForm ? "Cancel" : "Add Workstream"}
          </Button>
        )}
      </div>

      {showWsForm && isAuthorized && (
        <Card className="border-[#1E2D47] bg-[#0F1629] p-5">
          <form onSubmit={addWorkstream} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Workstream Name *</Label>
                <Input value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder="e.g. Payments Integration" required />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {WS_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setWsColor(c)}
                      className={`h-6 w-6 rounded-full transition-transform ${wsColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#0F1629] scale-110" : ""}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={wsDesc} onChange={(e) => setWsDesc(e.target.value)} rows={2} placeholder="What this workstream covers…" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={wsStart} onChange={(e) => setWsStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={wsEnd} onChange={(e) => setWsEnd(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add Workstream"}</Button>
            </div>
          </form>
        </Card>
      )}

      {project.workstreams.length === 0 ? (
        <Card className="border-dashed border-[#1E2D47] bg-[#0F1629]/40 py-12 text-center">
          <Layers className="mx-auto h-9 w-9 text-[#334155]" />
          <p className="mt-3 text-sm font-medium text-white">No workstreams yet</p>
          <p className="mt-1 text-xs text-[#94A3B8]">Add workstreams — run them in parallel by giving overlapping dates.</p>
        </Card>
      ) : (
        project.workstreams.map((w) => (
          <WorkstreamCard key={w.id} workstream={w} projectId={project.id} isAuthorized={isAuthorized} reload={reload} />
        ))
      )}
    </div>
  );
}

function WorkstreamCard({ workstream, projectId, isAuthorized, reload }: { workstream: WorkstreamWithTasks; projectId: string; isAuthorized: boolean; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [status, setStatus] = useState<PMStatus>("not_started");
  const [start, setStart] = useState("");
  const [due, setDue] = useState("");
  const [progress, setProgress] = useState("0");
  const [saving, setSaving] = useState(false);

  const done = workstream.tasks.filter((t) => t.status === "done").length;

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await getWorkspaceService().createPMTask({
        workstream_id: workstream.id,
        project_id: projectId,
        title: title.trim(),
        description: null,
        status,
        assignee: assignee.trim() || null,
        start_date: start || null,
        due_date: due || null,
        progress: Math.max(0, Math.min(100, parseInt(progress || "0", 10))),
        sequence: workstream.tasks.length,
      });
      setTitle(""); setAssignee(""); setStart(""); setDue(""); setProgress("0"); setStatus("not_started"); setShowTaskForm(false);
      await reload();
    } catch (err) {
      console.error(err);
      alert("Could not add task.");
    } finally {
      setSaving(false);
    }
  };

  const updateTask = async (task: PMTask, data: Partial<PMTask>) => {
    try {
      await getWorkspaceService().updatePMTask(task.id, data);
      await reload();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    await getWorkspaceService().deletePMTask(taskId);
    await reload();
  };

  const deleteWorkstream = async () => {
    if (!confirm("Delete this workstream and all its tasks?")) return;
    await getWorkspaceService().deleteWorkstream(workstream.id);
    await reload();
  };

  return (
    <Card className="border-[#1E2D47] bg-[#0F1629] p-0 overflow-hidden">
      <div className="flex items-center gap-3 border-l-4 px-4 py-3" style={{ borderColor: workstream.color }}>
        <button onClick={() => setOpen((v) => !v)} className="text-[#94A3B8] hover:text-white">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-white">{workstream.name}</p>
          <p className="text-[11px] text-[#64748B]">
            {fmt(workstream.start_date)} → {fmt(workstream.end_date)} · {done}/{workstream.tasks.length} done
          </p>
        </div>
        {isAuthorized && (
          <button onClick={deleteWorkstream} className="text-[#475569] hover:text-red-400" title="Delete workstream">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="border-t border-[#1E2D47] px-4 py-3 space-y-2">
          {workstream.tasks.length === 0 && !showTaskForm && (
            <p className="py-2 text-center text-xs text-[#64748B]">No tasks yet.</p>
          )}

          {workstream.tasks.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-md border border-[#1E2D47]/60 bg-[#0B1120]/40 px-3 py-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: STATUS_META[t.status].dot }} />
              <span className="flex-1 min-w-[120px] text-sm text-white">{t.title}</span>
              {t.assignee && <span className="text-[11px] text-[#94A3B8]">@{t.assignee}</span>}
              <span className="text-[11px] text-[#64748B]">{fmt(t.start_date)} → {fmt(t.due_date)}</span>
              {isAuthorized ? (
                <Select value={t.status} onValueChange={(v) => updateTask(t, { status: v as PMStatus, progress: v === "done" ? 100 : t.progress })}>
                  <SelectTrigger className="h-7 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_META) as PMStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${STATUS_META[t.status].cls}`}>{STATUS_META[t.status].label}</span>
              )}
              <span className="w-10 text-right text-[11px] text-[#94A3B8]">{t.progress}%</span>
              {isAuthorized && (
                <button onClick={() => deleteTask(t.id)} className="text-[#475569] hover:text-red-400" title="Delete task">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

          {isAuthorized && (
            showTaskForm ? (
              <form onSubmit={addTask} className="space-y-3 rounded-md border border-[#1E2D47] bg-[#0B1120]/60 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Task Title *</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Veritrans MDK setup" required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Assignee</Label>
                    <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Name" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Start</Label>
                    <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Due</Label>
                    <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as PMStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_META) as PMStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Progress %</Label>
                    <Input type="number" min={0} max={100} value={progress} onChange={(e) => setProgress(e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowTaskForm(false)}>Cancel</Button>
                  <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Add Task"}</Button>
                </div>
              </form>
            ) : (
              <button onClick={() => setShowTaskForm(true)} className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-[#1E2D47] py-2 text-xs text-[#94A3B8] hover:border-[#0EA5E9]/50 hover:text-white">
                <Plus className="h-3.5 w-3.5" /> Add Task
              </button>
            )
          )}
        </div>
      )}
    </Card>
  );
}
