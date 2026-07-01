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

// quarterly dates starting today (2026-07-01), every 3 months, 4 occurrences
function quarters(startISO, n) {
  const out = [];
  const [y, m, d] = startISO.split("-").map(Number);
  for (let i = 0; i < n; i++) {
    const dt = new Date(Date.UTC(y, m - 1 + i * 3, d));
    out.push(dt.toISOString().slice(0, 10));
  }
  return out;
}
const dates = quarters("2026-07-01", 4);

async function ensureProject(name, client) {
  let p = (await rest(`pm_projects?select=id,name&name=ilike.*${encodeURIComponent(name)}*`))[0];
  if (!p) {
    p = (await rest(`pm_projects`, { method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ name, client, description: "Recurring quarterly maintenance.", status: "active",
        view_mode: "list", start_date: dates[0], end_date: dates[dates.length - 1] }) }))[0];
    console.log("Created project:", p.name);
  } else console.log("Found project:", p.name);
  return p;
}

async function ensureWorkstream(projectId) {
  let ws = (await rest(`pm_workstreams?select=id&project_id=eq.${projectId}&order=sequence&limit=1`))[0];
  if (!ws) {
    ws = (await rest(`pm_workstreams`, { method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ project_id: projectId, name: "Maintenance", description: null, color: "#10B981", sequence: 0, start_date: null, end_date: null }) }))[0];
  }
  return ws;
}

async function addMaintenance(project) {
  const ws = await ensureWorkstream(project.id);
  const existing = (await rest(`pm_tasks?select=sequence&workstream_id=eq.${ws.id}&order=sequence.desc&limit=1`))[0];
  const base = existing ? existing.sequence + 1 : 0;
  const rows = dates.map((dt, i) => ({
    workstream_id: ws.id, project_id: project.id,
    title: `Quarterly Maintenance — ${new Date(dt + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}`,
    description: "Recurring maintenance every 3 months.",
    status: "not_started", assignee: null, start_date: dt, due_date: dt,
    progress: 0, time_taken_minutes: null, sequence: base + i,
  }));
  const ins = await rest(`pm_tasks`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(rows) });
  console.log(`  + ${ins.length} maintenance tasks (${dates.join(", ")})`);
}

const rossell = await ensureProject("Rossell India", "Rossell India");
await addMaintenance(rossell);
const sparked = await ensureProject("Sparked", "Sparked");
await addMaintenance(sparked);
console.log("✅ Done.");
