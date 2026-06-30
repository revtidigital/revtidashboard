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

const avgProgress = (tasks: PMTask[]) =>
  tasks.length ? Math.round(tasks.reduce((s, t) => s + (t.progress || 0), 0) / tasks.length) : 0;
const wsProgress = (w: WorkstreamWithTasks) => avgProgress(w.tasks);
const projectProgress = (p: PMProjectDetail) => avgProgress(p.workstreams.flatMap((w) => w.tasks));

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
        <div className="mt-3 flex max-w-md items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#1E2D47]">
            <div className="h-full rounded-full bg-[#0EA5E9] transition-all" style={{ width: `${projectProgress(project)}%` }} />
          </div>
          <span className="text-xs font-semibold text-white">{projectProgress(project)}%</span>
        </div>
      </div>

      <TodayFocus project={project} />

      <GanttChart project={project} />

      <Workstreams project={project} isAuthorized={isAuthorized} reload={load} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Today focus — what's starting / ending / running right now          */
/* ------------------------------------------------------------------ */
type FocusItem = { ws: WorkstreamWithTasks; task: PMTask };

function TodayFocus({ project }: { project: PMProjectDetail }) {
  const buckets = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    const startingToday: FocusItem[] = [];
    const dueToday: FocusItem[] = [];
    const overdue: FocusItem[] = [];
    const active: FocusItem[] = [];
    project.workstreams.forEach((ws) => {
      ws.tasks.forEach((task) => {
        const s = toDate(task.start_date)?.getTime() ?? null;
        const d = toDate(task.due_date)?.getTime() ?? null;
        const open = task.status !== "done";
        if (s === today) startingToday.push({ ws, task });
        if (d === today) dueToday.push({ ws, task });
        if (open && d !== null && d < today) overdue.push({ ws, task });
        if (open && s !== null && s < today && (d === null || d >= today) && s !== today)
          active.push({ ws, task });
      });
    });
    return { startingToday, dueToday, overdue, active };
  }, [project]);

  const cols: { key: string; label: string; tint: string; items: FocusItem[] }[] = [
    { key: "start", label: "Starting today", tint: "#0EA5E9", items: buckets.startingToday },
    { key: "due", label: "Due today", tint: "#F59E0B", items: buckets.dueToday },
    { key: "overdue", label: "Overdue", tint: "#EF4444", items: buckets.overdue },
    { key: "active", label: "In progress now", tint: "#10B981", items: buckets.active },
  ];

  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });
  const total = cols.reduce((n, c) => n + c.items.length, 0);

  return (
    <Card className="border-[#1E2D47] bg-[#0F1629] p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E2D47] px-5 py-3">
        <h2 className="text-sm font-semibold text-white">Today&apos;s focus</h2>
        <span className="text-[11px] text-[#64748B]">{todayLabel}</span>
      </div>
      {total === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-[#64748B]">
          Nothing starts, ends or runs today across any workstream. 🎉
        </div>
      ) : (
        <div className="grid gap-px bg-[#1E2D47]/40 sm:grid-cols-2 xl:grid-cols-4">
          {cols.map((c) => (
            <div key={c.key} className="bg-[#0F1629] p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.tint }} />
                <span className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{c.label}</span>
                <span className="ml-auto rounded-full bg-[#1E2D47] px-1.5 text-[11px] text-[#94A3B8]">{c.items.length}</span>
              </div>
              {c.items.length === 0 ? (
                <p className="text-[11px] text-[#475569]">—</p>
              ) : (
                <ul className="space-y-2">
                  {c.items.map(({ ws, task }) => (
                    <li key={task.id} className="rounded-md border border-[#1E2D47]/60 bg-[#0B1120]/50 px-2.5 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: ws.color }} />
                        <span className="truncate text-[11px] text-[#64748B]">{ws.name}</span>
                      </div>
                      <p className="mt-1 truncate text-[13px] font-medium text-white">{task.title}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-[#94A3B8]">
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${STATUS_META[task.status].cls}`}>
                          {STATUS_META[task.status].label}
                        </span>
                        {task.assignee && <span>@{task.assignee}</span>}
                        <span className="ml-auto">{fmt(task.start_date)} → {fmt(task.due_date)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Gantt timeline                                                      */
/* ------------------------------------------------------------------ */
/* Fixed scale: every label, gridline and bar is positioned on the SAME
   pixel track, so nothing can drift out of alignment regardless of how
   many weeks the project spans. */
const WEEK_W = 64;           // px per week column (default "week" zoom)
const LABEL_W = 224;         // px for the sticky name column
const ROW_H = 34;            // px per task row

function GridBg({ lines, todayX }: { lines: number[]; todayX: number | null }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {lines.map((l, i) => (
        <div key={i} className="absolute inset-y-0 border-l border-[#1E2D47]/30" style={{ left: l }} />
      ))}
      {todayX !== null && (
        <div className="absolute inset-y-0 w-px bg-[#0EA5E9]/70" style={{ left: todayX }} />
      )}
    </div>
  );
}

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
    // start exactly on the earliest date (e.g. 1 Jul) — no week snap
    const snapStart = new Date(min);
    snapStart.setHours(0, 0, 0, 0);
    const start = snapStart.getTime();
    const weeks = Math.ceil((Math.ceil((max - start) / DAY) + 1) / 7);
    const end = start + weeks * 7 * DAY;
    return { start, end, weeks, totalDays: weeks * 7 };
  }, [project]);

  // zoom controls how many px each day occupies
  const [zoom, setZoom] = useState<"day" | "week" | "month">("week");
  const dayW = zoom === "day" ? 26 : zoom === "month" ? 3.4 : WEEK_W / 7;
  const trackW = range.totalDays * dayW;

  // ms -> px on the track
  const x = (ms: number) => ((ms - range.start) / DAY) * dayW;

  // month bands across the top
  const months = useMemo(() => {
    const out: { label: string; left: number; width: number }[] = [];
    const cur = new Date(range.start);
    cur.setDate(1); cur.setHours(0, 0, 0, 0);
    while (cur.getTime() < range.end) {
      const next = new Date(cur); next.setMonth(next.getMonth() + 1);
      const segStart = Math.max(cur.getTime(), range.start);
      const segEnd = Math.min(next.getTime(), range.end);
      out.push({
        label: cur.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        left: x(segStart),
        width: ((segEnd - segStart) / DAY) * dayW,
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return out;
  }, [range, dayW]);

  const todayMs = new Date().setHours(0, 0, 0, 0);
  const todayX = todayMs >= range.start && todayMs <= range.end ? x(todayMs) : null;

  const barGeo = (s: string | null, e: string | null) => {
    const sd = toDate(s)?.getTime();
    let ed = toDate(e)?.getTime();
    if (!sd && !ed) return null;
    const startMs = sd ?? ed!;
    ed = (ed ?? startMs) + DAY;            // inclusive end day
    const left = x(startMs);
    const width = Math.max(x(ed) - left, 6);
    return { left, width };
  };

  const hasAnyDates = project.workstreams.some(
    (w) => w.start_date || w.end_date || w.tasks.some((t) => t.start_date || t.due_date)
  );

  // weekly gridlines spanning the whole body, drawn once behind every row
  const weekLines = Array.from({ length: range.weeks + 1 }, (_, i) => i * 7 * dayW);

  // header date ticks adapt to the zoom level
  const ticks =
    zoom === "month"
      ? []
      : zoom === "day"
      ? Array.from({ length: range.totalDays }, (_, i) => ({
          left: i * dayW,
          width: dayW,
          label: String(new Date(range.start + i * DAY).getDate()),
        }))
      : Array.from({ length: range.weeks }, (_, i) => ({
          left: i * 7 * dayW,
          width: 7 * dayW,
          label: String(new Date(range.start + i * 7 * DAY).getDate()),
        }));

  return (
    <Card className="border-[#1E2D47] bg-[#0F1629] p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E2D47] px-5 py-3">
        <h2 className="text-sm font-semibold text-white">Timeline</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
            {(["not_started", "in_progress", "blocked", "done"] as PMStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_META[s].dot }} />
                {STATUS_META[s].label}
              </span>
            ))}
          </div>
          <div className="flex items-center rounded-md border border-[#1E2D47] p-0.5">
            {(["day", "week", "month"] as const).map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`rounded px-2.5 py-1 text-[11px] font-medium capitalize transition ${
                  zoom === z ? "bg-[#0EA5E9] text-white" : "text-[#94A3B8] hover:text-white"
                }`}
              >
                {z}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!hasAnyDates ? (
        <div className="px-5 py-10 text-center text-sm text-[#64748B]">
          Add start &amp; due dates to workstreams and tasks to see the Gantt timeline.
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* one shared grid: label column (sticky) + fixed-width track */}
          <div style={{ width: LABEL_W + trackW }}>
            {/* ---- header: month band + week dates ---- */}
            <div className="flex border-b border-[#1E2D47]">
              <div
                className="sticky left-0 z-[1] shrink-0 self-stretch border-r border-[#1E2D47] bg-[#0F1629] px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-[#64748B]"
                style={{ width: LABEL_W }}
              >
                Workstream / Task
              </div>
              <div className="relative" style={{ width: trackW, height: 44 }}>
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-5 truncate border-l border-[#1E2D47]/60 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]"
                    style={{ left: m.left, width: m.width }}
                  >
                    {m.width > 30 ? m.label : ""}
                  </div>
                ))}
                {ticks.map((t, i) => (
                  <div
                    key={i}
                    className="absolute bottom-0 h-6 overflow-hidden border-l border-[#1E2D47]/40 px-1 pt-1 text-[10px] text-[#64748B]"
                    style={{ left: t.left, width: t.width }}
                  >
                    {t.width > 14 ? t.label : ""}
                  </div>
                ))}
              </div>
            </div>

            {/* ---- body ---- */}
            {project.workstreams.map((w, wi) => {
              const wsBar = barGeo(w.start_date, w.end_date);
              const rowBg = wi % 2 ? "#0B1120" : "#0F1629";
              return (
                <div key={w.id} style={{ backgroundColor: rowBg }}>
                  {/* workstream summary row */}
                  <div className="flex items-stretch border-b border-[#1E2D47]/50">
                    <div
                      className="sticky left-0 z-[1] flex shrink-0 items-center gap-2 border-r border-[#1E2D47] px-4"
                      style={{ width: LABEL_W, backgroundColor: rowBg }}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: w.color }} />
                      <span className="flex-1 truncate text-[13px] font-semibold text-white">{w.name}</span>
                      <span className="shrink-0 text-[11px] font-medium tabular-nums text-[#94A3B8]">{wsProgress(w)}%</span>
                    </div>
                    <div className="relative" style={{ width: trackW, height: ROW_H + 4 }}>
                      <GridBg lines={weekLines} todayX={todayX} />
                      {wsBar && (
                        <div
                          className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full"
                          style={{ left: wsBar.left, width: wsBar.width, backgroundColor: w.color, opacity: 0.9 }}
                          title={`${fmt(w.start_date)} → ${fmt(w.end_date)}`}
                        />
                      )}
                    </div>
                  </div>
                  {/* task rows */}
                  {w.tasks.map((t) => {
                    const tBar = barGeo(t.start_date, t.due_date);
                    const meta = STATUS_META[t.status];
                    return (
                      <div key={t.id} className="flex items-stretch border-b border-[#1E2D47]/20">
                        <div
                          className="sticky left-0 z-[1] flex shrink-0 items-center gap-2 border-r border-[#1E2D47] py-1.5 pl-9 pr-3"
                          style={{ width: LABEL_W, backgroundColor: rowBg }}
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.dot }} />
                          <span className="truncate text-xs text-[#94A3B8]">{t.title}</span>
                        </div>
                        <div className="relative" style={{ width: trackW, height: ROW_H }}>
                          <GridBg lines={weekLines} todayX={todayX} />
                          {tBar && (
                            <div
                              className="group absolute top-1/2 flex h-4 -translate-y-1/2 items-center overflow-hidden rounded-md bg-[#1E2D47]"
                              style={{ left: tBar.left, width: tBar.width }}
                              title={`${t.title}: ${fmt(t.start_date)} → ${fmt(t.due_date)} (${t.progress}%)`}
                            >
                              <div className="h-full rounded-md" style={{ width: `${t.progress}%`, backgroundColor: meta.dot }} />
                              {tBar.width > 46 && (
                                <span className="pointer-events-none absolute inset-0 flex items-center px-1.5 text-[10px] font-medium text-white/90">
                                  {t.progress}%
                                </span>
                              )}
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
                  <SelectTrigger className="h-7 w-[130px] text-xs"><SelectValue>{(v: PMStatus) => STATUS_META[v]?.label ?? v}</SelectValue></SelectTrigger>
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
                      <SelectTrigger><SelectValue>{(v: PMStatus) => STATUS_META[v]?.label ?? v}</SelectValue></SelectTrigger>
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
