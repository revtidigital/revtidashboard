import {
  IWorkspaceService,
  User,
  Category,
  Document,
  DocumentWithRelations,
  Assignment,
  Acknowledgement,
  DocumentView,
  ActivityLog,
  Attachment,
  DocumentAnalytics,
  DashboardStats,
  UserRole,
  Credential,
  CredentialCategory,
  TaskReminder,
  Project,
  ProjectCategory,
  PMProject,
  PMProjectDetail,
  Workstream,
  PMTask,
} from "./api";

export const MOCK_PROJECT_CATEGORIES: ProjectCategory[] = [
  { id: "c1", name: "Web Dev", slug: "web" },
  { id: "c2", name: "Mobile App", slug: "mobile" },
  { id: "c3", name: "Branding", slug: "brand" }
];

// -------------------------------------------------------------
// Seeding & Mock Initial Data
// -------------------------------------------------------------
export const MOCK_PROJECTS: Project[] = [
  {
    id: "1",
    cat: "web",
    year: "2025",
    title: "MERIDIAN",
    client: "Meridian Goods",
    tagline: "One Team, One Vision\nEvery Channel Driving Growth",
    headline: "MARKETING\nWITHOUT GAPS,\nGROWTH WITHOUT\nLIMITS",
    desc: "A headless e-commerce platform built with Next.js, delivering lightning-fast page loads and a seamless checkout experience powered by Stripe and Sanity CMS.",
    shortDesc: "A headless e-commerce platform.",
    tags: ["Next.js", "Sanity CMS", "Stripe"],
    thumb: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1400&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1400&q=85",
      "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=900&q=85",
      "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&q=85"
    ],
    stats: [
      { num: "3.8×", label: "Conversion" },
      { num: "$4M+", label: "GMV" },
      { num: "0.8s", label: "LCP" },
      { num: "99.9%", label: "Uptime" }
    ],
    feedback: [
      { name: "Sarah Holden", role: "CEO · Meridian", text: "Revti Tech completely transformed our online business. Revenue nearly doubled within six months." },
      { name: "James Park", role: "Customer", text: "The checkout flow is the smoothest I have ever used — fast, clear, zero friction." }
    ],
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "published",
    sequence: 1
  },
  {
    id: "2",
    cat: "mobile",
    year: "2025",
    title: "PETAL",
    client: "Petal Health",
    tagline: "Your Wellness,\nPersonalised Daily",
    headline: "WELLNESS\nWITHOUT\nBARRIERS",
    desc: "A mental wellness app with AI-powered mood tracking, journaling, and personalised insights built on React Native and Firebase, used by 200K+ people.",
    shortDesc: "A wellness app.",
    tags: ["React Native", "Firebase", "AI"],
    thumb: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1400&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1400&q=85",
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=900&q=85",
      "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=900&q=85"
    ],
    stats: [
      { num: "200K", label: "Users" },
      { num: "4.8★", label: "App Store" },
      { num: "68%", label: "Retention" },
      { num: "12min", label: "Session" }
    ],
    feedback: [
      { name: "Dr. Leena", role: "Clinical Advisor", text: "Remarkably sensitive design that respects the emotional nature of the content." },
      { name: "Alex T.", role: "Reviewer", text: "Finally an app that understands what wellness feels like. Stuck with it for a year." }
    ],
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: "published",
    sequence: 2
  },
  {
    id: "3",
    cat: "brand",
    year: "2024",
    title: "NOVA",
    client: "Nova Financial",
    tagline: "A Brand Built\nFor the Future",
    headline: "IDENTITY\nTHAT OPENS\nDOORS",
    desc: "A complete brand identity overhaul for a fintech firm — logo, type system, colour palette, and a 320-component design system shipped in just six weeks.",
    shortDesc: "Complete brand overhaul.",
    tags: ["Branding", "Design Systems", "Strategy"],
    thumb: "https://images.unsplash.com/photo-1634733988138-bf2c3a2a13fa?w=1400&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1634733988138-bf2c3a2a13fa?w=1400&q=85",
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=900&q=85",
      "https://images.unsplash.com/photo-1558655146-d09347e92766?w=900&q=85"
    ],
    stats: [
      { num: "42%", label: "Recall ↑" },
      { num: "320+", label: "Components" },
      { num: "6wk", label: "Delivery" },
      { num: "3", label: "Markets" }
    ],
    feedback: [
      { name: "Marcus Webb", role: "CMO · Nova", text: "It finally reflects who we are. The new identity opened doors we had been knocking on for years." },
      { name: "Priya S.", role: "Design Manager", text: "The design system alone made our team ship three times faster." }
    ],
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: "published",
    sequence: 3
  }
];

