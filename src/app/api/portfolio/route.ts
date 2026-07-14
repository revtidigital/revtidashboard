import { getWorkspaceService, Project, ProjectCategory, JsonRecord } from "@/lib/services/api";

export const dynamic = "force-dynamic";

type CorsHeaders = Record<string, string>;

const DEFAULT_PUBLIC_FRONTEND_ORIGIN = "https://revti-frontend-dashboard.vercel.app";

const getAllowedOrigin = (requestOrigin: string | null) => {
  const configuredOrigins = [
    process.env.PUBLIC_FRONTEND_ORIGIN,
    DEFAULT_PUBLIC_FRONTEND_ORIGIN,
  ].filter(Boolean) as string[];

  if (requestOrigin && configuredOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  if (!requestOrigin) {
    return configuredOrigins[0] || null;
  }

  if (process.env.NODE_ENV !== "production" && requestOrigin.startsWith("http://localhost")) {
    return requestOrigin;
  }

  return null;
};

const getCorsHeaders = (requestOrigin: string | null): CorsHeaders => {
  const allowedOrigin = getAllowedOrigin(requestOrigin);
  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
};

const normalizeArray = <T>(value: T[] | null | undefined): T[] => Array.isArray(value) ? value : [];


const hasText = (value?: string | null) => Boolean(value?.trim());

const hasOverviewContent = (project: Project) => [project.overview_title, project.desc, project.challenge, project.approach, project.impact, project.compliance].some(hasText);
const hasProcessContent = (project: Project) => normalizeArray(project.process).some((step) => hasText(step.phase) || hasText(step.title) || hasText(step.description));
const hasImpactContent = (project: Project) => normalizeArray(project.stats).some((stat) => hasText(stat.num) || hasText(stat.label) || hasText(stat.before) || hasText(stat.after));
const hasGalleryContent = (project: Project) => normalizeArray(project.gallery).some(hasText);
const hasVideoShowcaseContent = (project: Project) => hasText(project.video_url);
const normalizeVideoSource = (source?: string | null, url?: string | null) => {
  if (["upload", "youtube", "vimeo", "direct", "external"].includes(source || "")) return source;
  const lowerUrl = url?.toLowerCase() || "";
  if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) return "youtube";
  if (lowerUrl.includes("vimeo.com")) return "vimeo";
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(lowerUrl)) return source === "upload" ? "upload" : "direct";
  return "external";
};

const sectionEnabled = (project: Project, key: keyof NonNullable<Project["section_visibility"]>, hasContent: boolean) => {
  const explicit = project.section_visibility?.[key];
  return typeof explicit === "boolean" ? explicit : hasContent;
};

const normalizeSectionVisibility = (project: Project) => ({
  overview: sectionEnabled(project, "overview", hasOverviewContent(project)),
  process: sectionEnabled(project, "process", hasProcessContent(project)),
  impact: sectionEnabled(project, "impact", hasImpactContent(project)),
  gallery: sectionEnabled(project, "gallery", hasGalleryContent(project)),
  reel: sectionEnabled(project, "reel", normalizeReelItems(project.reelSection).some((item) => item.enabled && hasText(item.videoUrl))),
  videoShowcase: sectionEnabled(project, "videoShowcase", Boolean(hasVideoShowcaseContent(project))),
  relatedProjects: sectionEnabled(project, "relatedProjects", false),
});

