import { getWorkspaceService, Project, ProjectCategory } from "@/lib/services/api";

const FRONTEND_ORIGIN = "https://revti-frontend-dashboard.vercel.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const dynamic = "force-dynamic";

type NonEmptyRecord = Record<string, unknown>;

const trim = (value?: string | null) => value?.trim() || undefined;

const compactObject = <T extends NonEmptyRecord>(object: T) => {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => {
      if (value === undefined || value === null || value === "") return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "object") return Object.keys(value).length > 0;
      return true;
    })
  );
};

const sortProjects = (projects: Project[]) => {
  return [...projects].sort((a, b) => {
    const aSeq = a.sequence ?? Number.MAX_SAFE_INTEGER;
    const bSeq = b.sequence ?? Number.MAX_SAFE_INTEGER;

    if (aSeq !== bSeq) return aSeq - bSeq;
    return a.title.localeCompare(b.title);
  });
};

const getCategoryName = (project: Project, categories: ProjectCategory[]) => {
  const category = categories.find((item) => item.slug === project.cat);
  return trim(project.industry) || category?.name || project.cat;
};

const getRelatedProjects = (project: Project, projects: Project[]) => {
  const tags = new Set(project.tags || []);

  return projects
    .filter((item) => item.id !== project.id)
    .map((item) => {
      const tagMatches = (item.tags || []).filter((tag) => tags.has(tag)).length;
      const categoryMatch = item.cat === project.cat ? 1 : 0;
      return { item, score: tagMatches + categoryMatch };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ item }) => ({
      id: item.id,
      title: item.title,
      category: item.cat,
      shortDesc: trim(item.shortDesc),
      thumb: trim(item.thumb),
      tags: item.tags || [],
    }));
};

const toFrontendProject = (project: Project, categories: ProjectCategory[], projects: Project[]) => {
  const industry = getCategoryName(project, categories);
  const overviewCards = [
    { title: "The Challenge", body: trim(project.challenge) },
    { title: "Our Approach", body: trim(project.approach) },
    { title: "The Impact", body: trim(project.impact) },
    { title: "Compliance First", body: trim(project.compliance) },
  ].filter((item) => item.body);

  return compactObject({
    id: project.id,
    slug: project.id,
    category: project.cat,
    title: trim(project.title),
    shortDesc: trim(project.shortDesc),
    tags: project.tags || [],
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

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET() {
  try {
    const service = getWorkspaceService();
    const [projects, categories] = await Promise.all([
      service.getProjects(),
      service.getProjectCategories(),
    ]);

    const publishedProjects = sortProjects(
      projects.filter((project) => project.status !== "draft")
    );
    const frontendProjects = publishedProjects.map((project) =>
      toFrontendProject(project, categories, publishedProjects)
    );
    const clientLogos = publishedProjects
      .map((project) => compactObject({
        name: trim(project.client),
        logo: trim(project.client_logo),
      }))
      .filter((logo, index, logos) =>
        Boolean(logo.name) && logos.findIndex((item) => item.name === logo.name) === index
      );

    return Response.json(
      {
        home: {
          numbers: [
            { value: `${publishedProjects.length}+`, label: "Projects Delivered" },
            { value: `${clientLogos.length}+`, label: "Clients Served" },
            { value: `${categories.length}+`, label: "Industries Covered" },
          ].filter((item) => item.value !== "0+"),
          filters: ["All", ...categories.map((category) => category.name)],
          projects: frontendProjects,
          logos: clientLogos,
        },
        projects: frontendProjects,
        categories,
        source: "revti-dashboard-portfolio",
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Failed to load public portfolio data:", error);

    return Response.json(
      {
        home: { numbers: [], filters: ["All"], projects: [], logos: [] },
        projects: [],
        categories: [],
        source: "revti-dashboard-portfolio",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