const MOCK_USERS: User[] = [
  {
    id: "user-1",
    email: "meghansh@revtidigital.com",
    full_name: "Meghansh Agarwal",
    role: "admin",
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "user-2",
    email: "aman@revtidigital.com",
    full_name: "Aman Sharma",
    role: "edit",
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "user-3",
    email: "riya@revtidigital.com",
    full_name: "Riya Patel",
    role: "view",
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_CATEGORIES: Category[] = [
  { id: "cat-1", name: "SOPs", slug: "sops", color: "#0EA5E9", created_at: new Date().toISOString() },
  { id: "cat-2", name: "Documentation", slug: "documentation", color: "#38BDF8", created_at: new Date().toISOString() },
  { id: "cat-3", name: "Training", slug: "training", color: "#22C55E", created_at: new Date().toISOString() },
  { id: "cat-4", name: "Templates", slug: "templates", color: "#3B82F6", created_at: new Date().toISOString() },
  { id: "cat-5", name: "Policies", slug: "policies", color: "#EF4444", created_at: new Date().toISOString() },
  { id: "cat-6", name: "Resources", slug: "resources", color: "#F59E0B", created_at: new Date().toISOString() },
];

const MOCK_DOCUMENTS: Document[] = [
  {
    id: "doc-1",
    title: "Client Delivery SOP",
    content: `<h1>Client Delivery Standard Operating Procedure</h1><p>This document outlines the standard workflow for handing off completed work products to Revti Digital clients.</p><div class="callout-block">💡 <strong>Important:</strong> All client deliverables must be reviewed by QA before scheduled delivery.</div><h2>Delivery Workflow</h2><ol><li>Complete final build/draft.</li><li>Request internal review via GitHub or project board.</li><li>Deliver to client using the standard Slack handoff template.</li></ol><table><thead><tr><th>Milestone</th><th>Owner</th><th>TAT</th></tr></thead><tbody><tr><td>Code Freeze</td><td>Engineering</td><td>D - 2</td></tr><tr><td>QA Verification</td><td>QA Team</td><td>D - 1</td></tr><tr><td>Client Handover</td><td>Account Manager</td><td>Due Date</td></tr></tbody></table>`,
    category_id: "cat-1",
    version: "1.2",
    status: "published",
    created_by: "user-1",
    updated_by: "user-1",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "doc-2",
    title: "Development Guidelines & Workflows",
    content: `<h1>Engineering Guidelines</h1><p>Our development ecosystem is designed to optimize code quality, maintainability, and high deployment velocity.</p><h2>Branching Strategy</h2><ul><li><strong>main</strong>: Production branch. Only merged via approved Pull Requests.</li><li><strong>develop</strong>: Staging and active integration branch.</li><li>Feature branches should follow the naming format: <code>feat/[scope]</code>.</li></ul><pre><code>git checkout -b feat/user-auth
git commit -m "feat: integrate Supabase authentication client"
git push origin feat/user-auth</code></pre>`,
    category_id: "cat-2",
    version: "2.0",
    status: "published",
    created_by: "user-2",
    updated_by: "user-2",
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "doc-3",
    title: "QA Testing Procedures",
    content: `<h1>Quality Assurance Protocols</h1><p>This is a guide for running sanity, integration, and regression checks across the workspace. Currently under draft.</p><ul data-type="taskList"><li data-checked="true"><label><input type="checkbox" checked /> Verify login flows</label></li><li><label><input type="checkbox" /> Run full regression suite</label></li><li><label><input type="checkbox" /> Validate mobile responsiveness</label></li></ul>`,
    category_id: "cat-3",
    version: "1.0",
    status: "draft",
    created_by: "user-3",
    updated_by: "user-3",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "doc-4",
    title: "Employee Leave & HR Policies",
    content: `<h1>HR Policies & Guidelines</h1><p>This policy details leaf entitlements, standard working hours, and general operational rules at Revti Digital.</p><h2>Leave Entitlements</h2><ul><li>Casual Leave: 12 days per year.</li><li>Sick Leave: 10 days per year.</li><li>Earned Leave: 15 days per year.</li></ul>`,
    category_id: "cat-5",
    version: "1.0",
    status: "published",
    created_by: "user-1",
    updated_by: "user-1",
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: "assign-1",
    document_id: "doc-1",
    assigned_to: "user-2",
    team: "Engineering",
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Please review and acknowledge standard delivery checklist.",
    assigned_by: "user-1",
    created_at: new Date().toISOString(),
  },
];

const MOCK_ACKNOWLEDGEMENTS: Acknowledgement[] = [
  {
    id: "ack-1",
    user_id: "user-3",
    document_id: "doc-1",
    acknowledged_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_VIEWS: DocumentView[] = [
  {
    id: "view-1",
    user_id: "user-1",
    document_id: "doc-1",
    view_count: 5,
    last_viewed_at: new Date().toISOString(),
  },
  {
    id: "view-2",
    user_id: "user-2",
    document_id: "doc-1",
    view_count: 2,
    last_viewed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "view-3",
    user_id: "user-3",
    document_id: "doc-1",
    view_count: 1,
    last_viewed_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "view-4",
    user_id: "user-2",
    document_id: "doc-2",
    view_count: 8,
    last_viewed_at: new Date().toISOString(),
  },
];

const MOCK_CREDENTIALS: Credential[] = [
  {
    id: "cred-1",
    label: "GoDaddy Hosting",
    category: "hosting",
    username: "revtidigital@gmail.com",
    password: "demo_password_123",
    url: "https://sso.godaddy.com",
    notes: "Main hosting account for all client sites",
    created_by: "user-1",
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "cred-2",
    label: "Vercel Account",
    category: "hosting",
    username: "revtidigital@gmail.com",
    password: "demo_vercel_token",
    url: "https://vercel.com/login",
    notes: "Used for Next.js deployments",
    created_by: "user-1",
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_REMINDERS: TaskReminder[] = [
  {
    id: "reminder-1",
    website_name: "Revti Digital Staging",
    task_type: "Website Maintenance",
    description: "Perform monthly server package updates and plugin audits.",
    interval_type: "monthly",
    interval_value: "1",
    created_by: "user-1",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

const MOCK_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: "log-1",
    user_id: "user-1",
    action: "created",
    document_id: "doc-1",
    details: "created Client Delivery SOP",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "log-2",
    user_id: "user-2",
    action: "updated",
    document_id: "doc-2",
    details: "updated Development Guidelines & Workflows",
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "log-3",
    user_id: "user-3",
    action: "acknowledged",
    document_id: "doc-1",
    details: "acknowledged Client Delivery SOP",
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
];

// Helper to interact with LocalStorage safely
class StorageManager {
  private static isBrowser = typeof window !== "undefined";

  static get<T>(key: string, defaultValue: T): T {
    if (!this.isBrowser) return defaultValue;
    const item = localStorage.getItem(key);
    if (!item) {
      this.set(key, defaultValue);
      return defaultValue;
    }
    try {
      return JSON.parse(item) as T;
    } catch {
      return defaultValue;
    }
  }

  static set<T>(key: string, value: T): void {
    if (!this.isBrowser) return;
    localStorage.setItem(key, JSON.stringify(value));
  }
}

// -------------------------------------------------------------
// Mock Service Implementation
// -------------------------------------------------------------
export class MockService implements IWorkspaceService {
  private static KEY_CURRENT_USER_ID = "revti_current_user_id";
  private static KEY_USERS = "revti_users";
  private static KEY_CATEGORIES = "revti_categories";
  private static KEY_DOCUMENTS = "revti_documents";
  private static KEY_ASSIGNMENTS = "revti_assignments";
  private static KEY_ACKNOWLEDGEMENTS = "revti_acknowledgements";
  private static KEY_VIEWS = "revti_views";
  private static KEY_ACTIVITY_LOGS = "revti_activity_logs";
  private static KEY_ATTACHMENTS = "revti_attachments";
  private static KEY_CREDENTIALS = "revti_credentials";
  private static KEY_REMINDERS = "revti_reminders";
  private static KEY_PROJECTS = "revti_projects";
  private static KEY_PROJECT_CATEGORIES = "revti_project_categories";
  private static KEY_PM_PROJECTS = "revti_pm_projects";
  private static KEY_PM_WORKSTREAMS = "revti_pm_workstreams";
  private static KEY_PM_TASKS = "revti_pm_tasks";

  constructor() {
    // Seed initial values if empty
    if (typeof window !== "undefined") {
      StorageManager.get(MockService.KEY_USERS, MOCK_USERS);
      StorageManager.get(MockService.KEY_CATEGORIES, MOCK_CATEGORIES);
      StorageManager.get(MockService.KEY_DOCUMENTS, MOCK_DOCUMENTS);
      StorageManager.get(MockService.KEY_ASSIGNMENTS, MOCK_ASSIGNMENTS);
      StorageManager.get(MockService.KEY_ACKNOWLEDGEMENTS, MOCK_ACKNOWLEDGEMENTS);
      StorageManager.get(MockService.KEY_VIEWS, MOCK_VIEWS);
      StorageManager.get(MockService.KEY_ACTIVITY_LOGS, MOCK_ACTIVITY_LOGS);
      StorageManager.get(MockService.KEY_ATTACHMENTS, [] as Attachment[]);
      StorageManager.get(MockService.KEY_CREDENTIALS, MOCK_CREDENTIALS);
      StorageManager.get(MockService.KEY_REMINDERS, MOCK_REMINDERS);
      StorageManager.get(MockService.KEY_PROJECTS, MOCK_PROJECTS);
      StorageManager.get(MockService.KEY_PROJECT_CATEGORIES, MOCK_PROJECT_CATEGORIES);
      StorageManager.get(MockService.KEY_PM_PROJECTS, [] as PMProject[]);
      StorageManager.get(MockService.KEY_PM_WORKSTREAMS, [] as Workstream[]);
      StorageManager.get(MockService.KEY_PM_TASKS, [] as PMTask[]);

      const currentUserId = localStorage.getItem(MockService.KEY_CURRENT_USER_ID);
      if (!currentUserId) {
        localStorage.setItem(MockService.KEY_CURRENT_USER_ID, "user-1"); // Default to Meghansh (Admin)
      }
    }
  }

  // -------------------------------------------------------------
  // Users & Roles
  // -------------------------------------------------------------
  async getCurrentUser(): Promise<User> {
    const userId = typeof window !== "undefined"
      ? localStorage.getItem(MockService.KEY_CURRENT_USER_ID) || "user-1"
      : "user-1";
    const users = StorageManager.get(MockService.KEY_USERS, MOCK_USERS);
    const user = users.find((u) => u.id === userId);
    return user || users[0];
  }

  async setCurrentUserPersona(userId: string): Promise<User> {
    if (typeof window !== "undefined") {
      localStorage.setItem(MockService.KEY_CURRENT_USER_ID, userId);
    }
    return this.getCurrentUser();
  }

  async getUsers(): Promise<User[]> {
    return StorageManager.get(MockService.KEY_USERS, MOCK_USERS);
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const users = StorageManager.get(MockService.KEY_USERS, MOCK_USERS);
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) throw new Error("User not found");
    
    users[index] = {
      ...users[index],
      role,
      updated_at: new Date().toISOString(),
    };
    StorageManager.set(MockService.KEY_USERS, users);
    
    await this.logActivity("updated_user_role", null, `Updated role of ${users[index].full_name} to ${role.toUpperCase()}`);
    return users[index];
  }

  // -------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------
  async getCategories(): Promise<Category[]> {
    return StorageManager.get(MockService.KEY_CATEGORIES, MOCK_CATEGORIES);
  }

  async createCategory(name: string, color: string): Promise<Category> {
    const categories = await this.getCategories();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name,
      slug,
      color,
      created_at: new Date().toISOString(),
    };
    categories.push(newCategory);
    StorageManager.set(MockService.KEY_CATEGORIES, categories);
    
    await this.logActivity("created_category", null, `Created category "${name}"`);
    return newCategory;
  }

  async updateCategory(id: string, name: string, color: string): Promise<Category> {
    const categories = await this.getCategories();
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Category not found");
    
    categories[index] = {
      ...categories[index],
      name,
      color,
    };
    StorageManager.set(MockService.KEY_CATEGORIES, categories);
    return categories[index];
  }

  async deleteCategory(id: string): Promise<void> {
    const categories = await this.getCategories();
    const filtered = categories.filter((c) => c.id !== id);
    StorageManager.set(MockService.KEY_CATEGORIES, filtered);
  }

  // -------------------------------------------------------------
  // Documents
  // -------------------------------------------------------------
  async getDocuments(): Promise<DocumentWithRelations[]> {
    const docs = StorageManager.get(MockService.KEY_DOCUMENTS, MOCK_DOCUMENTS);
    const cats = await this.getCategories();
    const users = await this.getUsers();

    return docs.map((doc) => {
      const category = cats.find((c) => c.id === doc.category_id) || null;
      const creator = users.find((u) => u.id === doc.created_by) || null;
      const updater = users.find((u) => u.id === doc.updated_by) || null;
      return {
        ...doc,
        category,
        creator,
        updater,
      };
    });
  }

  async getDocument(id: string): Promise<DocumentWithRelations | null> {
    const docs = await this.getDocuments();
    return docs.find((d) => d.id === id) || null;
  }

  async createDocument(data: Partial<Document>): Promise<DocumentWithRelations> {
    const currentUser = await this.getCurrentUser();
    const docs = StorageManager.get(MockService.KEY_DOCUMENTS, MOCK_DOCUMENTS);
    
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title: data.title || "Untitled Document",
      content: data.content || "",
      category_id: data.category_id || null,
      version: data.version || "1.0",
      status: data.status || "draft",
      created_by: currentUser.id,
      updated_by: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    docs.push(newDoc);
    StorageManager.set(MockService.KEY_DOCUMENTS, docs);
    
    await this.logActivity("created", newDoc.id, `created "${newDoc.title}"`);
    return (await this.getDocument(newDoc.id))!;
  }

  async updateDocument(id: string, data: Partial<Document>): Promise<DocumentWithRelations> {
    const currentUser = await this.getCurrentUser();
    const docs = StorageManager.get(MockService.KEY_DOCUMENTS, MOCK_DOCUMENTS);
    const index = docs.findIndex((d) => d.id === id);
    if (index === -1) throw new Error("Document not found");
    
    const oldDoc = docs[index];
    const updatedDoc: Document = {
      ...oldDoc,
      ...data,
      updated_by: currentUser.id,
      updated_at: new Date().toISOString(),
    };
    
    docs[index] = updatedDoc;
    StorageManager.set(MockService.KEY_DOCUMENTS, docs);
    
    let activityAction = "updated";
    if (data.status && data.status !== oldDoc.status) {
      if (data.status === "published") activityAction = "published";
      else if (data.status === "archived") activityAction = "archived";
    }
    
    await this.logActivity(activityAction, id, `${activityAction} "${updatedDoc.title}"`);
    return (await this.getDocument(id))!;
  }

  async deleteDocument(id: string): Promise<void> {
    const docs = StorageManager.get(MockService.KEY_DOCUMENTS, MOCK_DOCUMENTS);
    const document = docs.find((d) => d.id === id);
    const filtered = docs.filter((d) => d.id !== id);
    StorageManager.set(MockService.KEY_DOCUMENTS, filtered);

    if (document) {
      await this.logActivity("deleted", null, `deleted document "${document.title}"`);
    }
  }

  async duplicateDocument(id: string): Promise<DocumentWithRelations> {
    const original = await this.getDocument(id);
    if (!original) throw new Error("Original document not found");
    
    const currentUser = await this.getCurrentUser();
    const docs = StorageManager.get(MockService.KEY_DOCUMENTS, MOCK_DOCUMENTS);
    
    const duplicate: Document = {
      id: `doc-${Date.now()}`,
      title: `${original.title} (Copy)`,
      content: original.content,
      category_id: original.category_id,
      version: original.version,
      status: "draft", // Starts as draft
      created_by: currentUser.id,
      updated_by: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    docs.push(duplicate);
    StorageManager.set(MockService.KEY_DOCUMENTS, docs);
    
    await this.logActivity("duplicated", duplicate.id, `duplicated "${original.title}" as "${duplicate.title}"`);
    return (await this.getDocument(duplicate.id))!;
  }

  // -------------------------------------------------------------
  // Assignments
  // -------------------------------------------------------------
  async getDocumentAssignments(documentId: string): Promise<Assignment[]> {
    const assigns = StorageManager.get(MockService.KEY_ASSIGNMENTS, MOCK_ASSIGNMENTS);
    const users = await this.getUsers();
    
    return assigns
      .filter((a) => a.document_id === documentId)
      .map((a) => {
        const assigned_user = users.find((u) => u.id === a.assigned_to) || null;
        return {
          ...a,
          assigned_user,
        };
      });
  }

  async assignDocument(data: Omit<Assignment, "id" | "created_at">): Promise<Assignment> {
    const currentUser = await this.getCurrentUser();
    const assigns = StorageManager.get(MockService.KEY_ASSIGNMENTS, MOCK_ASSIGNMENTS);
    const doc = await this.getDocument(data.document_id);
    
    const newAssign: Assignment = {
      id: `assign-${Date.now()}`,
      ...data,
      assigned_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    
    assigns.push(newAssign);
    StorageManager.set(MockService.KEY_ASSIGNMENTS, assigns);
    
    const users = await this.getUsers();
    const assignedUser = users.find((u) => u.id === data.assigned_to);
    const details = assignedUser 
      ? `assigned "${doc?.title || "Document"}" to ${assignedUser.full_name}`
      : `assigned "${doc?.title || "Document"}" to team ${data.team}`;
      
    await this.logActivity("assigned", data.document_id, details);
    return newAssign;
  }

  async removeAssignment(id: string): Promise<void> {
    const assigns = StorageManager.get(MockService.KEY_ASSIGNMENTS, MOCK_ASSIGNMENTS);
    const filtered = assigns.filter((a) => a.id !== id);
    StorageManager.set(MockService.KEY_ASSIGNMENTS, filtered);
  }

  // -------------------------------------------------------------
  // Acknowledgements
  // -------------------------------------------------------------
  async getDocumentAcknowledgements(documentId: string): Promise<Acknowledgement[]> {
    const acks = StorageManager.get(MockService.KEY_ACKNOWLEDGEMENTS, MOCK_ACKNOWLEDGEMENTS);
    const users = await this.getUsers();
    
    return acks
      .filter((a) => a.document_id === documentId)
      .map((a) => {
        const user = users.find((u) => u.id === a.user_id) || null;
        return {
          ...a,
          user,
        };
      });
  }

  async acknowledgeDocument(documentId: string, userId: string): Promise<Acknowledgement> {
    const acks = StorageManager.get(MockService.KEY_ACKNOWLEDGEMENTS, MOCK_ACKNOWLEDGEMENTS);
    
    // Avoid double acknowledgements
    const existing = acks.find((a) => a.document_id === documentId && a.user_id === userId);
    if (existing) return existing;
    
    const doc = await this.getDocument(documentId);
    const newAck: Acknowledgement = {
      id: `ack-${Date.now()}`,
      document_id: documentId,
      user_id: userId,
      acknowledged_at: new Date().toISOString(),
    };
    
    acks.push(newAck);
    StorageManager.set(MockService.KEY_ACKNOWLEDGEMENTS, acks);
    
    await this.logActivity("acknowledged", documentId, `acknowledged "${doc?.title || "Document"}"`);
    return newAck;
  }

  async hasUserAcknowledged(documentId: string, userId: string): Promise<boolean> {
    const acks = StorageManager.get(MockService.KEY_ACKNOWLEDGEMENTS, MOCK_ACKNOWLEDGEMENTS);
    return acks.some((a) => a.document_id === documentId && a.user_id === userId);
  }

  // -------------------------------------------------------------
  // Views & Analytics
  // -------------------------------------------------------------
  async trackView(documentId: string, userId: string): Promise<DocumentView> {
    const views = StorageManager.get(MockService.KEY_VIEWS, MOCK_VIEWS);
    const existingIndex = views.findIndex((v) => v.document_id === documentId && v.user_id === userId);
    
    if (existingIndex > -1) {
      views[existingIndex] = {
        ...views[existingIndex],
        view_count: views[existingIndex].view_count + 1,
        last_viewed_at: new Date().toISOString(),
      };
      StorageManager.set(MockService.KEY_VIEWS, views);
      return views[existingIndex];
    } else {
      const newView: DocumentView = {
        id: `view-${Date.now()}`,
        document_id: documentId,
        user_id: userId,
        view_count: 1,
        last_viewed_at: new Date().toISOString(),
      };
      views.push(newView);
      StorageManager.set(MockService.KEY_VIEWS, views);
      return newView;
    }
  }

  async getDocumentAnalytics(documentId: string): Promise<DocumentAnalytics> {
    const views = StorageManager.get(MockService.KEY_VIEWS, MOCK_VIEWS);
    const acks = StorageManager.get(MockService.KEY_ACKNOWLEDGEMENTS, MOCK_ACKNOWLEDGEMENTS);
    const assigns = StorageManager.get(MockService.KEY_ASSIGNMENTS, MOCK_ASSIGNMENTS);
    const users = await this.getUsers();
    
    const docViews = views
      .filter((v) => v.document_id === documentId)
      .map((v) => ({
        ...v,
        user: users.find((u) => u.id === v.user_id) || null,
      }));
      
    const docAcks = acks
      .filter((a) => a.document_id === documentId)
      .map((a) => ({
        ...a,
        user: users.find((u) => u.id === a.user_id) || null,
      }));
      
    const totalViews = docViews.reduce((acc, curr) => acc + curr.view_count, 0);
    const uniqueViews = docViews.length;
    const acknowledgedCount = docAcks.length;
    const assignedCount = assigns.filter((a) => a.document_id === documentId).length;
    
    return {
      views: docViews,
      acknowledgements: docAcks,
      totalViews,
      uniqueViews,
      acknowledgedCount,
      assignedCount,
    };
  }

  // -------------------------------------------------------------
  // Activity Logs
  // -------------------------------------------------------------
  async getActivityLogs(): Promise<ActivityLog[]> {
    const logs = StorageManager.get(MockService.KEY_ACTIVITY_LOGS, MOCK_ACTIVITY_LOGS);
    const users = await this.getUsers();
    const docs = StorageManager.get(MockService.KEY_DOCUMENTS, MOCK_DOCUMENTS);
    
    // Sort logs by date descending
    return [...logs]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((l) => {
        const user = users.find((u) => u.id === l.user_id) || null;
        const document = docs.find((d) => d.id === l.document_id) || null;
        return {
          ...l,
          user,
          document,
        };
      });
  }

  async logActivity(action: string, documentId: string | null, details: string): Promise<ActivityLog> {
    const currentUser = await this.getCurrentUser();
    const logs = StorageManager.get(MockService.KEY_ACTIVITY_LOGS, MOCK_ACTIVITY_LOGS);
    
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      user_id: currentUser.id,
      action,
      document_id: documentId,
      details,
      created_at: new Date().toISOString(),
    };
    
    logs.push(newLog);
    StorageManager.set(MockService.KEY_ACTIVITY_LOGS, logs);
    return newLog;
  }

  // -------------------------------------------------------------
  // Attachments
  // -------------------------------------------------------------
  async getAttachments(documentId: string): Promise<Attachment[]> {
    const attaches = StorageManager.get(MockService.KEY_ATTACHMENTS, [] as Attachment[]);
    return attaches.filter((a) => a.document_id === documentId);
  }

  async uploadAttachment(documentId: string, file: File): Promise<Attachment> {
    const currentUser = await this.getCurrentUser();
    const attaches = StorageManager.get(MockService.KEY_ATTACHMENTS, [] as Attachment[]);
    
    const newAttach: Attachment = {
      id: `attach-${Date.now()}`,
      document_id: documentId,
      file_name: file.name,
      file_path: URL.createObjectURL(file), // Generate mock URL
      file_type: file.type,
      file_size: file.size,
      uploaded_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    
    attaches.push(newAttach);
    StorageManager.set(MockService.KEY_ATTACHMENTS, attaches);
    
    await this.logActivity("attached", documentId, `uploaded attachment "${file.name}"`);
    return newAttach;
  }

  async deleteAttachment(id: string): Promise<void> {
    const attaches = StorageManager.get(MockService.KEY_ATTACHMENTS, [] as Attachment[]);
    const filtered = attaches.filter((a) => a.id !== id);
    StorageManager.set(MockService.KEY_ATTACHMENTS, filtered);
  }

  // -------------------------------------------------------------
  // Dashboard Analytics
  // -------------------------------------------------------------
  async getDashboardStats(): Promise<DashboardStats> {
    const docs = StorageManager.get(MockService.KEY_DOCUMENTS, MOCK_DOCUMENTS);
    const users = StorageManager.get(MockService.KEY_USERS, MOCK_USERS);

    return {
      totalDocuments: docs.length,
      publishedDocuments: docs.filter((d) => d.status === "published").length,
      draftDocuments: docs.filter((d) => d.status === "draft").length,
      archivedDocuments: docs.filter((d) => d.status === "archived").length,
      totalUsers: users.length,
    };
  }

  // -------------------------------------------------------------
  // Credentials Vault
  // -------------------------------------------------------------
  async getCredentials(): Promise<Credential[]> {
    return StorageManager.get(MockService.KEY_CREDENTIALS, MOCK_CREDENTIALS);
  }

  async createCredential(data: Omit<Credential, "id" | "created_at" | "updated_at">): Promise<Credential> {
    const credentials = await this.getCredentials();
    const now = new Date().toISOString();
    const newCred: Credential = {
      id: `cred-${Date.now()}`,
      ...data,
      created_at: now,
      updated_at: now,
    };
    credentials.push(newCred);
    StorageManager.set(MockService.KEY_CREDENTIALS, credentials);
    return newCred;
  }

  async updateCredential(id: string, data: Partial<Credential>): Promise<Credential> {
    const credentials = await this.getCredentials();
    const index = credentials.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Credential not found");
    credentials[index] = { ...credentials[index], ...data, updated_at: new Date().toISOString() };
    StorageManager.set(MockService.KEY_CREDENTIALS, credentials);
    return credentials[index];
  }

  async deleteCredential(id: string): Promise<void> {
    const credentials = await this.getCredentials();
    StorageManager.set(MockService.KEY_CREDENTIALS, credentials.filter((c) => c.id !== id));
  }

  async uploadCredentialFile(file: File): Promise<{ fileName: string, filePath: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          fileName: file.name,
          filePath: reader.result as string,
        });
      };
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      reader.readAsDataURL(file);
    });
  }

  async getTaskReminders(): Promise<TaskReminder[]> {
    return StorageManager.get(MockService.KEY_REMINDERS, MOCK_REMINDERS);
  }

  async createTaskReminder(data: Omit<TaskReminder, "id" | "created_at" | "updated_at">): Promise<TaskReminder> {
    const reminders = await this.getTaskReminders();
    const now = new Date().toISOString();
    const newReminder: TaskReminder = {
      id: `reminder-${Date.now()}`,
      ...data,
      created_at: now,
      updated_at: now,
    };
    reminders.push(newReminder);
    StorageManager.set(MockService.KEY_REMINDERS, reminders);
    return newReminder;
  }

  async updateTaskReminder(id: string, data: Partial<TaskReminder>): Promise<TaskReminder> {
    const reminders = await this.getTaskReminders();
    const index = reminders.findIndex((r) => r.id === id);
    if (index === -1) throw new Error("Task reminder not found");
    reminders[index] = { ...reminders[index], ...data, updated_at: new Date().toISOString() };
    StorageManager.set(MockService.KEY_REMINDERS, reminders);
    return reminders[index];
  }

  async deleteTaskReminder(id: string): Promise<void> {
    const reminders = await this.getTaskReminders();
    StorageManager.set(MockService.KEY_REMINDERS, reminders.filter((r) => r.id !== id));
  }

  async getProjects(): Promise<Project[]> {
    const projects = StorageManager.get(MockService.KEY_PROJECTS, MOCK_PROJECTS);
    return projects.sort((a, b) => {
      const seqA = a.sequence ?? Infinity;
      const seqB = b.sequence ?? Infinity;
      if (seqA !== seqB) {
        return seqA - seqB;
      }
      return (a.title || "").localeCompare(b.title || "");
    });
  }

  async createProject(data: Omit<Project, "id" | "created_at">): Promise<Project> {
    const projects = StorageManager.get(MockService.KEY_PROJECTS, MOCK_PROJECTS);
    
    // Shift conflicting sequences
    const targetSequence = data.sequence;
    if (targetSequence !== undefined && targetSequence !== null) {
      projects.forEach((p) => {
        if (p.sequence !== undefined && p.sequence !== null && p.sequence >= targetSequence) {
          p.sequence = p.sequence + 1;
        }
      });
    }

    const newProject: Project = {
      ...data,
      id: String(projects.length > 0 ? Math.max(...projects.map((p) => parseInt(p.id) || 0)) + 1 : 1),
      created_at: new Date().toISOString(),
      status: data.status || "published",
    };
    projects.push(newProject);
    StorageManager.set(MockService.KEY_PROJECTS, projects);
    return newProject;
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const projects = StorageManager.get(MockService.KEY_PROJECTS, MOCK_PROJECTS);
    const index = projects.findIndex((p) => String(p.id) === String(id));
    if (index === -1) throw new Error("Project not found");

    const oldProject = projects[index];
    const oldSequence = oldProject.sequence;
    const targetSequence = data.sequence;

    if (targetSequence !== undefined && targetSequence !== null && targetSequence !== oldSequence) {
      projects.forEach((p) => {
        if (String(p.id) !== String(id) && p.sequence !== undefined && p.sequence !== null && p.sequence >= targetSequence) {
          p.sequence = p.sequence + 1;
        }
      });
    }

    projects[index] = { ...projects[index], ...data };
    StorageManager.set(MockService.KEY_PROJECTS, projects);
    return projects[index];
  }

  async deleteProject(id: string): Promise<void> {
    const projects = StorageManager.get(MockService.KEY_PROJECTS, MOCK_PROJECTS);
    StorageManager.set(MockService.KEY_PROJECTS, projects.filter((p) => String(p.id) !== String(id)));
  }

  async getProjectCategories(): Promise<ProjectCategory[]> {
    return StorageManager.get(MockService.KEY_PROJECT_CATEGORIES, MOCK_PROJECT_CATEGORIES);
  }

  async createProjectCategory(name: string): Promise<ProjectCategory> {
    const categories = StorageManager.get(MockService.KEY_PROJECT_CATEGORIES, MOCK_PROJECT_CATEGORIES);
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    
    if (categories.some(c => c.slug === slug)) {
      throw new Error("Category slug already exists");
    }

    const newCat: ProjectCategory = {
      id: `c-${Math.random().toString(36).substring(2)}`,
      name,
      slug,
      created_at: new Date().toISOString()
    };

    categories.push(newCat);
    StorageManager.set(MockService.KEY_PROJECT_CATEGORIES, categories);
    return newCat;
  }

  async deleteProjectCategory(id: string): Promise<void> {
    const categories = StorageManager.get(MockService.KEY_PROJECT_CATEGORIES, MOCK_PROJECT_CATEGORIES);
    StorageManager.set(
      MockService.KEY_PROJECT_CATEGORIES,
      categories.filter((c) => String(c.id) !== String(id))
    );
  }

  async uploadProjectFile(file: File): Promise<string> {
    if (typeof window !== "undefined") {
      return URL.createObjectURL(file);
    }
    return `https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1400&q=85`;
  }

  // -------------------------------------------------------------
  // Project Management
  // -------------------------------------------------------------
  private getPMProjectsRaw(): PMProject[] {
    return StorageManager.get(MockService.KEY_PM_PROJECTS, [] as PMProject[]);
  }
  private getWorkstreamsRaw(): Workstream[] {
    return StorageManager.get(MockService.KEY_PM_WORKSTREAMS, [] as Workstream[]);
  }
  private getPMTasksRaw(): PMTask[] {
    return StorageManager.get(MockService.KEY_PM_TASKS, [] as PMTask[]);
  }

  async getPMProjects(): Promise<PMProject[]> {
    return this.getPMProjectsRaw().sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getPMProjectDetail(id: string): Promise<PMProjectDetail | null> {
    const project = this.getPMProjectsRaw().find((p) => p.id === id);
    if (!project) return null;
    const tasks = this.getPMTasksRaw().filter((t) => t.project_id === id);
    const workstreams = this.getWorkstreamsRaw()
      .filter((w) => w.project_id === id)
      .sort((a, b) => a.sequence - b.sequence)
      .map((w) => ({
        ...w,
        tasks: tasks
          .filter((t) => t.workstream_id === w.id)
          .sort((a, b) => a.sequence - b.sequence),
      }));
    return { ...project, workstreams };
  }

  async createPMProject(data: Omit<PMProject, "id" | "created_by" | "created_at" | "updated_at">): Promise<PMProject> {
    const projects = this.getPMProjectsRaw();
    const now = new Date().toISOString();
    const newProject: PMProject = {
      id: `pm-project-${Date.now()}`,
      created_by: "user-1",
      created_at: now,
      updated_at: now,
      ...data,
    };
    projects.push(newProject);
    StorageManager.set(MockService.KEY_PM_PROJECTS, projects);
    return newProject;
  }

  async updatePMProject(id: string, data: Partial<PMProject>): Promise<PMProject> {
    const projects = this.getPMProjectsRaw();
    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Project not found");
    projects[index] = { ...projects[index], ...data, updated_at: new Date().toISOString() };
    StorageManager.set(MockService.KEY_PM_PROJECTS, projects);
    return projects[index];
  }

  async deletePMProject(id: string): Promise<void> {
    StorageManager.set(MockService.KEY_PM_PROJECTS, this.getPMProjectsRaw().filter((p) => p.id !== id));
    StorageManager.set(MockService.KEY_PM_WORKSTREAMS, this.getWorkstreamsRaw().filter((w) => w.project_id !== id));
    StorageManager.set(MockService.KEY_PM_TASKS, this.getPMTasksRaw().filter((t) => t.project_id !== id));
  }

  async createWorkstream(data: Omit<Workstream, "id" | "created_at" | "updated_at">): Promise<Workstream> {
    const workstreams = this.getWorkstreamsRaw();
    const now = new Date().toISOString();
    const newWorkstream: Workstream = {
      id: `pm-ws-${Date.now()}`,
      created_at: now,
      updated_at: now,
      ...data,
    };
    workstreams.push(newWorkstream);
    StorageManager.set(MockService.KEY_PM_WORKSTREAMS, workstreams);
    return newWorkstream;
  }

  async updateWorkstream(id: string, data: Partial<Workstream>): Promise<Workstream> {
    const workstreams = this.getWorkstreamsRaw();
    const index = workstreams.findIndex((w) => w.id === id);
    if (index === -1) throw new Error("Workstream not found");
    workstreams[index] = { ...workstreams[index], ...data, updated_at: new Date().toISOString() };
    StorageManager.set(MockService.KEY_PM_WORKSTREAMS, workstreams);
    return workstreams[index];
  }

  async deleteWorkstream(id: string): Promise<void> {
    StorageManager.set(MockService.KEY_PM_WORKSTREAMS, this.getWorkstreamsRaw().filter((w) => w.id !== id));
    StorageManager.set(MockService.KEY_PM_TASKS, this.getPMTasksRaw().filter((t) => t.workstream_id !== id));
  }

  async createPMTask(data: Omit<PMTask, "id" | "created_at" | "updated_at">): Promise<PMTask> {
    const tasks = this.getPMTasksRaw();
    const now = new Date().toISOString();
    const newTask: PMTask = {
      id: `pm-task-${Date.now()}`,
      created_at: now,
      updated_at: now,
      ...data,
    };
    tasks.push(newTask);
    StorageManager.set(MockService.KEY_PM_TASKS, tasks);
    return newTask;
  }

  async updatePMTask(id: string, data: Partial<PMTask>): Promise<PMTask> {
    const tasks = this.getPMTasksRaw();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) throw new Error("Task not found");
    tasks[index] = { ...tasks[index], ...data, updated_at: new Date().toISOString() };
    StorageManager.set(MockService.KEY_PM_TASKS, tasks);
    return tasks[index];
  }

  async deletePMTask(id: string): Promise<void> {
    StorageManager.set(MockService.KEY_PM_TASKS, this.getPMTasksRaw().filter((t) => t.id !== id));
  }
}
