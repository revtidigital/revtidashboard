"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Compass,
  Save,
  ArrowLeft,
  Trash2,
  TrendingUp,
  User,
  Upload,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  LinkIcon,
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
  ProjectReelItem,
  ProjectSectionVisibility,
  ProjectVideoSource,
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// CAT_LABELS removed in favor of dynamic categories

const DEFAULT_SECTION_VISIBILITY: ProjectSectionVisibility = {
  overview: false,
  process: false,
  impact: false,
  gallery: false,
  reel: false,
  videoShowcase: false,
  relatedProjects: false,
};

type SectionKey = keyof ProjectSectionVisibility;
type OverviewDraft = { overviewTitle: string; desc: string; client: string; industry: string; year: string; challenge: string; approach: string; impact: string; compliance: string; tagsInput: string; };
type ReelUploadState = Record<string, { videoUploading: boolean; posterUploading: boolean }>;

const VIDEO_SOURCE_OPTIONS: { value: ProjectVideoSource; label: string; urlLabel: string }[] = [
  { value: "upload", label: "Upload Video", urlLabel: "Uploaded Video URL" },
  { value: "youtube", label: "YouTube", urlLabel: "YouTube URL" },
  { value: "vimeo", label: "Vimeo", urlLabel: "Vimeo URL" },
  { value: "direct", label: "Direct MP4 URL", urlLabel: "Direct Video URL" },
  { value: "external", label: "Other External URL", urlLabel: "External URL" },
];

const normalizeVideoSource = (source?: string | null, url?: string | null): ProjectVideoSource => {
  if (source === "upload" || source === "youtube" || source === "vimeo" || source === "direct" || source === "external") return source;
  if (source === "none") return "upload";
  const lowerUrl = url?.toLowerCase() || "";
  if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) return "youtube";
  if (lowerUrl.includes("vimeo.com")) return "vimeo";
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(lowerUrl)) return "direct";
  return "upload";
};

const getYoutubeEmbedUrl = (url: string) => {
  const trimmed = url.trim();
  const match = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : trimmed;
};

const getVimeoEmbedUrl = (url: string) => {
  const trimmed = url.trim();
  const match = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}` : trimmed;
};

const textHasContent = (value?: string | null) => Boolean(value?.trim());
const createDraftId = () => `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const withProcessIds = (steps: ProjectProcessStep[]) => steps.map((step) => ({ ...step, id: step.id || createDraftId() }));

const createReelItem = (overrides: Partial<ProjectReelItem> = {}): ProjectReelItem => ({
  id: overrides.id || createDraftId(),
  enabled: overrides.enabled ?? true,
  title: overrides.title || "",
  description: overrides.description || "",
  videoUrl: overrides.videoUrl || "",
  videoSource: normalizeVideoSource(overrides.videoSource, overrides.videoUrl),
  posterUrl: overrides.posterUrl || "",
  autoplay: overrides.autoplay ?? false,
  muted: overrides.autoplay ? true : (overrides.muted ?? true),
  loop: overrides.loop ?? true,
  displayOrder: overrides.displayOrder ?? 0,
});

const normalizeReelItems = (items: ProjectReelItem[]) => items
  .map((item, index) => createReelItem({ ...item, displayOrder: Number.isInteger(item.displayOrder) ? item.displayOrder : index }))
  .sort((a, b) => a.displayOrder - b.displayOrder)
  .map((item, index) => ({ ...item, displayOrder: index, muted: item.autoplay ? true : item.muted }));

const normalizeReelSectionForForm = (reel?: ProjectReelSection): ProjectReelSection => {
  if (!reel) return { enabled: false, title: "", description: "", items: [] };
  const legacyItem = reel.videoUrl ? createReelItem({
    id: `legacy-reel-${reel.videoUrl}`,
    enabled: reel.enabled,
    title: reel.title,
    description: reel.description,
    videoUrl: reel.videoUrl,
    videoSource: normalizeVideoSource(reel.items?.[0]?.videoSource, reel.videoUrl),
    posterUrl: reel.posterUrl,
    autoplay: reel.autoplay,
    muted: reel.muted,
    loop: reel.loop,
    displayOrder: 0,
  }) : null;
  return {
    enabled: reel.enabled === true,
    title: reel.title || "",
    description: reel.description || "",
    items: normalizeReelItems(Array.isArray(reel.items) && reel.items.length > 0 ? reel.items : legacyItem ? [legacyItem] : []),
  };
};

function sectionHasContent(key: SectionKey, data: {
  overviewTitle: string; desc: string; challenge: string; approach: string; impact: string; compliance: string;
  processSteps: ProjectProcessStep[]; stats: ProjectStat[]; galleryUrls: string[]; reelSection: ProjectReelSection; videoType: ProjectVideoSource; videoUrl: string;
}) {
  switch (key) {
    case "overview": return [data.overviewTitle, data.desc, data.challenge, data.approach, data.impact, data.compliance].some(textHasContent);
    case "process": return data.processSteps.some((step) => [step.phase, step.title, step.description].some(textHasContent));
    case "impact": return data.stats.some((stat) => [stat.num, stat.label, stat.before, stat.after].some(textHasContent));
    case "gallery": return data.galleryUrls.some(textHasContent);
    case "reel": return data.reelSection.enabled && data.reelSection.items.some((item) => item.enabled && textHasContent(item.videoUrl));
    case "videoShowcase": return textHasContent(data.videoUrl);
    case "relatedProjects": return false;
  }
}

