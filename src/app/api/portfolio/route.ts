import { getWorkspaceService, Project } from "@/lib/services/api";

const FRONTEND_ORIGIN = "https://revti-frontend-dashboard.vercel.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const dynamic = "force-dynamic";

const sortProjects = (projects: Project[]) => {
  return [...projects].sort((a, b) => {
    const aSeq = a.sequence ?? Number.MAX_SAFE_INTEGER;
    const bSeq = b.sequence ?? Number.MAX_SAFE_INTEGER;

    if (aSeq !== bSeq) return aSeq - bSeq;
    return a.title.localeCompare(b.title);
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

    return Response.json(
      {
        projects: publishedProjects,
        categories,
        source: "revti-dashboard-portfolio",
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Failed to load public portfolio data:", error);

    return Response.json(
      { projects: [], categories: [], source: "revti-dashboard-portfolio" },
      { status: 500, headers: corsHeaders }
    );
  }
}
