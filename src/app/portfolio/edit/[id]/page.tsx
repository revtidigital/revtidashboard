"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, use, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Compass,
  Save,
  ArrowLeft,
  Trash2,
  Upload,
} from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/lib/context/user-context";
import {
  getWorkspaceService,
  Project,
  ProjectStat,
  ProjectFeedback,
  ProjectCategory,
  ProjectProcessStep,
  ProjectReelSection,
  ProjectSectionVisibility,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// CAT_LABELS removed in favor of dynamic categories

type SectionKey = keyof ProjectSectionVisibility;

const DEFAULT_SECTION_VISIBILITY: ProjectSectionVisibility = {
  overview: false,
  process: false,
  impact: false,
  gallery: false,
  reel: false,
  videoShowcase: false,
  testimonials: false,
  relatedProjects: false,
};

const makeDraftId = () => `section-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const hasText = (value?: string | null) => Boolean(value?.trim());
const meaningfulProcessSteps = (steps: ProjectProcessStep[]) => steps.filter((step) => hasText(step.phase) || hasText(step.title) || hasText(step.description));
const meaningfulStats = (items: ProjectStat[]) => items.filter((item) => hasText(item.num) || hasText(item.label) || hasText(item.before) || hasText(item.after));
const meaningfulFeedbacks = (items: ProjectFeedback[]) => items.filter((item) => hasText(item.name) || hasText(item.role) || hasText(item.text));
const withProcessIds = (steps: ProjectProcessStep[]) => steps.map((step) => ({ ...step, id: step.id || makeDraftId() }));

const normalizeVisibility = (project?: Project | null): ProjectSectionVisibility => {
  const visibility = project?.section_visibility;
  return {
    overview: typeof visibility?.overview === "boolean" ? visibility.overview : [project?.overview_title, project?.headline, project?.desc, project?.challenge, project?.approach, project?.impact, project?.compliance].some(hasText),
    process: typeof visibility?.process === "boolean" ? visibility.process : meaningfulProcessSteps(project?.process || []).length > 0,
    impact: typeof visibility?.impact === "boolean" ? visibility.impact : meaningfulStats(project?.stats || []).length > 0,
    gallery: typeof visibility?.gallery === "boolean" ? visibility.gallery : (project?.gallery || []).some(hasText),
    reel: typeof visibility?.reel === "boolean" ? visibility.reel : project?.reelSection?.enabled === true,
    videoShowcase: typeof visibility?.videoShowcase === "boolean" ? visibility.videoShowcase : Boolean(project?.video_type && project.video_type !== "none" && hasText(project.video_url)),
    testimonials: typeof visibility?.testimonials === "boolean" ? visibility.testimonials : meaningfulFeedbacks(project?.feedback || []).length > 0,
    relatedProjects: typeof visibility?.relatedProjects === "boolean" ? visibility.relatedProjects : false,
  };
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
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [stats, setStats] = useState<ProjectStat[]>([]);
  const [feedbacks, setFeedbacks] = useState<ProjectFeedback[]>([]);
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [sequence, setSequence] = useState("");
  const [industry, setIndustry] = useState("");
  const [sprint, setSprint] = useState("");
  const [clientLogo, setClientLogo] = useState("");
  const [overviewTitle, setOverviewTitle] = useState("");
  const [challenge, setChallenge] = useState("");
  const [approach, setApproach] = useState("");
  const [impact, setImpact] = useState("");
  const [compliance, setCompliance] = useState("");
  const [processSteps, setProcessSteps] = useState<ProjectProcessStep[]>([]);
  const [reelTitle, setReelTitle] = useState("");
  const [reelDescription, setReelDescription] = useState("");
  const [reelVideoUrl, setReelVideoUrl] = useState("");
  const [reelPosterUrl, setReelPosterUrl] = useState("");
  const [reelAutoplay, setReelAutoplay] = useState(false);
  const [reelMuted, setReelMuted] = useState(true);
  const [reelLoop, setReelLoop] = useState(true);
  const [sectionVisibility, setSectionVisibility] = useState<ProjectSectionVisibility>(DEFAULT_SECTION_VISIBILITY);

  const [activeDialog, setActiveDialog] = useState<SectionKey | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [overviewDraft, setOverviewDraft] = useState({ overviewTitle: "", desc: "", industry: "", sprint: "", challenge: "", approach: "", impact: "", compliance: "" });
  const [processDraft, setProcessDraft] = useState<ProjectProcessStep[]>([]);
  const [statsDraft, setStatsDraft] = useState<ProjectStat[]>([]);
  const [galleryDraft, setGalleryDraft] = useState<string[]>([]);
  const [reelDraft, setReelDraft] = useState<ProjectReelSection>({ enabled: false, autoplay: false, muted: true, loop: true });
  const [videoDraft, setVideoDraft] = useState({ videoType: "none", videoUrl: "" });
  const [feedbackDraft, setFeedbackDraft] = useState<ProjectFeedback[]>([]);

  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [isUploadingReelVideo, setIsUploadingReelVideo] = useState(false);
  const [isUploadingReelPoster, setIsUploadingReelPoster] = useState(false);

  const [videoType, setVideoType] = useState("none");
  const [videoUrl, setVideoUrl] = useState("");
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

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
        const [allProjects, categoriesData] = await Promise.all([
          service.getProjects(),
          service.getProjectCategories()
        ]);
        setCategories(categoriesData);

        if (isNew) {
          // Default sequence to next available sequence
          const maxSeq = allProjects.length > 0
            ? Math.max(...allProjects.map((p) => p.sequence || 0))
            : 0;
          setSequence(String(maxSeq + 1));
          setYear(new Date().getFullYear().toString());
          setSectionVisibility(DEFAULT_SECTION_VISIBILITY);
          if (categoriesData.length > 0) {
            setCat(categoriesData[0].slug);
          }
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
          setGalleryUrls(found.gallery ? found.gallery.filter(Boolean) : []);
          setStats(found.stats || []);
          setFeedbacks(found.feedback || []);
          setStatus(found.status || "published");
          setSequence(found.sequence !== undefined ? String(found.sequence) : "");
          setVideoType(found.video_type || "none");
          setVideoUrl(found.video_url || "");
          setIndustry(found.industry || "");
          setSprint(found.sprint || "");
          setClientLogo(found.client_logo || "");
          setOverviewTitle(found.overview_title || "");
          setChallenge(found.challenge || "");
          setApproach(found.approach || "");
          setImpact(found.impact || "");
          setCompliance(found.compliance || "");
          setProcessSteps(withProcessIds(found.process || []));
          setSectionVisibility(normalizeVisibility(found));
          const reel = found.reelSection;
          setReelTitle(reel?.title || "");
          setReelDescription(reel?.description || "");
          setReelVideoUrl(reel?.videoUrl || "");
          setReelPosterUrl(reel?.posterUrl || "");
          setReelAutoplay(reel?.autoplay ?? false);
          setReelMuted(reel?.muted ?? true);
          setReelLoop(reel?.loop ?? true);
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
  // Form Field Handlers
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setIsAddingCat(true);
    try {
      const service = getWorkspaceService();
      const newCat = await service.createProjectCategory(newCatName.trim());
      setCategories([...categories, newCat]);
      setCat(newCat.slug);
      setNewCatName("");
    } catch (err) {
      console.error("Failed to add category:", err);
      alert("Failed to add category. Make sure it doesn't already exist.");
    } finally {
      setIsAddingCat(false);
    }
  };

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingThumb(true);
    try {
      const service = getWorkspaceService();
      const publicUrl = await service.uploadProjectFile(file);
      setThumb(publicUrl);
    } catch (err) {
      console.error("Failed to upload thumbnail:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploadingThumb(false);
    }
  };

  const uploadGalleryFiles = async (files: FileList | null, onDone: (urls: string[]) => void) => {
    if (!files || files.length === 0) return;
    setIsUploadingGallery(true);
    try {
      const service = getWorkspaceService();
      const uploadPromises = Array.from(files).map(file => service.uploadProjectFile(file));
      const urls = await Promise.all(uploadPromises);
      onDone(urls);
    } catch (err) {
      console.error("Failed to upload gallery images:", err);
      alert("Failed to upload gallery images.");
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const isSupportedVideoFile = (file: File) => ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"].includes(file.type);

  const updateSectionVisibility = (key: SectionKey, enabled: boolean) => {
    setSectionVisibility((prev) => ({ ...prev, [key]: enabled }));
  };

  const openSectionDialog = (key: SectionKey) => {
    setDialogError(null);
    if (key === "overview") {
      setOverviewDraft({ overviewTitle, desc, industry, sprint, challenge, approach, impact, compliance });
    }
    if (key === "process") setProcessDraft(withProcessIds(processSteps));
    if (key === "impact") setStatsDraft(stats.map((item) => ({ ...item })));
    if (key === "gallery") setGalleryDraft([...galleryUrls]);
    if (key === "reel") setReelDraft({
      enabled: sectionVisibility.reel,
      title: reelTitle,
      description: reelDescription,
      videoUrl: reelVideoUrl,
      posterUrl: reelPosterUrl,
      autoplay: reelAutoplay,
      muted: reelMuted,
      loop: reelLoop,
    });
    if (key === "videoShowcase") setVideoDraft({ videoType, videoUrl });
    if (key === "testimonials") setFeedbackDraft(feedbacks.map((item) => ({ ...item })));
    setActiveDialog(key);
  };

  const closeSectionDialog = () => {
    setDialogError(null);
    setActiveDialog(null);
  };

  const handleSaveDialog = () => {
    setDialogError(null);
    if (activeDialog === "overview") {
      if (sectionVisibility.overview && ![overviewDraft.overviewTitle, overviewDraft.desc, overviewDraft.challenge, overviewDraft.approach, overviewDraft.impact, overviewDraft.compliance].some(hasText)) {
        setDialogError("Add at least one Overview field before showing this section.");
        return;
      }
      setOverviewTitle(overviewDraft.overviewTitle);
      setDesc(overviewDraft.desc);
      setIndustry(overviewDraft.industry);
      setSprint(overviewDraft.sprint);
      setChallenge(overviewDraft.challenge);
      setApproach(overviewDraft.approach);
      setImpact(overviewDraft.impact);
      setCompliance(overviewDraft.compliance);
    }
    if (activeDialog === "process") {
      const next = meaningfulProcessSteps(processDraft).map((step) => ({ ...step, id: step.id || makeDraftId() }));
      if (sectionVisibility.process && next.length === 0) {
        setDialogError("Add at least one meaningful process step before showing this section.");
        return;
      }
      setProcessSteps(next);
    }
    if (activeDialog === "impact") {
      const next = meaningfulStats(statsDraft);
      if (sectionVisibility.impact && next.length === 0) {
        setDialogError("Add at least one impact result before showing this section.");
        return;
      }
      setStats(next);
    }
    if (activeDialog === "gallery") {
      const next = galleryDraft.filter(Boolean);
      if (sectionVisibility.gallery && next.length === 0) {
        setDialogError("Add at least one gallery image before showing this section.");
        return;
      }
      setGalleryUrls(next);
    }
    if (activeDialog === "reel") {
      if (sectionVisibility.reel && !reelDraft.videoUrl?.trim()) {
        setDialogError("Add a reel video before showing this section.");
        return;
      }
      setReelTitle(reelDraft.title || "");
      setReelDescription(reelDraft.description || "");
      setReelVideoUrl(reelDraft.videoUrl || "");
      setReelPosterUrl(reelDraft.posterUrl || "");
      setReelAutoplay(reelDraft.autoplay ?? false);
      setReelMuted(reelDraft.autoplay ? true : (reelDraft.muted ?? true));
      setReelLoop(reelDraft.loop ?? true);
    }
    if (activeDialog === "videoShowcase") {
      if (sectionVisibility.videoShowcase && (!videoDraft.videoType || videoDraft.videoType === "none" || !videoDraft.videoUrl.trim())) {
        setDialogError("Select a provider and add a video URL before showing this section.");
        return;
      }
      setVideoType(videoDraft.videoType);
      setVideoUrl(videoDraft.videoUrl);
    }
    if (activeDialog === "testimonials") {
      const next = meaningfulFeedbacks(feedbackDraft);
      if (sectionVisibility.testimonials && next.length === 0) {
        setDialogError("Add at least one testimonial before showing this section.");
        return;
      }
      setFeedbacks(next);
    }
    closeSectionDialog();
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
      !thumb.trim()
    ) {
      setErrorMsg("Please fill in all required fields (Title, Client, Year, Short Desc, and Thumbnail URL).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (sectionVisibility.overview && ![overviewTitle, desc, challenge, approach, impact, compliance].some(hasText)) {
      setErrorMsg("Overview is enabled but has no meaningful content.");
      openSectionDialog("overview");
      return;
    }

    if (sectionVisibility.process && meaningfulProcessSteps(processSteps).length === 0) {
      setErrorMsg("Process is enabled but has no meaningful steps.");
      openSectionDialog("process");
      return;
    }

    if (sectionVisibility.impact && meaningfulStats(stats).length === 0) {
      setErrorMsg("Impact is enabled but has no meaningful results.");
      openSectionDialog("impact");
      return;
    }

    if (sectionVisibility.gallery && galleryUrls.filter(Boolean).length === 0) {
      setErrorMsg("Gallery is enabled but has no images.");
      openSectionDialog("gallery");
      return;
    }

    if (sectionVisibility.reel && !reelVideoUrl.trim()) {
      setErrorMsg("Project Reel requires a video URL or uploaded video when Show Reel Section is on.");
      openSectionDialog("reel");
      return;
    }

    if (sectionVisibility.videoShowcase && (!videoType || videoType === "none" || !videoUrl.trim())) {
      setErrorMsg("Video Showcase is enabled but has no usable video.");
      openSectionDialog("videoShowcase");
      return;
    }

    if (isUploadingThumb || isUploadingGallery || isUploadingVideo || isUploadingReelVideo || isUploadingReelPoster) {
      setErrorMsg("Please wait for all uploads to finish before saving.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSaving(true);

    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const parsedGallery = galleryUrls.filter(Boolean);

    const sanitizedStats = stats
      .map((s) => ({
        num: s.num.trim(),
        label: s.label.trim(),
        before: s.before?.trim(),
        after: s.after?.trim(),
      }))
      .filter((s) => s.num || s.label || s.before || s.after);
    const sanitizedProcess = processSteps
      .map((step) => ({
        phase: step.phase.trim(),
        title: step.title.trim(),
        description: step.description.trim(),
        icon: step.icon?.trim(),
      }))
      .filter((step) => step.phase || step.title || step.description);
    const sanitizedFeedbacks = feedbacks.filter((f) => f.name.trim() || f.text.trim());
    const normalizedSectionVisibility: ProjectSectionVisibility = { ...sectionVisibility, reel: sectionVisibility.reel };

    const sanitizedReelSection: ProjectReelSection = {
      enabled: normalizedSectionVisibility.reel,
      title: reelTitle.trim() || undefined,
      description: reelDescription.trim() || undefined,
      videoUrl: reelVideoUrl.trim() || undefined,
      posterUrl: reelPosterUrl.trim() || undefined,
      autoplay: reelAutoplay,
      muted: reelAutoplay ? true : reelMuted,
      loop: reelLoop,
    };

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
      video_type: videoType,
      video_url: videoUrl,
      industry: industry.trim(),
      sprint: sprint.trim(),
      client_logo: clientLogo.trim(),
      overview_title: overviewTitle.trim(),
      challenge: challenge.trim(),
      approach: approach.trim(),
      impact: impact.trim(),
      compliance: compliance.trim(),
      process: sanitizedProcess,
      reelSection: sanitizedReelSection,
      section_visibility: normalizedSectionVisibility,
    };

    try {
      const service = getWorkspaceService();
      if (isNew) {
        const savedProject = await service.createProject(projectData);
        setProject(savedProject);
        // Log activity in background — don't block save on logging failures
        service.logActivity("created", null, `created a new portfolio project: ${title}`).catch((logErr) => {
          console.warn("Activity log failed (non-critical):", logErr);
        });
      } else {
        const savedProject = await service.updateProject(id, projectData);
        setProject(savedProject);
        // Log activity in background — don't block save on logging failures
        service.logActivity("updated", null, `updated the portfolio project: ${title}`).catch((logErr) => {
          console.warn("Activity log failed (non-critical):", logErr);
        });
      }
      router.push(`/portfolio?refresh=${Date.now()}`);
    } catch (err: unknown) {
      console.error("Failed to save project:", err);
      // Supabase throws PostgrestError which is not instanceof Error but has .message
      let errMsg = "An error occurred while saving the project.";
      if (err instanceof Error) {
        errMsg = err.message;
      } else if (err && typeof err === "object" && "message" in err) {
        errMsg = String((err as { message: unknown }).message);
        // Also surface Supabase's hint/details if present
        if ("hint" in err && (err as { hint: unknown }).hint) {
          errMsg += ` — ${String((err as { hint: unknown }).hint)}`;
        }
        if ("details" in err && (err as { details: unknown }).details) {
          errMsg += ` (${String((err as { details: unknown }).details)})`;
        }
      }
      setErrorMsg(errMsg);
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

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold text-slate-300">
                  Category <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={cat} onValueChange={(val) => setCat(val || "web")}>
                      <SelectTrigger className="border-[#1E2D47] bg-[#07090F] text-white">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white">
                        {categories.map((c) => (
                          <SelectItem
                            key={c.slug}
                            value={c.slug}
                            className="hover:bg-[#1E2D47] focus:bg-[#1E2D47]"
                          >
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Input
                      placeholder="New category..."
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="border-[#1E2D47] bg-[#07090F] text-white max-w-[150px] text-xs h-9"
                    />
                    <Button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={isAddingCat || !newCatName.trim()}
                      className="bg-[#10B981] hover:bg-[#059669] text-white text-xs h-9 cursor-pointer"
                    >
                      {isAddingCat ? "Adding..." : "Add"}
                    </Button>
                  </div>
                </div>
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

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Industry</Label>
                <Input
                  placeholder="e.g. Healthcare / MedTech"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="border-[#1E2D47] bg-[#07090F] text-white text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Sprint / Timeline</Label>
                <Input
                  placeholder="e.g. 18-Month Agile"
                  value={sprint}
                  onChange={(e) => setSprint(e.target.value)}
                  className="border-[#1E2D47] bg-[#07090F] text-white text-xs"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold text-slate-300">Client Logo URL</Label>
                <Input
                  placeholder="Optional logo URL for homepage trusted brands section"
                  value={clientLogo}
                  onChange={(e) => setClientLogo(e.target.value)}
                  className="border-[#1E2D47] bg-[#07090F] text-white text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold text-slate-300">
                  Thumbnail Image <span className="text-red-500">*</span>
                </Label>
                {thumb ? (
                  <div className="relative group w-full h-40 rounded-md overflow-hidden border border-[#1E2D47]">
                    <img
                      src={thumb}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setThumb("")}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          id="thumb-upload"
                          className="hidden"
                          onChange={handleThumbUpload}
                          disabled={isUploadingThumb}
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById('thumb-upload')?.click()}
                          disabled={isUploadingThumb}
                          className="bg-[#1E2D47] hover:bg-[#2D3E5D] text-white text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {isUploadingThumb ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          Replace
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste image URL or upload file below"
                      value={thumb}
                      onChange={(e) => setThumb(e.target.value)}
                      className="border-[#1E2D47] bg-[#07090F] text-white text-xs font-mono flex-1"
                    />
                    <div className="relative shrink-0">
                      <input
                        type="file"
                        accept="image/*"
                        id="thumb-upload"
                        className="hidden"
                        onChange={handleThumbUpload}
                        disabled={isUploadingThumb}
                      />
                      <Button
                        type="button"
                        onClick={() => document.getElementById('thumb-upload')?.click()}
                        disabled={isUploadingThumb}
                        className="bg-[#1E2D47] hover:bg-[#2D3E5D] text-slate-300 text-xs h-9 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isUploadingThumb ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        Upload File
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Section 2: Narrative Content */}
          <Card className="border-[#1E2D47] bg-[#0F1629] p-6 space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#1E2D47] pb-3">
              Core Content
            </h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Tagline</Label>
                <Input placeholder="One sentence tagline. Use \\n for page break" value={tagline} onChange={(e) => setTagline(e.target.value)} className="border-[#1E2D47] bg-[#07090F] text-white text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Headline</Label>
                <Input placeholder="Uppercase grid headline. Use \\n for breaks" value={headline} onChange={(e) => setHeadline(e.target.value)} className="border-[#1E2D47] bg-[#07090F] text-white text-xs uppercase" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Short Description <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. A headless e-commerce platform built with Next.js." value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} className="border-[#1E2D47] bg-[#07090F] text-white text-xs" required />
              </div>
            </div>
          </Card>

          <Card className="border-[#1E2D47] bg-[#0F1629] p-6 space-y-5">
            <div className="border-b border-[#1E2D47] pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8]">Project Detail Sections</h2>
              <p className="mt-1 text-xs text-slate-500">Toggle public visibility here. Use dialogs to edit content without crowding the form.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PortfolioSectionCard title="Overview" enabled={sectionVisibility.overview} onToggle={(checked) => updateSectionVisibility("overview", checked)} summary={[overviewTitle, desc, challenge, approach, impact, compliance].some(hasText) ? "Overview content saved" : "No overview content yet"} onEdit={() => openSectionDialog("overview")} editLabel="Edit Overview" />
              <PortfolioSectionCard title="From Discovery to Deployment" enabled={sectionVisibility.process} onToggle={(checked) => updateSectionVisibility("process", checked)} summary={`${meaningfulProcessSteps(processSteps).length} process step${meaningfulProcessSteps(processSteps).length === 1 ? "" : "s"} saved`} onEdit={() => openSectionDialog("process")} editLabel="Edit Process" />
              <PortfolioSectionCard title="Impact / Results" enabled={sectionVisibility.impact} onToggle={(checked) => updateSectionVisibility("impact", checked)} summary={`${meaningfulStats(stats).length} result${meaningfulStats(stats).length === 1 ? "" : "s"} saved`} onEdit={() => openSectionDialog("impact")} editLabel="Edit Impact" />
              <PortfolioSectionCard title="Gallery" enabled={sectionVisibility.gallery} onToggle={(checked) => updateSectionVisibility("gallery", checked)} summary={`${galleryUrls.filter(Boolean).length} image${galleryUrls.filter(Boolean).length === 1 ? "" : "s"} saved`} onEdit={() => openSectionDialog("gallery")} editLabel="Edit Gallery" />
              <PortfolioSectionCard title="Project Reel" enabled={sectionVisibility.reel} onToggle={(checked) => updateSectionVisibility("reel", checked)} summary={reelVideoUrl ? "Reel video saved" : "No reel video yet"} onEdit={() => openSectionDialog("reel")} editLabel="Edit Reel" />
              <PortfolioSectionCard title="Video Showcase" enabled={sectionVisibility.videoShowcase} onToggle={(checked) => updateSectionVisibility("videoShowcase", checked)} summary={videoType !== "none" && videoUrl ? `${videoType} video saved` : "No showcase video yet"} onEdit={() => openSectionDialog("videoShowcase")} editLabel="Edit Video" />
              <PortfolioSectionCard title="Testimonials" enabled={sectionVisibility.testimonials} onToggle={(checked) => updateSectionVisibility("testimonials", checked)} summary={`${meaningfulFeedbacks(feedbacks).length} testimonial${meaningfulFeedbacks(feedbacks).length === 1 ? "" : "s"} saved`} onEdit={() => openSectionDialog("testimonials")} editLabel="Edit Testimonials" />
              <PortfolioSectionCard title="Related Projects" enabled={sectionVisibility.relatedProjects} onToggle={(checked) => updateSectionVisibility("relatedProjects", checked)} summary="No manual related-project picker exists yet; API keeps existing behavior." onEdit={() => openSectionDialog("relatedProjects")} editLabel="View Settings" />
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

          <Card className="border-[#1E2D47] bg-[#0F1629] p-6 space-y-3 text-white">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#1E2D47] pb-3">Section Tip</h2>
            <p className="text-xs text-slate-400 leading-relaxed">Use the compact section cards to show, hide, and edit public project sections. Hidden sections keep their content for later.</p>
          </Card>
        </div>


        <PortfolioSectionDialog open={activeDialog === "overview"} title="Edit Overview Section" description="Edit the long-form overview content. Saving this dialog updates the form; the project is persisted only when you save the project." onClose={closeSectionDialog} onSave={handleSaveDialog} error={dialogError}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2"><Label className="text-xs font-semibold text-slate-300">Section Title</Label><Input value={overviewDraft.overviewTitle} onChange={(e) => setOverviewDraft((d) => ({ ...d, overviewTitle: e.target.value }))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-slate-300">Industry</Label><Input value={overviewDraft.industry} onChange={(e) => setOverviewDraft((d) => ({ ...d, industry: e.target.value }))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-semibold text-slate-300">Sprint / Timeline</Label><Input value={overviewDraft.sprint} onChange={(e) => setOverviewDraft((d) => ({ ...d, sprint: e.target.value }))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs" /></div>
            <div className="space-y-1.5 md:col-span-2"><Label className="text-xs font-semibold text-slate-300">Main Description</Label><Textarea value={overviewDraft.desc} onChange={(e) => setOverviewDraft((d) => ({ ...d, desc: e.target.value }))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs min-h-[180px]" /></div>
            {[{key: "challenge", label: "The Challenge"}, {key: "approach", label: "Our Approach"}, {key: "impact", label: "The Impact"}, {key: "compliance", label: "Compliance / Note"}].map((item) => (
              <div key={item.key} className="space-y-1.5"><Label className="text-xs font-semibold text-slate-300">{item.label}</Label><Textarea value={overviewDraft[item.key as keyof typeof overviewDraft]} onChange={(e) => setOverviewDraft((d) => ({ ...d, [item.key]: e.target.value }))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs min-h-[140px]" /></div>
            ))}
          </div>
        </PortfolioSectionDialog>

        <PortfolioSectionDialog open={activeDialog === "process"} title="Edit From Discovery to Deployment" description="Manage repeatable process steps. Use move buttons for keyboard-accessible reordering." onClose={closeSectionDialog} onSave={handleSaveDialog} error={dialogError}>
          <div className="space-y-3">
            <Button type="button" onClick={() => setProcessDraft((prev) => [...prev, { id: makeDraftId(), phase: "", title: "", description: "" }])} className="bg-[#1E2D47] hover:bg-[#2D3E5D] text-slate-300 text-xs cursor-pointer">Add Step</Button>
            {processDraft.length === 0 ? <p className="text-xs text-slate-500 italic">No process steps yet.</p> : processDraft.map((step, index) => (
              <div key={step.id} className="space-y-3 rounded-lg border border-[#1E2D47] bg-[#07090F]/60 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><h3 className="text-sm font-semibold text-white">Step {index + 1} — {step.title || step.phase || "Untitled"}</h3><div className="flex flex-wrap gap-2"><Button type="button" size="sm" disabled={index === 0} onClick={() => setProcessDraft((prev) => { const next=[...prev]; [next[index-1], next[index]]=[next[index], next[index-1]]; return next; })} className="h-7 bg-[#1E2D47] text-[10px]">Move Up</Button><Button type="button" size="sm" disabled={index === processDraft.length - 1} onClick={() => setProcessDraft((prev) => { const next=[...prev]; [next[index+1], next[index]]=[next[index], next[index+1]]; return next; })} className="h-7 bg-[#1E2D47] text-[10px]">Move Down</Button><Button type="button" size="sm" onClick={() => setProcessDraft((prev) => [...prev.slice(0,index+1), { ...step, id: makeDraftId(), title: `${step.title} Copy`.trim() }, ...prev.slice(index+1)])} className="h-7 bg-[#1E2D47] text-[10px]">Duplicate</Button><Button type="button" size="sm" onClick={() => setProcessDraft((prev) => prev.filter((item) => item.id !== step.id))} className="h-7 bg-red-600 hover:bg-red-700 text-[10px]">Delete</Button></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Input placeholder="Phase / label" value={step.phase} onChange={(e) => setProcessDraft((prev) => prev.map((item) => item.id === step.id ? { ...item, phase: e.target.value } : item))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs" /><Input placeholder="Step title" value={step.title} onChange={(e) => setProcessDraft((prev) => prev.map((item) => item.id === step.id ? { ...item, title: e.target.value } : item))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs" /></div>
                <Textarea placeholder="Step description" value={step.description} onChange={(e) => setProcessDraft((prev) => prev.map((item) => item.id === step.id ? { ...item, description: e.target.value } : item))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs min-h-[140px]" />
              </div>
            ))}
          </div>
        </PortfolioSectionDialog>

        <PortfolioSectionDialog open={activeDialog === "impact"} title="Edit Impact / Results" description="Manage impact result cards." onClose={closeSectionDialog} onSave={handleSaveDialog} error={dialogError}>
          <div className="space-y-3"><Button type="button" onClick={() => setStatsDraft((prev) => [...prev, { num: "", label: "", before: "", after: "" }])} className="bg-[#1E2D47] hover:bg-[#2D3E5D] text-slate-300 text-xs">Add Result</Button>{statsDraft.map((stat, index) => <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded border border-[#1E2D47] bg-[#07090F]/60 p-3"><Input placeholder="Value" value={stat.num} onChange={(e)=>setStatsDraft((prev)=>prev.map((item,i)=>i===index?{...item,num:e.target.value}:item))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs"/><Input placeholder="Label" value={stat.label} onChange={(e)=>setStatsDraft((prev)=>prev.map((item,i)=>i===index?{...item,label:e.target.value}:item))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs"/><Input placeholder="Before" value={stat.before||""} onChange={(e)=>setStatsDraft((prev)=>prev.map((item,i)=>i===index?{...item,before:e.target.value}:item))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs"/><div className="flex gap-2"><Input placeholder="After" value={stat.after||""} onChange={(e)=>setStatsDraft((prev)=>prev.map((item,i)=>i===index?{...item,after:e.target.value}:item))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs"/><Button type="button" onClick={()=>setStatsDraft((prev)=>prev.filter((_,i)=>i!==index))} className="bg-red-600 hover:bg-red-700 px-3"><Trash2 className="h-3 w-3" /></Button></div></div>)}</div>
        </PortfolioSectionDialog>

        <PortfolioSectionDialog open={activeDialog === "gallery"} title="Edit Gallery" description="Upload, remove, and arrange gallery images." onClose={closeSectionDialog} onSave={handleSaveDialog} error={dialogError}>
          <div className="space-y-4"><input type="file" accept="image/*" multiple id="gallery-dialog-upload" className="hidden" onChange={(e) => uploadGalleryFiles(e.target.files, (urls) => setGalleryDraft((prev) => [...prev, ...urls]))} disabled={isUploadingGallery}/><Button type="button" onClick={() => document.getElementById('gallery-dialog-upload')?.click()} disabled={isUploadingGallery} className="bg-[#1E2D47] hover:bg-[#2D3E5D] text-slate-300 text-xs">{isUploadingGallery ? "Uploading…" : "Upload Gallery Images"}</Button><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{galleryDraft.map((url, index)=><div key={`${url}-${index}`} className="relative aspect-video overflow-hidden rounded border border-[#1E2D47] bg-black"><img src={url} alt={`Gallery ${index+1}`} className="h-full w-full object-cover"/><button type="button" onClick={()=>setGalleryDraft((prev)=>prev.filter((_,i)=>i!==index))} className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white"><Trash2 className="h-3 w-3"/></button></div>)}</div></div>
        </PortfolioSectionDialog>

        <PortfolioSectionDialog open={activeDialog === "reel"} title="Edit Project Reel" description="Manage the optional 9:16 reel canvas." onClose={closeSectionDialog} onSave={handleSaveDialog} error={dialogError}>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-5"><div className="space-y-4"><Input placeholder="Reel title" value={reelDraft.title || ""} onChange={(e)=>setReelDraft((d)=>({...d,title:e.target.value}))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs"/><Textarea placeholder="Reel description" value={reelDraft.description || ""} onChange={(e)=>setReelDraft((d)=>({...d,description:e.target.value}))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs min-h-[100px]"/><Input placeholder="Video URL" value={reelDraft.videoUrl || ""} onChange={(e)=>setReelDraft((d)=>({...d,videoUrl:e.target.value}))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs font-mono"/><div className="flex flex-wrap gap-2"><input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" id="reel-dialog-upload" className="hidden" onChange={async(e)=>{const file=e.target.files?.[0]; if(!file)return; if(!isSupportedVideoFile(file)){alert('Please upload an MP4, WebM, MOV, or M4V video file.'); return;} setIsUploadingReelVideo(true); try{const url=await getWorkspaceService().uploadProjectFile(file); setReelDraft((d)=>({...d,videoUrl:url}));}finally{setIsUploadingReelVideo(false); e.target.value='';}}}/><Button type="button" onClick={()=>document.getElementById('reel-dialog-upload')?.click()} disabled={isUploadingReelVideo} className="bg-[#1E2D47] text-xs">{isUploadingReelVideo ? "Uploading…" : "Upload Reel Video"}</Button>{reelDraft.videoUrl && <Button type="button" onClick={()=>setReelDraft((d)=>({...d,videoUrl:""}))} className="bg-red-600 hover:bg-red-700 text-xs">Remove Video</Button>}</div><div className="flex flex-col gap-2 sm:flex-row"><Input placeholder="Poster URL" value={reelDraft.posterUrl || ""} onChange={(e)=>setReelDraft((d)=>({...d,posterUrl:e.target.value}))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs font-mono"/><input type="file" accept="image/*" id="reel-poster-dialog-upload" className="hidden" onChange={async(e)=>{const file=e.target.files?.[0]; if(!file)return; setIsUploadingReelPoster(true); try{const url=await getWorkspaceService().uploadProjectFile(file); setReelDraft((d)=>({...d,posterUrl:url}));}finally{setIsUploadingReelPoster(false); e.target.value='';}}}/><Button type="button" onClick={()=>document.getElementById('reel-poster-dialog-upload')?.click()} disabled={isUploadingReelPoster} className="bg-[#1E2D47] text-xs">{isUploadingReelPoster ? "Uploading…" : "Upload Poster"}</Button>{reelDraft.posterUrl && <Button type="button" onClick={()=>setReelDraft((d)=>({...d,posterUrl:""}))} className="bg-red-600 hover:bg-red-700 text-xs">Remove Poster</Button>}</div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[{label:'Autoplay',key:'autoplay'},{label:'Muted',key:'muted'},{label:'Loop',key:'loop'}].map((item)=><label key={item.key} className="inline-flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={Boolean(reelDraft[item.key as keyof ProjectReelSection]) || (item.key==='muted' && reelDraft.autoplay)} disabled={item.key==='muted' && reelDraft.autoplay} onChange={(e)=>setReelDraft((d)=>({...d,[item.key]:e.target.checked, muted: item.key==='autoplay' && e.target.checked ? true : d.muted}))} className="h-4 w-4 accent-[#0EA5E9]"/>{item.label}</label>)}</div></div><div className="mx-auto w-full max-w-[280px]"><div className="aspect-[9/16] overflow-hidden rounded-2xl border border-[#1E2D47] bg-black">{reelDraft.videoUrl ? <video src={reelDraft.videoUrl} poster={reelDraft.posterUrl || undefined} controls muted={reelDraft.autoplay || reelDraft.muted} loop={reelDraft.loop} preload="metadata" className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center p-4 text-center text-xs text-slate-500">No reel video selected.</div>}</div></div></div>
        </PortfolioSectionDialog>

        <PortfolioSectionDialog open={activeDialog === "videoShowcase"} title="Edit Video Showcase" description="Manage the existing video showcase provider and URL." onClose={closeSectionDialog} onSave={handleSaveDialog} error={dialogError}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Select value={videoDraft.videoType} onValueChange={(val)=>setVideoDraft((d)=>({ ...d, videoType: val || "none", videoUrl: val === "none" ? "" : d.videoUrl }))}><SelectTrigger className="border-[#1E2D47] bg-[#07090F] text-white"><SelectValue placeholder="No Video"/></SelectTrigger><SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white"><SelectItem value="none">No Video</SelectItem><SelectItem value="youtube">YouTube</SelectItem><SelectItem value="vimeo">Vimeo</SelectItem><SelectItem value="upload">Upload Video File</SelectItem></SelectContent></Select><div className="md:col-span-2 flex gap-2"><Input value={videoDraft.videoUrl} onChange={(e)=>setVideoDraft((d)=>({...d,videoUrl:e.target.value}))} placeholder="Video URL" className="border-[#1E2D47] bg-[#07090F] text-white text-xs font-mono" readOnly={videoDraft.videoType === "upload"}/>{videoDraft.videoType === "upload" && <><input type="file" accept="video/*" id="showcase-dialog-upload" className="hidden" onChange={async(e)=>{const file=e.target.files?.[0]; if(!file)return; setIsUploadingVideo(true); try{const url=await getWorkspaceService().uploadProjectFile(file); setVideoDraft((d)=>({...d,videoUrl:url}));}finally{setIsUploadingVideo(false); e.target.value='';}}}/><Button type="button" onClick={()=>document.getElementById('showcase-dialog-upload')?.click()} disabled={isUploadingVideo} className="bg-[#1E2D47] text-xs">Upload</Button></>}</div></div>
        </PortfolioSectionDialog>

        <PortfolioSectionDialog open={activeDialog === "testimonials"} title="Edit Testimonials" description="Manage testimonial cards." onClose={closeSectionDialog} onSave={handleSaveDialog} error={dialogError}>
          <div className="space-y-3"><Button type="button" onClick={()=>setFeedbackDraft((prev)=>[...prev,{name:"",role:"",text:""}])} className="bg-[#1E2D47] text-xs">Add Quote</Button>{feedbackDraft.map((f,index)=><div key={index} className="space-y-2 rounded border border-[#1E2D47] bg-[#07090F]/60 p-3"><div className="grid grid-cols-1 md:grid-cols-2 gap-2"><Input placeholder="Name" value={f.name} onChange={(e)=>setFeedbackDraft((prev)=>prev.map((item,i)=>i===index?{...item,name:e.target.value}:item))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs"/><Input placeholder="Role / Company" value={f.role} onChange={(e)=>setFeedbackDraft((prev)=>prev.map((item,i)=>i===index?{...item,role:e.target.value}:item))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs"/></div><Textarea placeholder="Quote" value={f.text} onChange={(e)=>setFeedbackDraft((prev)=>prev.map((item,i)=>i===index?{...item,text:e.target.value}:item))} className="border-[#1E2D47] bg-[#07090F] text-white text-xs min-h-[90px]"/><Button type="button" onClick={()=>setFeedbackDraft((prev)=>prev.filter((_,i)=>i!==index))} className="bg-red-600 hover:bg-red-700 text-xs">Delete Quote</Button></div>)}</div>
        </PortfolioSectionDialog>

        <PortfolioSectionDialog open={activeDialog === "relatedProjects"} title="Related Projects Section" description="The current backend uses automatic related-project behavior. This toggle controls public visibility and preserves the existing API behavior." onClose={closeSectionDialog} onSave={handleSaveDialog} error={dialogError}>
          <p className="text-sm text-slate-300">No manual related-project selector exists in the current Portfolio model, so this dialog only documents the visibility setting.</p>
        </PortfolioSectionDialog>

      </form>
    </div>
  );
}

function PortfolioSectionCard({
  title,
  enabled,
  summary,
  editLabel,
  onToggle,
  onEdit,
}: {
  title: string;
  enabled: boolean;
  summary: string;
  editLabel: string;
  onToggle: (checked: boolean) => void;
  onEdit: () => void;
}) {
  const toggleId = `toggle-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="portfolio-section-card rounded-lg border border-[#1E2D47] bg-[#07090F]/50 p-4 text-white">
      <div className="portfolio-section-card-header flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="portfolio-section-card-summary mt-1 text-xs text-slate-500">{summary}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-600">{enabled ? "Visible on public project page" : "Hidden publicly; content preserved"}</p>
        </div>
        <label htmlFor={toggleId} className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold text-slate-300">
          <input id={toggleId} type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} className="h-4 w-4 rounded border-[#1E2D47] bg-[#07090F] accent-[#0EA5E9]" />
          Show
        </label>
      </div>
      <div className="portfolio-section-card-actions mt-4">
        <Button type="button" onClick={onEdit} className="w-full bg-[#1E2D47] text-xs text-slate-300 hover:bg-[#2D3E5D] sm:w-auto">
          {editLabel}
        </Button>
      </div>
    </div>
  );
}

