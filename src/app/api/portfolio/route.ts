import { getWorkspaceService, Project, ProjectCategory, JsonRecord } from "@/lib/services/api";

export const dynamic = "force-dynamic";

type CorsHeaders = Record<string, string>;

const getAllowedOrigin = (requestOrigin: string | null) => {
  const configuredOrigin = process.env.PUBLIC_FRONTEND_ORIGIN;

  if (configuredOrigin) return configuredOrigin;

  if (process.env.NODE_ENV !== "production" && requestOrigin?.startsWith("http://localhost")) {
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

    return Response.json(
      {
        success: true,
        data: {
          projects: projects
            .filter((project) => project.status !== "draft")
            .map(toPublicProject),
          categories: categories.map(toPublicCategory),
          siteSettings,
          clientLogos,
          impactNumbers,
          socialLinks,
        },
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
      },
      { status: 500, headers }
    );
  }
}
