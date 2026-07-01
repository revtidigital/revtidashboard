import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase URL / service role key");

const DRY = process.argv.includes("--dry");
const tasks = JSON.parse(readFileSync(join(root, "scripts", "regfin_tasks.json"), "utf8"));

const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
async function rest(path, opts = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${res.status} ${path} :: ${text}`);
  return body;
}

const PROJECT_NAME = "IC RegFin Legal";
const dates = tasks.map((t) => t.date).sort();

// 1. find or create the RegFin project
let project = (await rest(`pm_projects?select=id,name&name=ilike.*regfin*`))[0];
if (!project) {
  if (DRY) { project = { id: "<dry>", name: PROJECT_NAME }; console.log(`[dry] would create project '${PROJECT_NAME}'`); }
  else {
    project = (await rest(`pm_projects`, { method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ name: PROJECT_NAME, client: "IC RegFin Legal", description: "Design & website deliverables log.",
        status: "active", view_mode: "list", start_date: dates[0], end_date: dates[dates.length - 1] }) }))[0];
    console.log("Created project:", project.name);
  }
}
console.log("Project:", project.name, project.id);

// 2. probe column
try { await rest(`pm_tasks?select=time_taken_minutes&limit=1`); }
catch (e) {
  console.error("\n⚠️  time_taken_minutes column likely missing. Run in Supabase SQL editor:\n");
  console.error("  ALTER TABLE pm_tasks ADD COLUMN time_taken_minutes INTEGER CHECK (time_taken_minutes IS NULL OR time_taken_minutes >= 0);\n");
  console.error(String(e));
  process.exit(2);
}

// 3. get or create workstream
let ws = (await rest(`pm_workstreams?select=id,name&project_id=eq.${project.id}&order=sequence&limit=1`))[0];
if (!ws) {
  if (DRY) { ws = { id: "<dry>" }; console.log("[dry] would create workstream 'Tasks'"); }
  else {
    ws = (await rest(`pm_workstreams`, { method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ project_id: project.id, name: "Tasks", description: null, color: "#0EA5E9", sequence: 0, start_date: null, end_date: null }) }))[0];
  }
}
console.log("Workstream:", ws.id);

// 4. build + insert
const rows = tasks.map((t, i) => ({
  workstream_id: ws.id, project_id: project.id, title: t.title,
  description: t.note || null, status: "done", assignee: null,
  start_date: t.date, due_date: t.date, progress: 100,
  time_taken_minutes: t.minutes, sequence: i,
}));
const totalMin = rows.reduce((s, r) => s + r.time_taken_minutes, 0);
console.log(`\n${rows.length} tasks, total ${totalMin} min (${(totalMin / 60).toFixed(1)} hrs)`);

if (DRY) { console.log("[dry] nothing inserted."); process.exit(0); }
const ins = await rest(`pm_tasks`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(rows) });
console.log(`✅ Inserted ${ins.length} tasks into ${project.name}.`);