function PortfolioSectionDialog({
  open,
  title,
  description,
  error,
  children,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  description: string;
  error: string | null;
  children: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="portfolio-section-dialog flex h-[90vh] w-[94vw] max-w-[calc(100vw-32px)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden border border-[#1E2D47] bg-[#0F1629] p-0 text-white shadow-2xl sm:h-[min(80vh,900px)] sm:w-[min(80vw,1200px)]" showCloseButton>
        <DialogHeader className="portfolio-section-dialog-header sticky top-0 z-10 border-b border-[#1E2D47] bg-[#0F1629] px-5 py-4 pr-12">
          <DialogTitle className="text-base font-bold text-white">{title}</DialogTitle>
          <DialogDescription className="text-xs text-slate-400">{description}</DialogDescription>
        </DialogHeader>
        <div className="portfolio-section-dialog-body min-h-0 overflow-y-auto px-5 py-5">
          {error && <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
          {children}
        </div>
        <DialogFooter className="portfolio-section-dialog-footer sticky bottom-0 m-0 border-t border-[#1E2D47] bg-[#0F1629] px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose} className="border-[#1E2D47] text-slate-300 hover:bg-[#1E2D47]">Cancel</Button>
          <Button type="button" onClick={onSave} className="bg-[#0EA5E9] text-white hover:bg-[#0284C7]">Save Section</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