function normalizeVisibility(project: Project | null, data: Parameters<typeof sectionHasContent>[1]): ProjectSectionVisibility {
  return (Object.keys(DEFAULT_SECTION_VISIBILITY) as SectionKey[]).reduce((next, key) => {
    const explicit = project?.section_visibility?.[key];
    next[key] = typeof explicit === "boolean" ? explicit : sectionHasContent(key, data);
    return next;
  }, { ...DEFAULT_SECTION_VISIBILITY });
}

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
    <div className="portfolio-form-container flex flex-col gap-6">
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
  const [sectionVisibility, setSectionVisibility] = useState<ProjectSectionVisibility>(DEFAULT_SECTION_VISIBILITY);
  const [activeDialog, setActiveDialog] = useState<SectionKey | null>(null);
  const [overviewDraft, setOverviewDraft] = useState<OverviewDraft | null>(null);
  const [processDraft, setProcessDraft] = useState<ProjectProcessStep[]>([]);
  const [expandedProcessSteps, setExpandedProcessSteps] = useState<Record<string, boolean>>({});
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [reelSection, setReelSection] = useState<ProjectReelSection>(() => normalizeReelSectionForForm());
  const [reelDraft, setReelDraft] = useState<ProjectReelSection | null>(null);
  const [reelUploadState, setReelUploadState] = useState<ReelUploadState>({});
  const [reelValidationErrors, setReelValidationErrors] = useState<Record<string, string>>({});

  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [categoryToDelete, setCategoryToDelete] = useState<ProjectCategory | null>(null);
  const [replacementCategoryId, setReplacementCategoryId] = useState("");
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [categorySuccessMsg, setCategorySuccessMsg] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);


  const [videoType, setVideoType] = useState<ProjectVideoSource>("upload");
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
        setAllProjects(allProjects);

        if (isNew) {
          // Default sequence to next available sequence
          const maxSeq = allProjects.length > 0
            ? Math.max(...allProjects.map((p) => p.sequence || 0))
            : 0;
          setSequence(String(maxSeq + 1));
          setYear(new Date().getFullYear().toString());
          if (categoriesData.length > 0) {
            setCat(categoriesData[0].slug);
          }
          setSectionVisibility(DEFAULT_SECTION_VISIBILITY);
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
          setVideoType(normalizeVideoSource(found.video_source || found.video_type, found.video_url));
          setVideoUrl(found.video_url || "");
          setIndustry(found.industry || "");
          setSprint(found.sprint || "");
          setClientLogo(found.client_logo || "");
          setOverviewTitle(found.overview_title || "");
          setChallenge(found.challenge || "");
          setApproach(found.approach || "");
          setImpact(found.impact || "");
          setCompliance(found.compliance || "");
          const loadedProcess = withProcessIds(found.process || []);
          setProcessSteps(loadedProcess);
          const normalizedReel = normalizeReelSectionForForm(found.reelSection);
          setReelSection(normalizedReel);
          setSectionVisibility(normalizeVisibility(found, { overviewTitle: found.overview_title || "", desc: found.desc || "", challenge: found.challenge || "", approach: found.approach || "", impact: found.impact || "", compliance: found.compliance || "", processSteps: loadedProcess, stats: found.stats || [], galleryUrls: found.gallery || [], reelSection: normalizedReel, videoType: normalizeVideoSource(found.video_source || found.video_type, found.video_url), videoUrl: found.video_url || "" }));
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

  const setSectionEnabled = (key: SectionKey, enabled: boolean) => {
    setSectionVisibility((current) => ({ ...current, [key]: enabled }));
    if (key === "reel") setReelSection((current) => ({ ...current, enabled }));
  };

  const openSectionDialog = (key: SectionKey) => {
    setSectionError(null);
    if (key === "overview") {
      setOverviewDraft({ overviewTitle, desc, client, industry, year, challenge, approach, impact, compliance, tagsInput });
    }
    if (key === "process") {
      const draft = withProcessIds(processSteps);
      setProcessDraft(draft);
      setExpandedProcessSteps(Object.fromEntries(draft.map((step) => [step.id || createDraftId(), true])));
    }
    if (key === "reel") {
      setReelDraft(normalizeReelSectionForForm(reelSection));
      setReelValidationErrors({});
      setReelUploadState({});
    }
    setActiveDialog(key);
  };

  const closeSectionDialog = () => {
    setActiveDialog(null);
    setOverviewDraft(null);
    setProcessDraft([]);
    setReelDraft(null);
    setReelValidationErrors({});
    setReelUploadState({});
    setSectionError(null);
  };

  const saveOverviewDraft = () => {
    if (!overviewDraft) return;
    setOverviewTitle(overviewDraft.overviewTitle);
    setDesc(overviewDraft.desc);
    setClient(overviewDraft.client);
    setIndustry(overviewDraft.industry);
    setYear(overviewDraft.year);
    setChallenge(overviewDraft.challenge);
    setApproach(overviewDraft.approach);
    setImpact(overviewDraft.impact);
    setCompliance(overviewDraft.compliance);
    setTagsInput(overviewDraft.tagsInput);
    closeSectionDialog();
  };

  const addProcessDraftStep = () => setProcessDraft((steps) => [...steps, { id: createDraftId(), phase: "", title: "", description: "" }]);
  const updateProcessDraftStep = (id: string, key: keyof ProjectProcessStep, value: string) => setProcessDraft((steps) => steps.map((step) => step.id === id ? { ...step, [key]: value } : step));
  const removeProcessDraftStep = (id: string) => setProcessDraft((steps) => steps.filter((step) => step.id !== id));
  const duplicateProcessDraftStep = (id: string) => setProcessDraft((steps) => steps.flatMap((step) => step.id === id ? [step, { ...step, id: createDraftId(), title: `${step.title} Copy`.trim() }] : [step]));
  const moveProcessDraftStep = (index: number, direction: -1 | 1) => setProcessDraft((steps) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return steps;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const saveProcessDraft = () => {
    const cleaned = processDraft.filter((step) => [step.phase, step.title, step.description].some(textHasContent));
    if (sectionVisibility.process && cleaned.length === 0) {
      setSectionError("Add at least one process step with a phase, title, or description, or hide the Process section.");
      return;
    }
    setProcessSteps(cleaned);
    closeSectionDialog();
  };



  const updateReelDraft = (updater: (draft: ProjectReelSection) => ProjectReelSection) => {
    setReelDraft((current) => current ? updater(current) : current);
  };

  const updateReelDraftItem = (itemId: string, updater: (item: ProjectReelItem) => ProjectReelItem) => {
    updateReelDraft((draft) => ({
      ...draft,
      items: normalizeReelItems(draft.items.map((item) => item.id === itemId ? updater(item) : item)),
    }));
  };

  const addReelDraftItem = () => updateReelDraft((draft) => ({
    ...draft,
    items: normalizeReelItems([...draft.items, createReelItem({ displayOrder: draft.items.length })]),
  }));

  const duplicateReelDraftItem = (itemId: string) => updateReelDraft((draft) => {
    const index = draft.items.findIndex((item) => item.id === itemId);
    if (index === -1) return draft;
    const duplicate = createReelItem({ ...draft.items[index], id: createDraftId(), title: `${draft.items[index].title || "Reel"} Copy` });
    const items = [...draft.items];
    items.splice(index + 1, 0, duplicate);
    return { ...draft, items: normalizeReelItems(items) };
  });

  const removeReelDraftItem = (itemId: string) => updateReelDraft((draft) => {
    const item = draft.items.find((current) => current.id === itemId);
    if (item && [item.title, item.description, item.videoUrl, item.posterUrl].some(textHasContent) && !window.confirm("Delete this Reel? This action cannot be undone.")) {
      return draft;
    }
    return { ...draft, items: normalizeReelItems(draft.items.filter((current) => current.id !== itemId)) };
  });

  const moveReelDraftItem = (index: number, direction: -1 | 1) => updateReelDraft((draft) => {
    const target = index + direction;
    if (target < 0 || target >= draft.items.length) return draft;
    const items = [...draft.items];
    [items[index], items[target]] = [items[target], items[index]];
    return { ...draft, items: normalizeReelItems(items.map((item, itemIndex) => ({ ...item, displayOrder: itemIndex }))) };
  });

  const reelUploadsActive = Object.values(reelUploadState).some((state) => state.videoUploading || state.posterUploading);

  const validateReelSection = (section: ProjectReelSection) => {
    const errors: Record<string, string> = {};
    if (section.enabled && !section.items.some((item) => item.enabled && textHasContent(item.videoUrl))) {
      errors.__section = "Show Reel Section is on. Add at least one enabled Reel with a video URL, or hide the section.";
    }
    for (const item of section.items) {
      if (item.enabled && !textHasContent(item.videoUrl)) {
        errors[item.id] = "Enabled Reel items require a video URL or uploaded video.";
      }
    }
    return errors;
  };

  const saveReelDraft = () => {
    if (!reelDraft) return;
    const normalized = { ...reelDraft, items: normalizeReelItems(reelDraft.items) };
    const errors = validateReelSection(normalized);
    if (Object.keys(errors).length > 0) {
      setReelValidationErrors(errors);
      return;
    }
    setReelSection(normalized);
    setSectionVisibility((current) => ({ ...current, reel: normalized.enabled }));
    closeSectionDialog();
  };

  const handleReelItemVideoUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isSupportedVideoFile(file)) {
      alert("Please upload an MP4, WebM, MOV, or M4V video file for the reel.");
      e.target.value = "";
      return;
    }
    setReelUploadState((current) => ({ ...current, [itemId]: { ...current[itemId], videoUploading: true } }));
    try {
      const service = getWorkspaceService();
      const publicUrl = await service.uploadProjectFile(file);
      updateReelDraftItem(itemId, (item) => ({ ...item, videoUrl: publicUrl }));
    } catch (err) {
      console.error("Failed to upload reel video:", err);
      alert("Reel video upload failed.");
    } finally {
      setReelUploadState((current) => ({ ...current, [itemId]: { ...current[itemId], videoUploading: false } }));
      e.target.value = "";
    }
  };

  const handleReelItemPosterUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReelUploadState((current) => ({ ...current, [itemId]: { ...current[itemId], posterUploading: true } }));
    try {
      const service = getWorkspaceService();
      const publicUrl = await service.uploadProjectFile(file);
      updateReelDraftItem(itemId, (item) => ({ ...item, posterUrl: publicUrl }));
    } catch (err) {
      console.error("Failed to upload reel poster:", err);
      alert("Reel poster upload failed.");
    } finally {
      setReelUploadState((current) => ({ ...current, [itemId]: { ...current[itemId], posterUploading: false } }));
      e.target.value = "";
    }
  };

  const getCategoryUsageCount = (categorySlug: string) => allProjects.filter((item) => item.cat === categorySlug).length;
  const isReservedCategory = (category: ProjectCategory) => ["all", "uncategorized"].includes(category.slug.toLowerCase());

  const openDeleteCategoryDialog = (category: ProjectCategory, event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (isReservedCategory(category)) {
      setErrorMsg("This system category cannot be deleted.");
      return;
    }
    const replacement = categories.find((item) => item.id !== category.id && !isReservedCategory(item));
    setReplacementCategoryId(replacement?.id || "");
    setCategoryToDelete(category);
    setCategorySuccessMsg(null);
  };

  const closeDeleteCategoryDialog = () => {
    if (isDeletingCategory) return;
    setCategoryToDelete(null);
    setReplacementCategoryId("");
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const usageCount = getCategoryUsageCount(categoryToDelete.slug);
    if (usageCount > 0 && !replacementCategoryId) {
      setErrorMsg("Choose a replacement category before deleting a category that is used by projects.");
      return;
    }

    setIsDeletingCategory(true);
    setErrorMsg(null);
    try {
      const service = getWorkspaceService();
      await service.deleteProjectCategory(categoryToDelete.id, usageCount > 0 ? { replacementCategoryId } : undefined);
      const replacement = categories.find((item) => item.id === replacementCategoryId);
      const nextCategories = categories.filter((item) => item.id !== categoryToDelete.id);
      setCategories(nextCategories);
      setAllProjects((projects) => projects.map((item) => item.cat === categoryToDelete.slug && replacement ? { ...item, cat: replacement.slug } : item));
      if (cat === categoryToDelete.slug) {
        setCat(replacement?.slug || nextCategories[0]?.slug || "");
      }
      setCategorySuccessMsg(`Deleted category “${categoryToDelete.name}”.${usageCount > 0 && replacement ? ` Reassigned ${usageCount} project${usageCount === 1 ? "" : "s"} to “${replacement.name}”.` : ""}`);
      setCategoryToDelete(null);
      setReplacementCategoryId("");
    } catch (err) {
      console.error("Failed to delete project category:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete category. Please try again.");
    } finally {
      setIsDeletingCategory(false);
    }
  };

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

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingGallery(true);
    try {
      const service = getWorkspaceService();
      const uploadPromises = Array.from(files).map(file => service.uploadProjectFile(file));
      const urls = await Promise.all(uploadPromises);
      setGalleryUrls(prev => [...prev, ...urls]);
    } catch (err) {
      console.error("Failed to upload gallery images:", err);
      alert("Failed to upload gallery images.");
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryUrls(prev => prev.filter((_, i) => i !== index));
  };

  function isSupportedVideoFile(file: File) {
    return ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"].includes(file.type);
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isSupportedVideoFile(file)) {
      alert("Please upload an MP4, WebM, MOV, or M4V video file.");
      e.target.value = "";
      return;
    }
    setIsUploadingVideo(true);
    try {
      const service = getWorkspaceService();
      const publicUrl = await service.uploadProjectFile(file);
      setVideoUrl(publicUrl);
    } catch (err) {
      console.error("Failed to upload video:", err);
      alert("Video upload failed.");
    } finally {
      setIsUploadingVideo(false);
      e.target.value = "";
    }
  };

  const handleAddStat = () => {
    setStats([...stats, { num: "", label: "", before: "", after: "" }]);
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

    if (sectionVisibility.process && !processSteps.some((step) => [step.phase, step.title, step.description].some(textHasContent))) {
      setErrorMsg("Process section is enabled but has no meaningful steps.");
      openSectionDialog("process");
      return;
    }

    if (sectionVisibility.gallery && !galleryUrls.some(textHasContent)) {
      setErrorMsg("Gallery section is enabled but has no images.");
      openSectionDialog("gallery");
      return;
    }

    if (sectionVisibility.impact && !stats.some((stat) => [stat.num, stat.label, stat.before, stat.after].some(textHasContent))) {
      setErrorMsg("Impact section is enabled but has no key results.");
      openSectionDialog("impact");
      return;
    }

    const reelErrors = validateReelSection(reelSection);
    if ((sectionVisibility.reel || reelSection.enabled) && Object.keys(reelErrors).length > 0) {
      setErrorMsg(reelErrors.__section || "Fix the enabled Reel items before saving.");
      openSectionDialog("reel");
      setReelValidationErrors(reelErrors);
      return;
    }

    if (sectionVisibility.videoShowcase && !videoUrl.trim()) {
      setErrorMsg("Video Showcase requires a provider and video URL when enabled.");
      openSectionDialog("videoShowcase");
      return;
    }

    if (isUploadingThumb || isUploadingGallery || isUploadingVideo || reelUploadsActive) {
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
        id: step.id || createDraftId(),
        icon: step.icon?.trim(),
      }))
      .filter((step) => step.phase || step.title || step.description);
    const sanitizedFeedbacks = feedbacks.filter((f) => f.name.trim() || f.text.trim());
    const sanitizedReelSection: ProjectReelSection = {
      enabled: reelSection.enabled,
      title: reelSection.title?.trim() || undefined,
      description: reelSection.description?.trim() || undefined,
      items: normalizeReelItems(reelSection.items)
        .map((item) => ({
          ...item,
          title: item.title?.trim() || undefined,
          description: item.description?.trim() || undefined,
          videoUrl: item.videoUrl.trim(),
          videoSource: normalizeVideoSource(item.videoSource, item.videoUrl),
          posterUrl: item.posterUrl?.trim() || undefined,
          autoplay: item.autoplay ?? false,
          muted: item.autoplay ? true : (item.muted ?? true),
          loop: item.loop ?? true,
        }))
        .filter((item) => item.videoUrl || item.title || item.description || item.posterUrl),
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
      section_visibility: { ...sectionVisibility, reel: reelSection.enabled || sectionVisibility.reel },
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
    <div className="portfolio-form-container flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 border-b border-[#1E2D47] pb-4 sm:flex-row sm:items-center sm:justify-between">
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

      {categorySuccessMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-2.5 rounded-md text-xs flex items-center gap-2">
          <span className="font-semibold">Success:</span> {categorySuccessMsg}
        </div>
      )}

      {/* Main Form Layout */}
      <form onSubmit={handleSave} className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left Form Content */}
        <div className="min-w-0 space-y-6 xl:col-span-2">
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
                            className="hover:bg-[#1E2D47] focus:bg-[#1E2D47] pr-2"
                          >
                            <span className="flex w-full min-w-0 items-center justify-between gap-2">
                              <span className="truncate">{c.name}</span>
                              {!isReservedCategory(c) && (
                                <button
                                  type="button"
                                  aria-label={`Delete ${c.name}`}
                                  onClick={(event) => openDeleteCategoryDialog(c, event)}
                                  onPointerDown={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                  }}
                                  className="ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </span>
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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

          {/* Section 3: Project Detail Sections */}
          <Card className="border-[#1E2D47] bg-[#0F1629] p-6 space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#1E2D47] pb-3">
              Project Detail Sections
            </h2>
            <div className="portfolio-section-grid grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionCard title="Overview" enabled={sectionVisibility.overview} onToggle={(checked) => setSectionEnabled("overview", checked)} summary={sectionHasContent("overview", { overviewTitle, desc, challenge, approach, impact, compliance, processSteps, stats, galleryUrls, reelSection, videoType, videoUrl }) ? "Overview copy and detail cards saved" : "No overview content yet"} buttonLabel="Edit Overview" onEdit={() => openSectionDialog("overview")} />
              <SectionCard title="From Discovery to Deployment" enabled={sectionVisibility.process} onToggle={(checked) => setSectionEnabled("process", checked)} summary={`${processSteps.filter((step) => [step.phase, step.title, step.description].some(textHasContent)).length} process steps saved`} buttonLabel="Edit Process" onEdit={() => openSectionDialog("process")} />
              <SectionCard title="Impact / Key Results" enabled={sectionVisibility.impact} onToggle={(checked) => setSectionEnabled("impact", checked)} summary={`${stats.filter((stat) => [stat.num, stat.label, stat.before, stat.after].some(textHasContent)).length} result cards saved`} buttonLabel="Edit Impact" onEdit={() => openSectionDialog("impact")} />
              <SectionCard title="Gallery" enabled={sectionVisibility.gallery} onToggle={(checked) => setSectionEnabled("gallery", checked)} summary={`${galleryUrls.filter(Boolean).length} gallery images saved`} buttonLabel="Edit Gallery" onEdit={() => openSectionDialog("gallery")} />
              <SectionCard title="Project Reel" enabled={sectionVisibility.reel || reelSection.enabled} onToggle={(checked) => setSectionEnabled("reel", checked)} summary={`${reelSection.items.filter((item) => item.videoUrl).length} reel${reelSection.items.filter((item) => item.videoUrl).length === 1 ? "" : "s"} configured`} buttonLabel="Edit Reels" onEdit={() => openSectionDialog("reel")} />
              <SectionCard title="Video Showcase" enabled={sectionVisibility.videoShowcase} onToggle={(checked) => setSectionEnabled("videoShowcase", checked)} summary={videoUrl ? `${VIDEO_SOURCE_OPTIONS.find((option) => option.value === videoType)?.label || "Video"} configured` : "No showcase video yet"} buttonLabel="Edit Video" onEdit={() => openSectionDialog("videoShowcase")} />
              <SectionCard title="Related Projects" enabled={sectionVisibility.relatedProjects} onToggle={(checked) => setSectionEnabled("relatedProjects", checked)} summary="Related project selection is not configured in this backend yet" buttonLabel="Edit Related" onEdit={() => openSectionDialog("relatedProjects")} />
            </div>
            <p className="text-[11px] text-slate-500">Disabled sections keep their saved content but are omitted from the public project payload.</p>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="min-w-0 space-y-6">
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
                      <Input placeholder="Value (e.g. 3.8x)" value={stat.num} onChange={(e) => handleUpdateStat(index, "num", e.target.value)} className="border-[#1E2D47] bg-[#07090F] text-white text-[11px] h-8 font-mono" />
                      <Input placeholder="Label" value={stat.label} onChange={(e) => handleUpdateStat(index, "label", e.target.value)} className="border-[#1E2D47] bg-[#07090F] text-white text-[11px] h-8" />
                      <Input placeholder="Before (optional)" value={stat.before || ""} onChange={(e) => handleUpdateStat(index, "before", e.target.value)} className="border-[#1E2D47] bg-[#07090F] text-white text-[11px] h-8" />
                      <Input placeholder="After (optional)" value={stat.after || ""} onChange={(e) => handleUpdateStat(index, "after", e.target.value)} className="border-[#1E2D47] bg-[#07090F] text-white text-[11px] h-8" />
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



      <PortfolioSectionDialog
        open={Boolean(categoryToDelete)}
        title="Delete Portfolio Category"
        description={categoryToDelete ? (getCategoryUsageCount(categoryToDelete.slug) > 0 ? `${getCategoryUsageCount(categoryToDelete.slug)} project${getCategoryUsageCount(categoryToDelete.slug) === 1 ? " is" : "s are"} using this category. Choose how to handle them before deleting.` : `Delete the category ‘${categoryToDelete.name}’? This action cannot be undone.`) : "Confirm category deletion."}
        onCancel={closeDeleteCategoryDialog}
        onSave={handleDeleteCategory}
        saveLabel={isDeletingCategory ? "Deleting..." : "Delete Category"}
      >
        {categoryToDelete && (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              <p className="font-semibold">Delete “{categoryToDelete.name}”?</p>
              <p className="mt-1 text-xs text-red-200/80">This action cannot be undone.</p>
            </div>

            {getCategoryUsageCount(categoryToDelete.slug) > 0 ? (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-300">Move affected projects to</Label>
                <Select value={replacementCategoryId} onValueChange={(value) => setReplacementCategoryId(value || "")}>
                  <SelectTrigger className="border-[#1E2D47] bg-[#07090F] text-white">
                    <SelectValue placeholder="Select replacement category" />
                  </SelectTrigger>
                  <SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white">
                    {categories.filter((item) => item.id !== categoryToDelete.id && !isReservedCategory(item)).map((item) => (
                      <SelectItem key={item.id} value={item.id} className="hover:bg-[#1E2D47] focus:bg-[#1E2D47]">
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-500">Projects use the category slug in their <code>cat</code> field, so they must be reassigned before deletion.</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No projects currently use this category.</p>
            )}
          </div>
        )}
      </PortfolioSectionDialog>

      <PortfolioSectionDialog
        open={activeDialog === "overview"}
        title="Edit Overview Section"
        description="Edit the long-form overview, project details, and overview cards without crowding the main form."
        onCancel={closeSectionDialog}
        onSave={saveOverviewDraft}
        saveLabel="Save Overview"
      >
        {overviewDraft && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(["overviewTitle", "client", "industry", "year", "tagsInput"] as const).map((field) => (
              <div key={field} className={field === "overviewTitle" || field === "tagsInput" ? "space-y-1.5 md:col-span-2" : "space-y-1.5"}>
                <Label className="text-xs font-semibold text-slate-300">{{ overviewTitle: "Section Title", client: "Client", industry: "Industry", year: "Year", tagsInput: "Services / Technologies / Tags" }[field]}</Label>
                <Input value={overviewDraft[field]} onChange={(e) => setOverviewDraft({ ...overviewDraft, [field]: e.target.value })} className="border-[#1E2D47] bg-[#07090F] text-white text-xs" />
              </div>
            ))}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-slate-300">Main Description</Label>
              <Textarea value={overviewDraft.desc} onChange={(e) => setOverviewDraft({ ...overviewDraft, desc: e.target.value })} className="border-[#1E2D47] bg-[#07090F] text-white text-xs min-h-[180px] leading-relaxed" />
            </div>
            {(["challenge", "approach", "impact", "compliance"] as const).map((field) => (
              <div key={field} className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">{{ challenge: "The Challenge", approach: "Our Approach", impact: "The Impact", compliance: "Compliance / Note" }[field]}</Label>
                <Textarea value={overviewDraft[field]} onChange={(e) => setOverviewDraft({ ...overviewDraft, [field]: e.target.value })} className="border-[#1E2D47] bg-[#07090F] text-white text-xs min-h-[140px]" />
              </div>
            ))}
          </div>
        )}
      </PortfolioSectionDialog>

      <PortfolioSectionDialog open={activeDialog === "process"} title="Edit From Discovery to Deployment" description="Add, duplicate, reorder, and edit process steps. Empty drafts are ignored on save." onCancel={closeSectionDialog} onSave={saveProcessDraft} saveLabel="Save Process">
        {sectionError && <p className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{sectionError}</p>}
        <div className="flex justify-end"><Button type="button" onClick={addProcessDraftStep} className="bg-[#1E2D47] hover:bg-[#2D3E5D] text-slate-200 text-xs">Add Step</Button></div>
        <div className="space-y-3">
          {processDraft.length === 0 ? <p className="text-xs text-slate-500 italic">No process steps yet.</p> : processDraft.map((step, index) => {
            const stepId = step.id || String(index);
            const expanded = expandedProcessSteps[stepId] ?? true;
            return (
              <div key={stepId} className="rounded-lg border border-[#1E2D47] bg-[#07090F]/60 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={() => setExpandedProcessSteps((current) => ({ ...current, [stepId]: !expanded }))} className="text-left text-xs font-semibold text-white">Step {index + 1} — {step.title || step.phase || "Untitled"}</button>
                  <div className="flex flex-wrap gap-1.5">
                    <Button type="button" size="sm" onClick={() => moveProcessDraftStep(index, -1)} disabled={index === 0} className="h-7 bg-[#141B2D] text-[10px]"><ArrowUp className="h-3 w-3" />Up</Button>
                    <Button type="button" size="sm" onClick={() => moveProcessDraftStep(index, 1)} disabled={index === processDraft.length - 1} className="h-7 bg-[#141B2D] text-[10px]"><ArrowDown className="h-3 w-3" />Down</Button>
                    <Button type="button" size="sm" onClick={() => duplicateProcessDraftStep(stepId)} className="h-7 bg-[#141B2D] text-[10px]"><Copy className="h-3 w-3" />Duplicate</Button>
                    <Button type="button" size="sm" onClick={() => removeProcessDraftStep(stepId)} className="h-7 bg-red-600 text-[10px]">Delete</Button>
                  </div>
                </div>
                {expanded && <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input placeholder="Phase (e.g. Phase 01 · Weeks 1–4)" value={step.phase} onChange={(e) => updateProcessDraftStep(stepId, "phase", e.target.value)} className="border-[#1E2D47] bg-[#07090F] text-white text-xs" />
                  <Input placeholder="Title" value={step.title} onChange={(e) => updateProcessDraftStep(stepId, "title", e.target.value)} className="border-[#1E2D47] bg-[#07090F] text-white text-xs" />
                  <Textarea placeholder="Description" value={step.description} onChange={(e) => updateProcessDraftStep(stepId, "description", e.target.value)} className="border-[#1E2D47] bg-[#07090F] text-white text-xs min-h-[140px] md:col-span-2" />
                  <Input placeholder="Icon / metadata (optional)" value={step.icon || ""} onChange={(e) => updateProcessDraftStep(stepId, "icon", e.target.value)} className="border-[#1E2D47] bg-[#07090F] text-white text-xs md:col-span-2" />
                </div>}
              </div>
            );
          })}
        </div>
      </PortfolioSectionDialog>

      <PortfolioSectionDialog open={activeDialog === "impact"} title="Edit Impact / Key Results" description="Manage public impact metric cards." onCancel={closeSectionDialog} onSave={closeSectionDialog} saveLabel="Done">
        <div className="flex justify-end"><Button type="button" onClick={handleAddStat} className="bg-[#1E2D47] text-xs">Add Result</Button></div>
        <div className="space-y-3">{stats.map((stat, index) => <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded border border-[#1E2D47] bg-[#07090F]/50 p-3"><Input placeholder="Value" value={stat.num} onChange={(e) => handleUpdateStat(index, "num", e.target.value)} className="border-[#1E2D47] bg-[#07090F] text-white text-xs" /><Input placeholder="Label" value={stat.label} onChange={(e) => handleUpdateStat(index, "label", e.target.value)} className="border-[#1E2D47] bg-[#07090F] text-white text-xs" /><Input placeholder="Before" value={stat.before || ""} onChange={(e) => handleUpdateStat(index, "before", e.target.value)} className="border-[#1E2D47] bg-[#07090F] text-white text-xs" /><Input placeholder="After" value={stat.after || ""} onChange={(e) => handleUpdateStat(index, "after", e.target.value)} className="border-[#1E2D47] bg-[#07090F] text-white text-xs" /><Button type="button" onClick={() => handleRemoveStat(index)} className="bg-red-600 text-xs md:col-span-2">Remove</Button></div>)}</div>
      </PortfolioSectionDialog>

      <PortfolioSectionDialog open={activeDialog === "gallery"} title="Edit Gallery Section" description="Upload and arrange project gallery media." onCancel={closeSectionDialog} onSave={closeSectionDialog} saveLabel="Done">
        <input type="file" accept="image/*" multiple id="gallery-upload-dialog" className="hidden" onChange={handleGalleryUpload} disabled={isUploadingGallery} />
        <Button type="button" onClick={() => document.getElementById('gallery-upload-dialog')?.click()} disabled={isUploadingGallery} className="bg-[#1E2D47] text-xs"><Upload className="h-3 w-3" />Upload Gallery Images</Button>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{galleryUrls.map((url, i) => <div key={`${url}-${i}`} className="relative aspect-video overflow-hidden rounded border border-[#1E2D47]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Gallery ${i + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => handleRemoveGalleryImage(i)} className="absolute right-1 top-1 rounded bg-red-600 p-1 text-white"><Trash2 className="h-3 w-3" /></button></div>)}</div>
      </PortfolioSectionDialog>

      <PortfolioSectionDialog open={activeDialog === "reel"} title="Edit Project Reels" description="Manage multiple project reels. Save Reels applies the draft to the main Portfolio form; Cancel discards draft changes." onCancel={closeSectionDialog} onSave={saveReelDraft} saveLabel="Save Reels">
        {reelDraft && (
          <div className="space-y-5">
            {reelValidationErrors.__section && <p className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{reelValidationErrors.__section}</p>}
            <div className="rounded-lg border border-[#1E2D47] bg-[#07090F]/50 p-4 space-y-3">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300">
                <input type="checkbox" checked={reelDraft.enabled} onChange={(event) => updateReelDraft((draft) => ({ ...draft, enabled: event.target.checked }))} className="h-4 w-4 accent-[#0EA5E9]" />
                Show Reel Section
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input value={reelDraft.title || ""} onChange={(event) => updateReelDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="Section title, e.g. Project Reels" className="border-[#1E2D47] bg-[#07090F] text-white text-xs" />
                <Input value={reelDraft.description || ""} onChange={(event) => updateReelDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Section description" className="border-[#1E2D47] bg-[#07090F] text-white text-xs" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">Reels</h3>
              <Button type="button" onClick={addReelDraftItem} className="bg-[#1E2D47] text-xs">Add Reel</Button>
            </div>
            {reelDraft.items.length === 0 ? <p className="text-xs text-slate-500 italic">No reels yet. Add a Reel to upload or paste a video link.</p> : (
              <div className="space-y-4">
                {reelDraft.items.map((item, index) => {
                  const uploadState = reelUploadState[item.id] || { videoUploading: false, posterUploading: false };
                  return (
                    <div key={item.id} className="rounded-lg border border-[#1E2D47] bg-[#07090F]/50 p-4 space-y-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300">
                          <input type="checkbox" checked={item.enabled} onChange={(event) => updateReelDraftItem(item.id, (current) => ({ ...current, enabled: event.target.checked }))} className="h-4 w-4 accent-[#0EA5E9]" />
                          Reel {index + 1} {item.title ? `— ${item.title}` : ""}
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          <Button type="button" size="sm" onClick={() => moveReelDraftItem(index, -1)} disabled={index === 0} className="h-7 bg-[#141B2D] text-[10px]"><ArrowUp className="h-3 w-3" />Up</Button>
                          <Button type="button" size="sm" onClick={() => moveReelDraftItem(index, 1)} disabled={index === reelDraft.items.length - 1} className="h-7 bg-[#141B2D] text-[10px]"><ArrowDown className="h-3 w-3" />Down</Button>
                          <Button type="button" size="sm" onClick={() => duplicateReelDraftItem(item.id)} className="h-7 bg-[#141B2D] text-[10px]"><Copy className="h-3 w-3" />Duplicate</Button>
                          <Button type="button" size="sm" onClick={() => removeReelDraftItem(item.id)} className="h-7 bg-red-600 text-[10px]">Delete</Button>
                        </div>
                      </div>
                      {reelValidationErrors[item.id] && <p className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{reelValidationErrors[item.id]}</p>}
                      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px] gap-4">
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input value={item.title || ""} onChange={(event) => updateReelDraftItem(item.id, (current) => ({ ...current, title: event.target.value }))} placeholder="Reel title" className="border-[#1E2D47] bg-[#07090F] text-white text-xs" />
                            <Input value={item.posterUrl || ""} onChange={(event) => updateReelDraftItem(item.id, (current) => ({ ...current, posterUrl: event.target.value }))} placeholder="Poster image URL" className="border-[#1E2D47] bg-[#07090F] text-white text-xs" />
                            <Textarea value={item.description || ""} onChange={(event) => updateReelDraftItem(item.id, (current) => ({ ...current, description: event.target.value }))} placeholder="Description" className="border-[#1E2D47] bg-[#07090F] text-white text-xs md:col-span-2 min-h-[80px]" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Video Source</Label>
                              <Select value={normalizeVideoSource(item.videoSource, item.videoUrl)} onValueChange={(value) => updateReelDraftItem(item.id, (current) => ({ ...current, videoSource: normalizeVideoSource(value), videoUrl: value === "upload" ? current.videoUrl : current.videoUrl }))}>
                                <SelectTrigger className="border-[#1E2D47] bg-[#07090F] text-white"><SelectValue placeholder="Video Source" /></SelectTrigger>
                                <SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white">
                                  {VIDEO_SOURCE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            {normalizeVideoSource(item.videoSource, item.videoUrl) !== "upload" && (
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{VIDEO_SOURCE_OPTIONS.find((option) => option.value === normalizeVideoSource(item.videoSource, item.videoUrl))?.urlLabel || "Video URL"}</Label>
                                <Input value={item.videoUrl || ""} onChange={(event) => updateReelDraftItem(item.id, (current) => ({ ...current, videoUrl: event.target.value }))} placeholder="https://..." className="border-[#1E2D47] bg-[#07090F] text-white text-xs font-mono" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" id={`reel-video-upload-${item.id}`} className="hidden" onChange={(event) => handleReelItemVideoUpload(item.id, event)} disabled={uploadState.videoUploading} />
                            {normalizeVideoSource(item.videoSource, item.videoUrl) === "upload" && <Button type="button" onClick={() => document.getElementById(`reel-video-upload-${item.id}`)?.click()} disabled={uploadState.videoUploading} className="bg-[#1E2D47] text-xs">{uploadState.videoUploading ? "Uploading video..." : item.videoUrl ? "Replace Video" : "Upload Video"}</Button>}
                            {item.videoUrl && <Button type="button" onClick={() => updateReelDraftItem(item.id, (current) => ({ ...current, videoUrl: "" }))} className="bg-red-600 hover:bg-red-700 text-white text-xs"><Trash2 className="h-3 w-3" />Clear Video</Button>}
                            <input type="file" accept="image/*" id={`reel-poster-upload-${item.id}`} className="hidden" onChange={(event) => handleReelItemPosterUpload(item.id, event)} disabled={uploadState.posterUploading} />
                            <Button type="button" onClick={() => document.getElementById(`reel-poster-upload-${item.id}`)?.click()} disabled={uploadState.posterUploading} className="bg-[#1E2D47] text-xs">{uploadState.posterUploading ? "Uploading poster..." : "Upload Poster"}</Button>
                          </div>
                          <div className="flex flex-wrap gap-3 rounded-md border border-[#1E2D47] bg-[#07090F]/50 p-3">
                            {[{label: "Autoplay", checked: item.autoplay ?? false, key: "autoplay" as const}, {label: "Muted", checked: item.autoplay ? true : (item.muted ?? true), key: "muted" as const, disabled: item.autoplay}, {label: "Loop", checked: item.loop ?? true, key: "loop" as const}].map((control) => (
                              <label key={control.label} className="inline-flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={control.checked} disabled={control.disabled} onChange={(event) => updateReelDraftItem(item.id, (current) => ({ ...current, [control.key]: event.target.checked, muted: control.key === "autoplay" && event.target.checked ? true : current.muted }))} className="h-4 w-4 accent-[#0EA5E9]" />{control.label}</label>
                            ))}
                          </div>
                        </div>
                        <div className="mx-auto w-full max-w-[220px]">
                          <Label className="mb-2 block text-xs font-semibold text-slate-300">Preview</Label>
                          <VideoPreview source={normalizeVideoSource(item.videoSource, item.videoUrl)} videoUrl={item.videoUrl} posterUrl={item.posterUrl} autoplay={item.autoplay} muted={item.muted} loop={item.loop} aspectClassName="aspect-[9/16]" emptyText="Choose a source and add or upload a reel video." />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </PortfolioSectionDialog>

      <PortfolioSectionDialog open={activeDialog === "videoShowcase"} title="Edit Video Showcase" description="Configure the project showcase video." onCancel={closeSectionDialog} onSave={closeSectionDialog} saveLabel="Done">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Video Source</Label>
                <Select value={videoType} onValueChange={(value) => setVideoType(normalizeVideoSource(value))}>
                  <SelectTrigger className="border-[#1E2D47] bg-[#07090F] text-white"><SelectValue placeholder="Video Source" /></SelectTrigger>
                  <SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white">
                    {VIDEO_SOURCE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {videoType !== "upload" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">{VIDEO_SOURCE_OPTIONS.find((option) => option.value === videoType)?.urlLabel || "Video URL"}</Label>
                  <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." className="border-[#1E2D47] bg-[#07090F] text-white text-xs font-mono" />
                </div>
              )}
            </div>
            <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" id="video-upload-dialog" className="hidden" onChange={handleVideoUpload} disabled={isUploadingVideo} />
            {videoType === "upload" && (
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" onClick={() => document.getElementById('video-upload-dialog')?.click()} disabled={isUploadingVideo} className="bg-[#1E2D47] text-xs">{isUploadingVideo ? "Uploading video..." : videoUrl ? "Replace Video" : "Upload Video"}</Button>
                {videoUrl && <Button type="button" onClick={() => setVideoUrl("")} className="bg-red-600 hover:bg-red-700 text-white text-xs"><Trash2 className="h-3 w-3" />Clear Video</Button>}
                <span className="text-[11px] text-slate-500">MP4, MOV, WEBM, or M4V.</span>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <Label className="mb-2 block text-xs font-semibold text-slate-300">Preview</Label>
            <VideoPreview source={videoType} videoUrl={videoUrl} emptyText="Choose a source and add or upload a showcase video." />
          </div>
        </div>
      </PortfolioSectionDialog>

      <PortfolioSectionDialog open={activeDialog === "relatedProjects"} title="Edit Related Projects" description="This project schema does not currently include related-project selections; the visibility setting is saved for forward compatibility." onCancel={closeSectionDialog} onSave={closeSectionDialog} saveLabel="Done"><p className="text-xs text-slate-400">No related project picker is available in the existing API, so this dialog preserves the section toggle without adding new routes or backend modules.</p></PortfolioSectionDialog>

    </div>
  );
}

function VideoPreview({ source, videoUrl, posterUrl, autoplay, muted, loop, aspectClassName = "aspect-video", emptyText }: { source: ProjectVideoSource; videoUrl?: string; posterUrl?: string; autoplay?: boolean; muted?: boolean; loop?: boolean; aspectClassName?: string; emptyText: string }) {
  const url = videoUrl?.trim() || "";
  const frameClassName = `${aspectClassName} w-full overflow-hidden rounded-2xl border border-[#1E2D47] bg-black`;

  if (!url) {
    return <div className={`${frameClassName} flex items-center justify-center px-4 text-center text-xs text-slate-500`}>{emptyText}</div>;
  }

  if (source === "youtube") {
    return (
      <iframe
        src={getYoutubeEmbedUrl(url)}
        title="YouTube video preview"
        className={frameClassName}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  if (source === "vimeo") {
    return (
      <iframe
        src={getVimeoEmbedUrl(url)}
        title="Vimeo video preview"
        className={frameClassName}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (source === "external" && !/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className={`${frameClassName} flex flex-col items-center justify-center gap-3 px-4 text-center text-xs text-slate-400 hover:text-white`}>
        <LinkIcon className="h-8 w-8 text-[#38BDF8]" />
        <span className="break-all">Open external video preview</span>
      </a>
    );
  }

  return (
    <video
      src={url}
      poster={posterUrl || undefined}
      controls
      muted={autoplay || muted}
      loop={loop}
      preload="metadata"
      className={`${frameClassName} object-cover`}
    />
  );
}

function SectionCard({ title, enabled, summary, buttonLabel, onToggle, onEdit }: { title: string; enabled: boolean; summary: string; buttonLabel: string; onToggle: (checked: boolean) => void; onEdit: () => void }) {
  const inputId = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="portfolio-section-card rounded-lg border border-[#1E2D47] bg-[#07090F]/50 p-4 space-y-3">
      <div className="portfolio-section-card-header flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="portfolio-section-card-summary mt-1 text-xs text-slate-500">{summary}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${enabled ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-400"}`}><Eye className="h-3 w-3" />{enabled ? "Shown" : "Hidden"}</span>
      </div>
      <div className="portfolio-section-card-actions flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor={inputId} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
          <input id={inputId} type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} className="h-4 w-4 rounded border-[#1E2D47] bg-[#07090F] accent-[#0EA5E9]" />
          Show {title} Section
        </label>
        <Button type="button" onClick={onEdit} className="bg-[#1E2D47] hover:bg-[#2D3E5D] text-slate-200 text-xs h-8 cursor-pointer">{buttonLabel}</Button>
      </div>
    </div>
  );
}

function PortfolioSectionDialog({ open, title, description, children, saveLabel, onCancel, onSave }: { open: boolean; title: string; description: string; children: React.ReactNode; saveLabel: string; onCancel: () => void; onSave: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onCancel(); }}>
      <DialogContent className="portfolio-section-dialog grid gap-0 border border-[#1E2D47] bg-[#0F1629] p-0 text-white shadow-2xl sm:max-w-none" showCloseButton>
        <DialogHeader className="portfolio-section-dialog-header border-b border-[#1E2D47] bg-[#0F1629]">
          <DialogTitle className="portfolio-section-dialog-title text-base font-bold text-white">{title}</DialogTitle>
          <DialogDescription className="portfolio-section-dialog-description text-xs text-slate-400">{description}</DialogDescription>
        </DialogHeader>
        <div className="portfolio-section-dialog-body space-y-4">
          {children}
        </div>
        <DialogFooter className="portfolio-section-dialog-footer border-t border-[#1E2D47] bg-[#0F1629]">
          <Button type="button" variant="outline" onClick={onCancel} className="border-[#1E2D47] text-slate-300 hover:bg-[#1E2D47]">Cancel</Button>
          <Button type="button" onClick={onSave} className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white">{saveLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
