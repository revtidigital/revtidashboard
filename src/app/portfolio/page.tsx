"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Compass,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  X,
  TrendingUp,
  User,
  Quote,
} from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/lib/context/user-context";
import {
  getWorkspaceService,
  Project,
  ProjectCategory,
} from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";

// Categories are now loaded dynamically from the database

export default function PortfolioPage() {
  return (
    <LayoutShell>
      <Suspense fallback={<PortfolioLoading />}>
        <PortfolioContent />
      </Suspense>
    </LayoutShell>
  );
}

function PortfolioLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded bg-[#0F1629] animate-pulse" />
        <div className="h-4 w-96 rounded bg-[#0F1629] animate-pulse" />
      </div>
      <div className="h-96 rounded bg-[#0F1629] animate-pulse" />
    </div>
  );
}

function PortfolioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const isAuthorized = user?.role === "admin" || user?.role === "edit";

  const landingPageUrl = process.env.NEXT_PUBLIC_LANDING_PAGE_URL || "http://localhost:3000";

  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getCategoryName = (slug: string) => {
    const found = categories.find((c) => c.slug === slug);
    return found ? found.name : slug;
  };

  

  const getCategoryStyles = (slug: string) => {
    switch (slug) {
      case "web":
        return "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
      case "mobile":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "brand":
        return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      default:
        return "text-sky-400 bg-sky-500/10 border-sky-500/20";
    }
  };

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // View Modal State
  const [viewProject, setViewProject] = useState<Project | null>(null);

  // Load projects and categories
  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const service = getWorkspaceService();
      const [projectsData, categoriesData] = await Promise.all([
        service.getProjects(),
        service.getProjectCategories()
      ]);
      setProjects(projectsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error("Failed to load portfolio data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  // Handle URL Query Params for View/Edit
  useEffect(() => {
    if (projects.length === 0) return;

    const projectId = searchParams.get("id");
    const isEdit = searchParams.get("edit") === "true";

    if (projectId) {
      const project = projects.find((p) => String(p.id) === String(projectId));
      if (project) {
        if (isEdit && isAuthorized) {
          router.push(`/portfolio/edit/${projectId}`);
        } else {
          setViewProject(project);
          router.replace("/portfolio");
        }
      }
    }
  }, [projects, searchParams, isAuthorized, router]);

  const handleDelete = async (project: Project) => {
    if (!isAuthorized) return;
    if (!confirm(`Are you sure you want to permanently delete the project "${project.title}"?`)) return;

    try {
      const service = getWorkspaceService();
      await service.deleteProject(project.id);
      await service.logActivity("deleted", null, `deleted the portfolio project: ${project.title}`);
      await loadProjects();
    } catch (err) {
      console.error("Failed to delete project:", err);
      alert("Failed to delete project. Please try again.");
    }
  };

  // Filtering Logic
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === "all" || p.cat === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl flex items-center gap-3">
            <Compass className="h-8 w-8 text-[#818CF8]" />
            Portfolio Projects
          </h1>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Manage project case studies displayed on the Axiom landing page. Changes trigger revalidation.
          </p>
        </div>
        {isAuthorized && (
          <Button
            onClick={() => router.push("/portfolio/edit/new")}
            className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-medium flex items-center gap-2 self-start sm:self-auto transition-all duration-200 shadow-md shadow-sky-500/10 animate-in fade-in zoom-in duration-300 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card className="border-[#1E2D47] bg-[#0F1629] p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <Input
            placeholder="Search by project name, client, tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#1E2D47] bg-[#07090F] text-white placeholder-slate-500 focus:border-[#0EA5E9] w-full"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Label className="text-xs font-semibold text-[#94A3B8] whitespace-nowrap hidden sm:inline">
            Category Filter:
          </Label>
          <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || "all")}>
            <SelectTrigger className="w-full sm:w-[180px] border-[#1E2D47] bg-[#07090F] text-white">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white">
              <SelectItem value="all" className="hover:bg-[#1E2D47] focus:bg-[#1E2D47]">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.slug} value={c.slug} className="hover:bg-[#1E2D47] focus:bg-[#1E2D47]">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Main Table Card */}
      <Card className="border-[#1E2D47] bg-[#0F1629] overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-sm text-[#94A3B8]">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent text-[#0EA5E9] mb-2" />
            <p>Loading projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-20 text-center text-sm text-[#94A3B8]">
            <Compass className="h-12 w-12 mx-auto opacity-20 mb-3" />
            <p className="font-semibold text-slate-300">No projects found</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting your search filters or add a new project.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="border-b border-[#1E2D47] bg-[#0A0E1A]">
              <TableRow className="border-[#1E2D47] hover:bg-transparent">
                <TableHead className="text-[#94A3B8] font-semibold pl-6 w-[280px]">Project</TableHead>
                <TableHead className="text-[#94A3B8] font-semibold">Category</TableHead>
                <TableHead className="text-[#94A3B8] font-semibold">Client</TableHead>
                <TableHead className="text-[#94A3B8] font-semibold">Year</TableHead>
                <TableHead className="text-[#94A3B8] font-semibold">Sequence</TableHead>
                <TableHead className="text-[#94A3B8] font-semibold">Status</TableHead>
                <TableHead className="text-[#94A3B8] font-semibold hidden md:table-cell">Tags</TableHead>
                <TableHead className="text-[#94A3B8] font-semibold text-right pr-6 w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow
                  key={project.id}
                  className="border-b border-[#1E2D47] hover:bg-[#121A30]/50 transition-colors"
                >
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      {project.thumb ? (
                        <img
                          src={project.thumb}
                          alt={project.title}
                          className="h-10 w-16 rounded-md object-cover border border-[#1E2D47] shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-16 rounded-md bg-[#07090F] border border-[#1E2D47] flex items-center justify-center shrink-0">
                          <Compass className="h-5 w-5 text-slate-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-extrabold text-white truncate text-sm tracking-wide">
                          {project.title}
                        </p>
                        <p className="text-xs text-[#94A3B8] truncate leading-relaxed max-w-[160px]">
                          {project.shortDesc}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono font-medium ${getCategoryStyles(project.cat)}`}>
                      {getCategoryName(project.cat)}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-300 font-medium text-xs">{project.client}</TableCell>
                  <TableCell className="text-slate-400 font-mono text-xs">{project.year}</TableCell>
                  <TableCell className="text-slate-300 font-mono text-xs">
                    {project.sequence !== undefined ? project.sequence : "-"}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                      project.status === "draft"
                        ? "text-slate-400 bg-slate-500/10 border-slate-500/20"
                        : "text-[#0EA5E9] bg-[#0EA5E9]/10 border-[#0EA5E9]/20"
                    }`}>
                      {project.status === "draft" ? "Draft" : "Published"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {project.tags?.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded bg-[#1A253C] px-1.5 py-0.5 text-[10px] text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                      {project.tags?.length > 3 && (
                        <span className="inline-flex items-center rounded bg-[#1A253C] px-1.5 py-0.5 text-[10px] text-slate-400">
                          +{project.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => window.open(`${landingPageUrl}/?project=${project.id}`, '_blank')}
                        className="p-1.5 rounded hover:bg-[#1E2D47] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                        title="View Live details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {isAuthorized && (
                        <>
                          <button
                            onClick={() => router.push(`/portfolio/edit/${project.id}`)}
                            className="p-1.5 rounded hover:bg-[#1E2D47] text-[#94A3B8] hover:text-sky-400 transition-colors cursor-pointer"
                            title="Edit Project"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(project)}
                            className="p-1.5 rounded hover:bg-[#1E2D47] text-[#94A3B8] hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete Project"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* VIEW PROJECT DIALOG */}
      <Dialog open={!!viewProject} onOpenChange={(open) => !open && setViewProject(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto border-[#1E2D47] bg-[#0F1629] text-white p-0">
          {viewProject && (
            <div>
              {/* Modal Cover Image */}
              <div className="relative h-48 w-full bg-[#07090F]">
                {viewProject.thumb ? (
                  <img
                    src={viewProject.thumb}
                    alt={viewProject.title}
                    className="h-full w-full object-cover brightness-75"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Compass className="h-16 w-16 text-slate-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F1629] to-transparent" />
                <button
                  onClick={() => setViewProject(null)}
                  className="absolute top-4 right-4 rounded-full bg-black/40 p-1.5 text-slate-300 hover:text-white hover:bg-black/60 transition-colors cursor-pointer z-10"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-4 left-6 right-6">
                  {/* <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono font-medium mb-1.5 ${CAT_COLORS[viewProject.cat] || "text-slate-400 bg-slate-500/10 border-slate-500/20"}`}>
                    {CAT_LABELS[viewProject.cat] || viewProject.cat}
                  </span> */}


<span
  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono font-medium mb-1.5 ${getCategoryStyles(viewProject.cat)}`}
>
  {getCategoryName(viewProject.cat)}
</span>


                  <h2 className="text-2xl font-extrabold tracking-wide text-white">
                    {viewProject.title}
                  </h2>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Meta details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-[#1E2D47] pb-4 text-xs font-medium text-slate-400">
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Client</span>
                    <span className="text-slate-200 text-sm font-semibold">{viewProject.client}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Year</span>
                    <span className="text-slate-200 text-sm font-mono">{viewProject.year}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Sequence</span>
                    <span className="text-slate-200 text-sm font-mono">{viewProject.sequence !== undefined ? viewProject.sequence : "-"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Status</span>
                    <span className="text-slate-200 text-sm font-mono uppercase">{viewProject.status || "published"}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-4">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Tags / Tech Stack</span>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {viewProject.tags?.map((tag) => (
                        <span key={tag} className="bg-[#1E2D47] text-slate-300 px-2 py-0.5 rounded text-[10px]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Subheadings */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    {viewProject.tagline && (
                      <div className="border-l-2 border-[#818CF8] pl-3 italic text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                        "{viewProject.tagline}"
                      </div>
                    )}
                    {viewProject.headline && (
                      <h4 className="text-sm font-bold text-[#818CF8] uppercase tracking-wider whitespace-pre-line leading-snug">
                        {viewProject.headline}
                      </h4>
                    )}
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</h3>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                        {viewProject.desc}
                      </p>
                    </div>
                  </div>

                  {/* Stats list */}
                  <div className="space-y-4 bg-[#141B2D]/50 border border-[#1E2D47] p-4 rounded-xl">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                      Key Results
                    </h3>
                    {viewProject.stats && viewProject.stats.length > 0 ? (
                      <div className="space-y-3">
                        {viewProject.stats.map((stat, idx) => (
                          <div key={idx} className="border-b border-[#1E2D47] last:border-0 pb-2 last:pb-0">
                            <span className="block text-lg font-bold text-white font-mono leading-none">{stat.num}</span>
                            <span className="text-[10px] text-slate-400">{stat.label}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No stats added for this project.</p>
                    )}
                  </div>
                </div>

                {/* Feedbacks / Testimonials */}
                {viewProject.feedback && viewProject.feedback.length > 0 && (
                  <div className="space-y-3 border-t border-[#1E2D47] pt-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-[#38BDF8]" />
                      Client Feedback
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {viewProject.feedback.map((f, idx) => (
                        <div key={idx} className="bg-[#141B2D]/40 border border-[#1E2D47] p-3.5 rounded-lg flex flex-col justify-between">
                          <p className="text-xs text-slate-300 italic relative leading-relaxed">
                            <Quote className="h-3 w-3 text-sky-500/20 absolute -top-1 -left-2 rotate-180" />
                            {f.text}
                          </p>
                          <div className="mt-3 pt-2.5 border-t border-[#1E2D47]/40">
                            <span className="block text-[11px] font-bold text-white leading-none">{f.name}</span>
                            <span className="text-[9px] text-[#94A3B8]">{f.role}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gallery Grid */}
                {viewProject.gallery && viewProject.gallery.length > 0 && (
                  <div className="space-y-3 border-t border-[#1E2D47] pt-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Project Gallery</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {viewProject.gallery.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`${viewProject.title} Gallery ${idx + 1}`}
                          className="h-20 w-full object-cover rounded-md border border-[#1E2D47] hover:scale-105 transition-transform duration-200 cursor-pointer"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <DialogFooter className="bg-[#0A0E1A]/40 border-t border-[#1E2D47] px-6 py-4">
                <Button
                  onClick={() => setViewProject(null)}
                  className="bg-[#1E2D47] hover:bg-[#2A3754] text-slate-200 select-none cursor-pointer"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
