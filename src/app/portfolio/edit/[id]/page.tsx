"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Compass,
  Save,
  ArrowLeft,
  PlusCircle,
  Trash2,
  TrendingUp,
  User,
  Quote,
} from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/lib/context/user-context";
import {
  getWorkspaceService,
  Project,
  ProjectStat,
  ProjectFeedback,
} from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CAT_LABELS: Record<string, string> = {
  web: "Web Dev",
  mobile: "Mobile App",
  brand: "Branding",
};

interface EditProjectPageProps {
  params: Promise<{ id: string }>;
}

export default function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = use(params);
  return (
    <LayoutShell>
      <Suspense fallback={<EditProjectLoading />}>
        <EditProjectContent id={id} />
      </Suspense>
    </LayoutShell>
  );
}

function EditProjectLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="h-9 w-9 rounded-full bg-[#0F1629] animate-pulse" />
        <div className="h-8 w-64 rounded bg-[#0F1629] animate-pulse" />
      </div>
      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-3 h-96 rounded bg-[#0F1629] animate-pulse" />
        <div className="h-96 rounded bg-[#0F1629] animate-pulse" />
      </div>
    </div>
  );
}

function EditProjectContent({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useUser();
  const isAuthorized = user?.role === "admin" || user?.role === "edit";
  const isNew = id === "new";

  // Form State
  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [cat, setCat] = useState("web");
  const [year, setYear] = useState("");
  const [tagline, setTagline] = useState("");
  const [headline, setHeadline] = useState("");
  const [desc, setDesc] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [thumb, setThumb] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [galleryInput, setGalleryInput] = useState("");
  const [stats, setStats] = useState<ProjectStat[]>([]);
  const [feedbacks, setFeedbacks] = useState<ProjectFeedback[]>([]);
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [sequence, setSequence] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    if (!isAuthorized) {
      router.push("/portfolio");
      return;
    }

    async function loadProjectData() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const service = getWorkspaceService();
        const allProjects = await service.getProjects();

        if (isNew) {
          // Default sequence to next available sequence
          const maxSeq = allProjects.length > 0
            ? Math.max(...allProjects.map((p) => p.sequence || 0))
            : 0;
          setSequence(String(maxSeq + 1));
          setYear(new Date().getFullYear().toString());
        } else {
          const found = allProjects.find((p) => String(p.id) === String(id));
          if (!found) {
            alert("Project not found");
            router.push("/portfolio");
            return;
          }
          setProject(found);
          setTitle(found.title || "");
          setClient(found.client || "");
          setCat(found.cat || "web");
          setYear(found.year || "");
          setTagline(found.tagline || "");
          setHeadline(found.headline || "");
          setDesc(found.desc || "");
          setShortDesc(found.shortDesc || "");
          setThumb(found.thumb || "");
          setTagsInput(found.tags ? found.tags.join(", ") : "");
          setGalleryInput(found.gallery ? found.gallery.join("\n") : "");
          setStats(found.stats || []);
          setFeedbacks(found.feedback || []);
          setStatus(found.status || "published");
          setSequence(found.sequence !== undefined ? String(found.sequence) : "");
        }
      } catch (err) {
        console.error("Failed to load project details:", err);
        setErrorMsg("Failed to load project details.");
      } finally {
        setIsLoading(false);
      }
    }

    loadProjectData();
  }, [id, isNew, user, isAuthorized, router]);

  // Form Field Handlers
  const handleAddStat = () => {
    setStats([...stats, { num: "", label: "" }]);
  };

  const handleUpdateStat = (index: number, key: keyof ProjectStat, value: string) => {
    const newStats = [...stats];
    newStats[index][key] = value;
    setStats(newStats);
  };

  const handleRemoveStat = (index: number) => {
    setStats(stats.filter((_, i) => i !== index));
  };

  const handleAddFeedback = () => {
    setFeedbacks([...feedbacks, { name: "", role: "", text: "" }]);
  };

  const handleUpdateFeedback = (index: number, key: keyof ProjectFeedback, value: string) => {
    const newFeedbacks = [...feedbacks];
    newFeedbacks[index][key] = value;
    setFeedbacks(newFeedbacks);
  };

  const handleRemoveFeedback = (index: number) => {
    setFeedbacks(feedbacks.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) return;
    setErrorMsg(null);

    // Validation
    if (
      !title.trim() ||
      !client.trim() ||
      !year.trim() ||
      !shortDesc.trim() ||
      !desc.trim() ||
      !thumb.trim()
    ) {
      setErrorMsg("Please fill in all required fields (Title, Client, Year, Short Desc, Long Desc, and Thumbnail URL).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSaving(true);

    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const parsedGallery = galleryInput
      .split("\n")
      .map((url) => url.trim())
      .filter(Boolean);

    const sanitizedStats = stats.filter((s) => s.num.trim() || s.label.trim());
    const sanitizedFeedbacks = feedbacks.filter((f) => f.name.trim() || f.text.trim());

    // Sequence parsing
    let parsedSequence: number | undefined = undefined;
    if (sequence.trim()) {
      const seqInt = parseInt(sequence.trim(), 10);
      if (isNaN(seqInt) || seqInt <= 0) {
        setErrorMsg("Sequence must be a positive integer.");
        setIsSaving(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      parsedSequence = seqInt;
    }

    const projectData = {
      title: title.trim(),
      client: client.trim(),
      cat,
      year: year.trim(),
      tagline: tagline.trim(),
      headline: headline.trim(),
      desc: desc.trim(),
      shortDesc: shortDesc.trim(),
      thumb: thumb.trim(),
      tags: parsedTags,
      gallery: parsedGallery,
      stats: sanitizedStats,
      feedback: sanitizedFeedbacks,
      status: status,
      sequence: parsedSequence,
    };

    try {
      const service = getWorkspaceService();
      if (isNew) {
        await service.createProject(projectData);
        await service.logActivity("created", null, `created a new portfolio project: ${title}`);
      } else {
        await service.updateProject(id, projectData);
        await service.logActivity("updated", null, `updated the portfolio project: ${title}`);
      }
      router.push("/portfolio");
      router.refresh();
    } catch (err: any) {
      console.error("Failed to save project:", err);
      setErrorMsg(err.message || "An error occurred while saving the project.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <EditProjectLoading />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#1E2D47] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/portfolio">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white hover:bg-[#0F1629] cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Compass className="h-5 w-5 text-[#818CF8]" />
            {isNew ? "Add Portfolio Project" : `Edit Project: ${project?.title}`}
          </h1>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-md text-xs flex items-center gap-2">
          <span className="font-semibold">Error:</span> {errorMsg}
        </div>
      )}

      {/* Main Form Layout */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Basic Information */}
          <Card className="border-[#1E2D47] bg-[#0F1629] p-6 space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#1E2D47] pb-3">
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold text-slate-300">
                  Project Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. MERIDIAN"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-[#1E2D47] bg-[#07090F] text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select value={cat} onValueChange={(val) => setCat(val || "web")}>
                  <SelectTrigger className="border-[#1E2D47] bg-[#07090F] text-white">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white">
                    {Object.entries(CAT_LABELS).map(([val, label]) => (
                      <SelectItem
                        key={val}
                        value={val}
                        className="hover:bg-[#1E2D47] focus:bg-[#1E2D47]"
                      >
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  Year <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. 2025"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="border-[#1E2D47] bg-[#07090F] text-white font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold text-slate-300">
                  Client Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Meridian Goods"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="border-[#1E2D47] bg-[#07090F] text-white"
                  required
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold text-slate-300">
                  Thumbnail Image URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="https://images.unsplash.com/... or /images/..."
                  value={thumb}
                  onChange={(e) => setThumb(e.target.value)}
                  className="border-[#1E2D47] bg-[#07090F] text-white text-xs font-mono"
                  required
                />
              </div>
            </div>
          </Card>

          {/* Section 2: Narrative Content */}
          <Card className="border-[#1E2D47] bg-[#0F1629] p-6 space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#1E2D47] pb-3">
              Narrative Content
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Tagline</Label>
                <Input
                  placeholder="One sentence tagline. Use \\n for page break"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="border-[#1E2D47] bg-[#07090F] text-white text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Headline</Label>
                <Input
                  placeholder="Uppercase grid headline. Use \\n for breaks"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="border-[#1E2D47] bg-[#07090F] text-white text-xs uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  Short Description <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. A headless e-commerce platform built with Next.js."
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  className="border-[#1E2D47] bg-[#07090F] text-white text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  Long Description / Case Study Text <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  placeholder="Detailed project summary, challenges, process, and tech..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="border-[#1E2D47] bg-[#07090F] text-white text-xs min-h-[150px] leading-relaxed"
                  rows={6}
                  required
                />
              </div>
            </div>
          </Card>

          {/* Section 3: Metadata & Assets */}
          <Card className="border-[#1E2D47] bg-[#0F1629] p-6 space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#1E2D47] pb-3">
              Tags & Gallery
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Tags (Comma-separated)</Label>
                <Input
                  placeholder="Next.js, Sanity CMS, Stripe"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="border-[#1E2D47] bg-[#07090F] text-white text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Gallery Image URLs (one per line)</Label>
                <Textarea
                  placeholder="https://images.unsplash.com/photo-1...&#10;https://images.unsplash.com/photo-2..."
                  value={galleryInput}
                  onChange={(e) => setGalleryInput(e.target.value)}
                  className="border-[#1E2D47] bg-[#07090F] text-white text-xs font-mono min-h-[100px]"
                  rows={4}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Settings Card */}
          <Card className="border-[#1E2D47] bg-[#0F1629] p-6 space-y-6 text-white">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#1E2D47] pb-3">
              Publishing Settings
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300">Publishing Status</Label>
                <Select
                  value={status}
                  onValueChange={(val) => setStatus(val as "draft" | "published")}
                >
                  <SelectTrigger className="border-[#1E2D47] bg-[#07090F] text-white w-full">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white">
                    <SelectItem value="draft" className="hover:bg-[#1E2D47] focus:bg-[#1E2D47]">
                      Draft
                    </SelectItem>
                    <SelectItem value="published" className="hover:bg-[#1E2D47] focus:bg-[#1E2D47]">
                      Published
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400">
                  Draft projects are kept hidden from the public website but remain editable.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300">Display Sequence</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1"
                  value={sequence}
                  onChange={(e) => setSequence(e.target.value)}
                  className="border-[#1E2D47] bg-[#07090F] text-white font-mono"
                  min="1"
                />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Enter a number (e.g. 1, 2, 3...) to order the projects.
                  If another project is already at this position, it and all subsequent projects will automatically shift down.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold flex items-center justify-center gap-2 w-full transition-colors cursor-pointer"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Project"}
              </Button>
              <Link href="/portfolio" className="w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#1E2D47] text-slate-400 hover:bg-[#1E2D47] hover:text-white w-full cursor-pointer"
                >
                  Cancel
                </Button>
              </Link>
            </div>
          </Card>

          {/* Stats Card */}
          <Card className="border-[#1E2D47] bg-[#0F1629] p-6 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-[#1E2D47] pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Key Results
              </h2>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddStat}
                size="sm"
                className="border-[#1E2D47] bg-[#141B2D] text-slate-300 hover:text-white hover:bg-[#1E2D47] h-7 text-[10px] flex items-center gap-1 cursor-pointer"
              >
                Add Result
              </Button>
            </div>

            {stats.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No stats added yet.</p>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {stats.map((stat, index) => (
                  <div key={index} className="flex items-center gap-2 bg-[#07090F]/50 p-2 rounded border border-[#1E2D47]/40">
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <Input
                        placeholder="Value (e.g. 3.8x)"
                        value={stat.num}
                        onChange={(e) => handleUpdateStat(index, "num", e.target.value)}
                        className="border-[#1E2D47] bg-[#07090F] text-white text-[11px] h-8 font-mono"
                      />
                      <Input
                        placeholder="Label"
                        value={stat.label}
                        onChange={(e) => handleUpdateStat(index, "label", e.target.value)}
                        className="border-[#1E2D47] bg-[#07090F] text-white text-[11px] h-8"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveStat(index)}
                      className="p-1 rounded hover:bg-[#1E2D47] text-slate-400 hover:text-red-400 transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Feedbacks Card */}
          <Card className="border-[#1E2D47] bg-[#0F1629] p-6 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-[#1E2D47] pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                <User className="h-4 w-4 text-[#38BDF8]" />
                Testimonials
              </h2>
              <Button
                type="button"
                variant="outline"
                onClick={handleAddFeedback}
                size="sm"
                className="border-[#1E2D47] bg-[#141B2D] text-slate-300 hover:text-white hover:bg-[#1E2D47] h-7 text-[10px] flex items-center gap-1 cursor-pointer"
              >
                Add Quote
              </Button>
            </div>

            {feedbacks.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No testimonials added yet.</p>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {feedbacks.map((f, index) => (
                  <div key={index} className="space-y-2 bg-[#07090F]/50 p-3 rounded border border-[#1E2D47]/40 relative">
                    <div className="space-y-1">
                      <Label className="text-[9px] text-slate-400">Author Name</Label>
                      <Input
                        placeholder="Name"
                        value={f.name}
                        onChange={(e) => handleUpdateFeedback(index, "name", e.target.value)}
                        className="border-[#1E2D47] bg-[#07090F] text-white text-[11px] h-7"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] text-slate-400">Role / Company</Label>
                      <Input
                        placeholder="CEO"
                        value={f.role}
                        onChange={(e) => handleUpdateFeedback(index, "role", e.target.value)}
                        className="border-[#1E2D47] bg-[#07090F] text-white text-[11px] h-7"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] text-slate-400">Quote</Label>
                      <Textarea
                        placeholder="Quote text..."
                        value={f.text}
                        onChange={(e) => handleUpdateFeedback(index, "text", e.target.value)}
                        className="border-[#1E2D47] bg-[#07090F] text-white text-[11px] min-h-[50px]"
                        rows={2}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeedback(index)}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-[#1E2D47] text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </form>
    </div>
  );
}