const normalizeReelItems = (reel: Project["reelSection"]) => {
  const rawItems = Array.isArray(reel?.items) && reel.items.length > 0
    ? reel.items
    : reel?.videoUrl
      ? [{
        id: `legacy-reel-${reel.videoUrl}`,
        enabled: reel.enabled === true,
        title: reel.title,
        description: reel.description,
        videoUrl: reel.videoUrl,
        videoSource: normalizeVideoSource(reel.items?.[0]?.videoSource, reel.videoUrl),
        posterUrl: reel.posterUrl,
        autoplay: reel.autoplay,
        muted: reel.muted,
        loop: reel.loop,
        displayOrder: 0,
      }]
      : [];

  return rawItems
    .map((item, index) => ({
      id: item.id || `reel-${index}`,
      enabled: item.enabled === true,
      title: item.title || undefined,
      description: item.description || undefined,
      videoUrl: item.videoUrl || "",
      videoSource: normalizeVideoSource(item.videoSource, item.videoUrl),
      posterUrl: item.posterUrl || undefined,
      autoplay: item.autoplay ?? false,
      muted: item.autoplay ? true : (item.muted ?? true),
      loop: item.loop ?? true,
      displayOrder: Number.isInteger(item.displayOrder) && item.displayOrder >= 0 ? item.displayOrder : index,
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((item, index) => ({ ...item, displayOrder: index }));
};

const normalizeReelSection = (project: Project) => {
  const reel = project.reelSection;
  const items = normalizeReelItems(reel);
  return {
    enabled: reel?.enabled === true && normalizeSectionVisibility(project).reel,
    title: reel?.title || undefined,
    description: reel?.description || undefined,
    items,
  };
};

const toPublicProject = (project: Project) => ({
  id: project.id,
  cat: project.cat,
  year: project.year,
  title: project.title,
  client: project.client,
  tagline: project.tagline,
  headline: project.headline,
  desc: project.desc,
  shortDesc: project.shortDesc,
  tags: normalizeArray(project.tags),
  thumb: project.thumb,
  gallery: normalizeArray(project.gallery),
  stats: normalizeArray(project.stats),
  feedback: normalizeArray(project.feedback),
  status: project.status,
  sequence: project.sequence,
  created_at: project.created_at,
  video_type: project.video_type,
  video_source: normalizeVideoSource(project.video_source || project.video_type, project.video_url),
  video_url: project.video_url,
  industry: project.industry,
  sprint: project.sprint,
  client_logo: project.client_logo,
  overview_title: project.overview_title,
  challenge: project.challenge,
  approach: project.approach,
  impact: project.impact,
  compliance: project.compliance,
  process: normalizeArray(project.process),
  reelSection: normalizeReelSection(project),
  section_visibility: normalizeSectionVisibility(project),
});

const toPublicCategory = (category: ProjectCategory) => ({
  id: category.id,
  name: category.name,
  slug: category.slug,
});

const trim = (value?: string | null) => value?.trim() || undefined;

const compactObject = <T extends Record<string, unknown>>(object: T) => Object.fromEntries(
  Object.entries(object).filter(([, value]) => {
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  })
);

const getCategoryName = (project: Project, categories: ProjectCategory[]) => {
  const category = categories.find((item) => item.slug === project.cat);
  return trim(project.industry) || category?.name || project.cat;
};

const getRelatedProjects = () => null;

const toLegacyFrontendProject = (project: Project, categories: ProjectCategory[], projects: Project[]) => {
  void projects;
  const industry = getCategoryName(project, categories);
  const visibility = normalizeSectionVisibility(project);
  const overviewCards = [
    { title: "The Challenge", body: trim(project.challenge) },
    { title: "Our Approach", body: trim(project.approach) },
    { title: "The Impact", body: trim(project.impact) },
    { title: "Compliance First", body: trim(project.compliance) },
  ].filter((item) => item.body);

  return compactObject({
    ...toPublicProject(project),
    slug: project.id,
    category: project.cat,
    thumbnail: trim(project.thumb),
    hero: compactObject({
      eyebrow: [project.cat, industry].filter(Boolean).join(" · "),
      client: trim(project.client),
      industry,
      year: trim(project.year),
      sprint: trim(project.sprint),
      title: trim(project.title),
      description: trim(project.tagline) || trim(project.shortDesc),
      image: trim(project.thumb),
    }),
    section_visibility: visibility,
    overview: visibility.overview && hasOverviewContent(project) ? compactObject({
      title: trim(project.overview_title) || trim(project.headline),
      body: trim(project.desc),
      cards: overviewCards,
    }) : undefined,
    process: visibility.process ? (project.process || []).filter((step) => step.phase || step.title || step.description) : undefined,
    brandShowcase: visibility.gallery ? (project.gallery || []).filter(Boolean) : undefined,
    reelSection: visibility.reel && normalizeReelSection(project).enabled && normalizeReelSection(project).items.some((item) => item.enabled && item.videoUrl)
      ? normalizeReelSection(project)
      : undefined,
    impactResults: visibility.impact ? (project.stats || [])
      .filter((stat) => stat.num || stat.label || stat.before || stat.after)
      .map((stat) => compactObject({
        label: trim(stat.label),
        value: trim(stat.num),
        before: trim(stat.before),
        after: trim(stat.after),
      })) : undefined,
    video: visibility.videoShowcase && project.video_url
      ? { type: normalizeVideoSource(project.video_source || project.video_type, project.video_url), source: normalizeVideoSource(project.video_source || project.video_type, project.video_url), url: project.video_url }
      : undefined,
    relatedWork: visibility.relatedProjects ? getRelatedProjects() : undefined,
  });
};

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request.headers.get("origin")),
  });
}

export async function GET(request: Request) {
  const headers = getCorsHeaders(request.headers.get("origin"));

  try {
    const service = getWorkspaceService();
    const [projects, categories, settingsRows, clientLogos, impactNumbers, socialLinks] = await Promise.all([
      service.getProjects(),
      service.getProjectCategories(),
      service.getSiteSettings(),
      service.getClientLogos(false),
      service.getImpactNumbers(false),
      service.getSocialLinks(false),
    ]);

    const siteSettings = settingsRows.reduce<Record<string, JsonRecord>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    const publishedProjects = projects.filter((project) => project.status !== "draft");
    const publicProjects = publishedProjects.map(toPublicProject);
    const publicCategories = categories.map(toPublicCategory);
    const legacyProjects = publishedProjects.map((project) => toLegacyFrontendProject(project, categories, publishedProjects));
    const hero = siteSettings.hero_section || {};
    const contact = siteSettings.contact_section || {};
    const numbers = impactNumbers.map((item) => ({
      value: `${item.number}${item.suffix || ""}`,
      label: item.title,
      subtext: item.short_desc || "",
    }));
    const logos = clientLogos.map((item) => ({
      name: item.client_name || "",
      logo: item.logo_image,
    }));
    const socials = socialLinks.map((item) => ({
      platform: item.platform,
      link: item.profile_url,
      icon: item.icon || "",
    }));

    return Response.json(
      {
        success: true,
        data: {
          projects: publicProjects,
          categories: publicCategories,
          siteSettings,
          clientLogos,
          impactNumbers,
          socialLinks,
        },
        // Backwards-compatible payload for the deployed public frontend.
        home: {
          hero,
          numbers,
          filters: ["All", ...categories.map((category) => category.name)],
          projects: legacyProjects,
          logos,
          contact,
          socials,
        },
        projects: legacyProjects,
        categories: publicCategories,
        source: "revti-dashboard-portfolio",
      },
      { headers }
    );
  } catch (error) {
    console.error("Failed to load public portfolio data:", error);

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load portfolio data.",
        data: {
          projects: [],
          categories: [],
          siteSettings: {},
          clientLogos: [],
          impactNumbers: [],
          socialLinks: [],
        },
        home: {
          hero: {},
          numbers: [],
          filters: ["All"],
          projects: [],
          logos: [],
          contact: {},
          socials: [],
        },
      },
      { status: 500, headers }
    );
  }
}
