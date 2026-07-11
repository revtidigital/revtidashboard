import { NextResponse } from "next/server";

const ALLOWED_TAGS = new Set([
  "portfolio",
  "project-categories",
  "site-settings",
  "client-logos",
  "impact-numbers",
  "social-links",
  "site-content",
]);

const normalizeTags = (input: unknown): string[] => {
  const rawTags = Array.isArray(input) ? input : typeof input === "string" ? [input] : [];
  return Array.from(new Set(rawTags.filter((tag): tag is string => typeof tag === "string" && ALLOWED_TAGS.has(tag))));
};

export async function POST(request: Request) {
  let tags: string[] = [];

  try {
    const body = await request.json().catch(() => ({}));
    tags = normalizeTags(body.tags ?? body.tag);

    if (tags.length === 0) {
      return NextResponse.json({ success: false, error: "No valid revalidation tags supplied." }, { status: 400 });
    }

    const endpoint = process.env.FRONTEND_REVALIDATE_URL;
    if (!endpoint) {
      console.warn("FRONTEND_REVALIDATE_URL is not configured; skipping frontend revalidation.");
      return NextResponse.json({ success: true, skipped: true, tags });
    }

    const secret = process.env.REVALIDATE_SECRET;
    const results = await Promise.allSettled(tags.map(async (tag) => {
      const url = new URL(endpoint);
      url.searchParams.set("tag", tag);
      if (secret) url.searchParams.set("secret", secret);

      const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
      if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        throw new Error(`Revalidation failed for ${tag}: ${response.status} ${message}`);
      }
      return tag;
    }));

    const failures = results
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => result.reason instanceof Error ? result.reason.message : String(result.reason));

    if (failures.length > 0) {
      console.error("Frontend revalidation completed with failures:", failures);
    }

    return NextResponse.json({ success: true, tags, failures });
  } catch (error) {
    console.error("Failed to request frontend revalidation:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to request frontend revalidation.", tags },
      { status: 500 }
    );
  }
}
