"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  CheckCircle,
  FileEdit,
  Archive,
  Users,
  Plus,
  ArrowRight,
  Clock,
  Eye,
  UserCheck,
  Calendar,
  Compass,
  Trash2,
  Edit,
} from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/lib/context/user-context";
import {
  getWorkspaceService,
  DashboardStats,
  ActivityLog,
  DocumentWithRelations,
  Project,
} from "@/lib/services/api";
import { formatRelativeTime } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <LayoutShell>
      <DashboardContent />
    </LayoutShell>
  );
}

const CAT_LABELS: Record<string, string> = {
  web: "Web Dev",
  mobile: "Mobile App",
  brand: "Branding",
};

function DashboardContent() {
  const router = useRouter();
  const { user } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [assignedDocs, setAssignedDocs] = useState<DocumentWithRelations[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const service = getWorkspaceService();
        const dashboardStats = await service.getDashboardStats();
        const logs = await service.getActivityLogs();
        const docs = await service.getDocuments();
        const projectsData = await service.getProjects();

        setStats(dashboardStats);
        setActivities(logs.slice(0, 5)); // Show top 5 recent activities
        setProjects(projectsData);

        // Find documents assigned to current user
        const userAssigned: DocumentWithRelations[] = [];
        for (const doc of docs) {
          const assigns = await service.getDocumentAssignments(doc.id);
          const isAssigned = assigns.some((a) => a.assigned_to === user?.id);
          if (isAssigned) {
            userAssigned.push(doc);
          }
        }
        setAssignedDocs(userAssigned);
      } catch (err) {
        console.error("Error loading dashboard details:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  const handleDeleteProject = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete the project "${title}"?`)) return;
    try {
      const service = getWorkspaceService();
      await service.deleteProject(id);
      
      // Update local state
      setProjects((prev) => prev.filter((p) => String(p.id) !== String(id)));
      
      // Log activity
      await service.logActivity("deleted", null, `deleted the portfolio project: ${title}`);
    } catch (err) {
      console.error("Failed to delete project:", err);
      alert("Failed to delete project. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-[#0F1629] animate-pulse" />
          <div className="h-4 w-96 rounded bg-[#0F1629] animate-pulse" />
        </div>
        
        {/* Stats Grid Skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded bg-[#0F1629] animate-pulse" />
          ))}
        </div>

        {/* Content Columns Skeleton */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="h-80 rounded bg-[#0F1629] animate-pulse" />
          <div className="h-80 rounded bg-[#0F1629] animate-pulse" />
          <div className="h-80 rounded bg-[#0F1629] animate-pulse" />
        </div>
      </div>
    );
  }

  // Define the dashboard card data mapping
  const statCards = [
    {
      title: "Total Documents",
      value: stats?.totalDocuments ?? 0,
      icon: FileText,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: "Published Documents",
      value: stats?.publishedDocuments ?? 0,
      icon: CheckCircle,
      color: "text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20",
    },
    {
      title: "Draft Documents",
      value: stats?.draftDocuments ?? 0,
      icon: FileEdit,
      color: "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20",
    },
    {
      title: "Archived Documents",
      value: stats?.archivedDocuments ?? 0,
      icon: Archive,
      color: "text-slate-400 bg-slate-500/10 border-slate-500/20",
    },
    {
      title: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "text-[#0EA5E9] bg-[#0EA5E9]/10 border-[#0EA5E9]/20",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-[#94A3B8]">
          Welcome back, <span className="font-semibold text-white">{user?.full_name}</span>. Here is the operational activity overview for Revti Digital.
        </p>
      </div>

      {/* Analytics stats row */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card
              key={index}
              className="relative overflow-hidden border-[#1E2D47] bg-[#0F1629] p-5 text-white transition-all duration-300 hover:-translate-y-1 hover:border-[#0EA5E9]/50 hover:shadow-[0_4px_20px_-2px_rgba(124,92,252,0.15)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                  {card.title}
                </p>
                <div className={`rounded-md border p-1.5 ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight">{card.value}</p>
            </Card>
          );
        })}
      </div>

      {/* Main dashboard columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Recent Activity Feed */}
        <Card className="border-[#1E2D47] bg-[#0F1629] p-6 text-white">
          <div className="flex items-center justify-between border-b border-[#1E2D47] pb-4">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#38BDF8]" />
              Recent Activity Feed
            </h2>
          </div>

          <div className="mt-6 flow-root">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#94A3B8]">
                No recent activity recorded.
              </div>
            ) : (
              <ul className="-mb-8">
                {activities.map((activity, logIdx) => (
                  <li key={activity.id}>
                    <div className="relative pb-8">
                      {logIdx !== activities.length - 1 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-[#1E2D47]"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#121E35] border border-[#1E2D47] text-slate-300">
                            {activity.action === "acknowledged" ? (
                              <UserCheck className="h-4 w-4 text-[#22C55E]" />
                            ) : activity.action === "created" ? (
                              <Plus className="h-4 w-4 text-[#0EA5E9]" />
                            ) : (
                              <FileText className="h-4 w-4 text-[#38BDF8]" />
                            )}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5 flex justify-between gap-4">
                          <p className="text-sm text-slate-200">
                            <span className="font-semibold text-white">
                              {activity.user?.full_name || "System"}
                            </span>{" "}
                            {activity.details}
                          </p>
                          <span className="text-xs text-[#94A3B8] whitespace-nowrap">
                            {formatRelativeTime(activity.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Center Column: Quick Actions & Personal Assignments */}
        <div className="flex flex-col gap-6">
          {/* Quick Actions Card */}
          <Card className="border-[#1E2D47] bg-[#0F1629] p-6 text-white">
            <h2 className="text-lg font-bold tracking-tight border-b border-[#1E2D47] pb-4">
              Quick Actions
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              {user?.role !== "view" && (
                <Link href="/knowledge-base/edit/new" className="w-full">
                  <Button
                    className="w-full justify-between bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-medium transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create Document
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <Link href="/knowledge-base" className="w-full">
                <Button
                  variant="outline"
                  className="w-full justify-between border-[#1E2D47] bg-[#0F1629]/40 text-slate-200 hover:bg-[#1E2D47] hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Open Knowledge Base
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* Assigned Documents */}
          <Card className="border-[#1E2D47] bg-[#0F1629] p-6 text-white">
            <h2 className="text-lg font-bold tracking-tight border-b border-[#1E2D47] pb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#0EA5E9]" />
              Assigned to You
            </h2>
            <div className="mt-4 space-y-3">
              {assignedDocs.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#94A3B8]">
                  No pending document assignments.
                </div>
              ) : (
                assignedDocs.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/knowledge-base/${doc.id}`}
                    className="group flex items-start justify-between p-2.5 rounded-md hover:bg-[#1E2D47]/50 border border-transparent hover:border-[#1E2D47] transition-all"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-sm font-semibold truncate group-hover:text-[#0EA5E9] transition-colors">
                        {doc.title}
                      </span>
                      {doc.category && (
                        <span className="text-[10px] mt-0.5 text-[#94A3B8]">
                          {doc.category.name}
                        </span>
                      )}
                    </div>
                    <Eye className="h-4 w-4 shrink-0 text-[#94A3B8] group-hover:text-white transition-colors self-center" />
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Portfolio Projects */}
        <Card className="border-[#1E2D47] bg-[#0F1629] p-6 text-white flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight border-b border-[#1E2D47] pb-4 flex items-center gap-2">
              <Compass className="h-5 w-5 text-[#818CF8]" />
              Portfolio Projects
            </h2>
            <div className="mt-4 space-y-4">
              {projects.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#94A3B8]">
                  No projects available.
                </div>
              ) : (
                projects.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/portfolio?id=${p.id}`)}
                    className="group block p-3 rounded-xl bg-[#141B2D]/50 border border-[#1E2D47] hover:border-[#818CF8]/50 hover:bg-[#141B2D] transition-all duration-300 cursor-pointer relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#8892A4] uppercase tracking-wider">
                        {p.client} • {p.year} • Seq: {p.sequence !== undefined ? p.sequence : "-"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border ${
                          p.status === "draft"
                            ? "text-slate-400 bg-slate-500/10 border-slate-500/20"
                            : "text-[#0EA5E9] bg-[#0EA5E9]/10 border-[#0EA5E9]/20"
                        }`}>
                          {p.status === "draft" ? "Draft" : "Pub"}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-[#818CF8] border border-indigo-500/20 font-mono">
                          {CAT_LABELS[p.cat] || p.cat}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-sm font-extrabold tracking-tight text-white mt-1 group-hover:text-[#818CF8] transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2 leading-relaxed">
                      {p.shortDesc}
                    </p>
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#818CF8] font-semibold">
                        <span>Preview Live Shell</span>
                        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                      </div>
                      {user?.role !== "view" && (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => router.push(`/portfolio/edit/${p.id}`)}
                            className="p-1 rounded hover:bg-[#1E2D47] text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Edit Project"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(p.id, p.title)}
                            className="p-1 rounded hover:bg-[#1E2D47] text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete Project"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#1E2D47]">
            <Link href="/portfolio" className="w-full">
              <Button
                variant="outline"
                className="w-full justify-between border-[#1E2D47] bg-[#0F1629]/40 text-slate-200 hover:bg-[#1E2D47] hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Compass className="h-4 w-4" />
                  Open Portfolio Dashboard
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
