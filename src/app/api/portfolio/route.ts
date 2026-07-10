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

    // 1. Dynamic Hero & Contact Sections
    let hero = {
      tagline: "Digital Agency · Est. 2018",
      heading: "We Make Digital Matter.",
      heading_highlight: "Digital",
      sub_heading: "From SEO-driven growth strategies to full-scale enterprise software — Revti Digital builds things that perform.",
      buttons: [
        { text: "View Our Work", link: "#portfolio", icon: "fa-arrow-down" },
        { text: "Start a Project", link: "#contact", icon: "fa-paper-plane" }
      ]
    };

    let contact = {
      heading: "Let's Create Something Together",
      heading_highlight: "Together",
      button: { text: "Get In Touch!", link: "mailto:hello@revtidigital.com" }
    };

    // Import Supabase client dynamically to avoid any initialization side effects
    const { supabase } = await import("@/lib/supabase");

    if (supabase) {
      try {
        const { data: settings } = await supabase.from("site_settings").select("*");
        if (settings) {
          const heroSetting = settings.find((s) => s.key === "hero_section");
          if (heroSetting && heroSetting.value) {
            hero = { ...hero, ...heroSetting.value };
          }
          const contactSetting = settings.find((s) => s.key === "contact_section");
          if (contactSetting && contactSetting.value) {
            contact = { ...contact, ...contactSetting.value };
          }
        }
      } catch (err) {
        console.warn("Failed to load site settings from Supabase, using defaults:", err);
      }
    }

    // 2. Dynamic Impact Numbers (Supports unlimited stats, adjustable boxes)
    let numbers = [
      { value: "10+", label: "Years of Experience", subtext: "Delivering results since 2018" },
      { value: "200+", label: "Clients Served", subtext: "Across 8+ industries globally" },
      { value: "50+", label: "Projects Delivered", subtext: "On time, on budget, on point" },
      { value: "8+", label: "Industries Covered", subtext: "Focused expertise across growth sectors" },
    ];

    if (supabase) {
      try {
        const { data: dbNumbers } = await supabase
          .from("impact_numbers")
          .select("*")
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("display_order", { ascending: true });
        if (dbNumbers && dbNumbers.length > 0) {
          numbers = dbNumbers.map((n) => ({
            value: `${n.number}${n.suffix || ""}`,
            label: n.title,
            subtext: n.short_desc || ""
          }));
        }
      } catch (err) {
        console.warn("Failed to load impact numbers from Supabase, using defaults:", err);
      }
    }

    // 3. Dynamic Client Logos
    let logos = clientLogos;

    if (supabase) {
      try {
        const { data: dbLogos } = await supabase
          .from("client_logos")
          .select("*")
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("display_order", { ascending: true });
        if (dbLogos && dbLogos.length > 0) {
          logos = dbLogos.map((l) => ({
            name: l.client_name || "",
            logo: l.logo_image
          }));
        }
      } catch (err) {
        console.warn("Failed to load client logos from Supabase, using defaults:", err);
      }
    }

    // 4. Dynamic Social Media Links
    let socials = [
      { platform: "Instagram", link: "#", icon: "fa-instagram" },
      { platform: "Twitter", link: "#", icon: "fa-twitter" },
      { platform: "Linkedin", link: "#", icon: "fa-linkedin" }
    ];

    if (supabase) {
      try {
        const { data: dbSocials } = await supabase
          .from("social_links")
          .select("*")
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("display_order", { ascending: true });
        if (dbSocials && dbSocials.length > 0) {
          socials = dbSocials.map((s) => ({
            platform: s.platform,
            link: s.profile_url,
            icon: s.icon || ""
          }));
        }
      } catch (err) {
        console.warn("Failed to load social links from Supabase, using defaults:", err);
      }
    }

    return Response.json(
      {
        home: {
          hero,
          numbers,
          filters: ["All", ...categories.map((category) => category.name)],
          projects: frontendProjects,
          logos,
          contact,
          socials
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
        home: {
          hero: {
            tagline: "Digital Agency · Est. 2018",
            heading: "We Make Digital Matter.",
            heading_highlight: "Digital",
            sub_heading: "From SEO-driven growth strategies to full-scale enterprise software — Revti Digital builds things that perform.",
            buttons: []
          },
          numbers: [],
          filters: ["All"],
          projects: [],
          logos: [],
          contact: {
            heading: "Let's Create Something Together",
            heading_highlight: "Together",
            button: { text: "Get In Touch!", link: "mailto:hello@revtidigital.com" }
          },
          socials: []
        },
        projects: [],
        categories: [],
        source: "revti-dashboard-portfolio",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
