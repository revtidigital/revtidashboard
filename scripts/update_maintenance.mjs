import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
async function rest(path, opts = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path} :: ${text}`);
  return text ? JSON.parse(text) : null;
}

// new quarterly schedule: cycle done in May, next every 3 months
const dates = ["2026-08-01", "2026-11-01", "2027-02-01", "2027-05-01"];
const label = (dt) => new Date(dt + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });

for (const name of ["Rossell India", "Sparked"]) {
  const project = (await rest(`pm_projects?select=id,name&name=ilike.*${encodeURIComponent(name)}*`))[0];
  if (!project) { console.log("skip (not found):", name); continue; }
  const tasks = await rest(`pm_tasks?select=id,title,start_date&project_id=eq.${project.id}&title=ilike.Quarterly Maintenance*&order=start_date`);
  if (tasks.length !== dates.length) console.log(`  note: ${project.name} has ${tasks.length} maintenance tasks`);
  for (let i = 0; i < Math.min(tasks.length, dates.length); i++) {
    const dt = dates[i];
    await rest(`pm_tasks?id=eq.${tasks[i].id}`, { method: "PATCH",
      body: JSON.stringify({ title: `Quarterly Maintenance — ${label(dt)}`, start_date: dt, due_date: dt, updated_at: new Date().toISOString() }) });
  }
  console.log(`✅ ${project.name}: updated ${Math.min(tasks.length, dates.length)} tasks → ${dates.map(label).join(", ")}`);
}
