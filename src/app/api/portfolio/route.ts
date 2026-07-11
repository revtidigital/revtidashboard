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

const getRelatedProjects = (project: Project, projects: Project[]) => {
  const tags = new Set(project.tags || []);

  return null;
};

const toLegacyFrontendProject = (project: Project, categories: ProjectCategory[], projects: Project[]) => {
  const industry = getCategoryName(project, categories);
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
    overview: compactObject({
      title: trim(project.overview_title) || trim(project.headline),
      body: trim(project.desc),
      cards: overviewCards,
    }),
    process: (project.process || []).filter((step) => step.phase || step.title || step.description),
    brandShowcase: (project.gallery || []).filter(Boolean),
    impactResults: (project.stats || [])
      .filter((stat) => stat.num || stat.label || stat.before || stat.after)
      .map((stat) => compactObject({
        label: trim(stat.label),
        value: trim(stat.num),
        before: trim(stat.before),
        after: trim(stat.after),
      })),
    video: project.video_type && project.video_type !== "none" && project.video_url
      ? { type: project.video_type, url: project.video_url }
      : undefined,
    relatedWork: getRelatedProjects(project, projects),
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
