import { supabase } from "../supabase";
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
  TaskReminder,
  Project,
  ProjectCategory,
  PMProject,
  PMProjectDetail,
  PMTaskSummary,
  Workstream,
  PMTask,
  WorkstreamWithTasks,
  SiteSetting,
  JsonRecord,
  ClientLogo,
  ImpactNumber,
  SocialLink,
} from "./api";

export class SupabaseService implements IWorkspaceService {
  private client = supabase!;

  private async assertCanMutateContent(): Promise<User> {
    const currentUser = await this.getCurrentUser();
    if (currentUser.role !== "admin" && currentUser.role !== "edit") {
      throw new Error("Unauthorized mutation: admin or edit role is required.");
    }
    return currentUser;
  }

  private isValidUrlLike(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith("/") || trimmed.startsWith("#")) return true;
    if (trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) return true;
    try {
      const url = new URL(trimmed);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  private assertValidOptionalUrl(value: string | null | undefined, field: string): void {
    if (!value?.trim()) return;
    if (!this.isValidUrlLike(value)) {
      throw new Error(`Invalid URL for ${field}.`);
    }
  }

  private assertBoolean(value: unknown, field: string): void {
    if (typeof value !== "boolean") {
      throw new Error(`Invalid project field: ${field} must be a boolean.`);
    }
  }

  private assertSupportedProjectVideoUrl(value: string, field: string): void {
    this.assertValidOptionalUrl(value, field);
    const cleanUrl = value.split("?")[0].toLowerCase();
    if (!cleanUrl.match(/\.(mp4|webm|mov|m4v)$/)) {
      throw new Error(`Invalid project field: ${field} must be an MP4, WebM, MOV, or M4V video URL.`);
    }
  }

  private assertProjectUploadFile(file: File): void {
    const maxBytes = 50 * 1024 * 1024;
    const allowedTypes = ["image/", "video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];
    if (file.size > maxBytes) {
      throw new Error("Project uploads must be 50MB or smaller.");
    }
    if (!allowedTypes.some((type) => file.type.startsWith(type) || file.type === type)) {
      throw new Error("Unsupported project upload type. Use images, MP4, WebM, MOV, or M4V files.");
    }
  }

  // -------------------------------------------------------------
  // Auth & Profile
  // -------------------------------------------------------------
  async getCurrentUser(): Promise<User> {
    const { data: { user: authUser }, error: authError } = await this.client.auth.getUser();
    if (authError || !authUser) {
      throw new Error("No authenticated user found");
    }

    // Try fetching from public.users
    const { data: profile, error } = await this.client
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (error || !profile) {
      // Create profile fallback if trigger did not execute
      const newProfile: User = {
        id: authUser.id,
        email: authUser.email || "",
        full_name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
        role: (authUser.user_metadata?.role as UserRole) || "view",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const { data: insertedProfile } = await this.client
        .from("users")
        .insert(newProfile)
        .select()
        .single();
        
      return insertedProfile || newProfile;
    }

    return profile;
  }

  async setCurrentUserPersona(userId: string): Promise<User> {
    // In real Supabase mode, the active user session is defined by the auth JWT.
    // Changing persona is only supported in Mock Mode, but we will return the user profile.
    const { data } = await this.client
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();
    return data;
  }

  async getUsers(): Promise<User[]> {
    const { data, error } = await this.client
      .from("users")
      .select("*")
      .order("full_name", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const { data, error } = await this.client
      .from("users")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single();
    if (error) throw error;
    await this.logActivity("updated_user_role", null, `Updated user role to ${role.toUpperCase()}`);
    return data;
  }

  // -------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------
  async getCategories(): Promise<Category[]> {
    const { data, error } = await this.client
      .from("document_categories")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async createCategory(name: string, color: string): Promise<Category> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { data, error } = await this.client
      .from("document_categories")
      .insert({ name, color, slug })
      .select()
      .single();
    if (error) throw error;
    await this.logActivity("created_category", null, `Created category "${name}"`);
    return data;
  }

  async updateCategory(id: string, name: string, color: string): Promise<Category> {
    const { data, error } = await this.client
      .from("document_categories")
      .update({ name, color })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await this.client
      .from("document_categories")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }

  // -------------------------------------------------------------
  // Documents
  // -------------------------------------------------------------
  async getDocuments(): Promise<DocumentWithRelations[]> {
    const { data, error } = await this.client
      .from("documents")
      .select(`
        *,
        category:document_categories(*),
        creator:users!documents_created_by_fkey(*),
        updater:users!documents_updated_by_fkey(*)
      `)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getDocument(id: string): Promise<DocumentWithRelations | null> {
    const { data, error } = await this.client
      .from("documents")
      .select(`
        *,
        category:document_categories(*),
        creator:users!documents_created_by_fkey(*),
        updater:users!documents_updated_by_fkey(*)
      `)
      .eq("id", id)
      .single();
    if (error) return null;
    return data;
  }

  async createDocument(data: Partial<Document>): Promise<DocumentWithRelations> {
    const currentUser = await this.getCurrentUser();
    const payload = {
      title: data.title || "Untitled Document",
      content: data.content || "",
      category_id: data.category_id || null,
      version: data.version || "1.0",
      status: data.status || "draft",
      created_by: currentUser.id,
      updated_by: currentUser.id,
    };

    const { data: newDoc, error } = await this.client
      .from("documents")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    await this.logActivity("created", newDoc.id, `created "${newDoc.title}"`);
    return (await this.getDocument(newDoc.id))!;
  }

  async updateDocument(id: string, data: Partial<Document>): Promise<DocumentWithRelations> {
    const currentUser = await this.getCurrentUser();
    const payload = {
      ...data,
      updated_by: currentUser.id,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedDoc, error } = await this.client
      .from("documents")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    let activityAction = "updated";
    if (data.status) {
      if (data.status === "published") activityAction = "published";
      else if (data.status === "archived") activityAction = "archived";
    }

    await this.logActivity(activityAction, id, `${activityAction} "${updatedDoc.title}"`);
    return (await this.getDocument(id))!;
  }

  async deleteDocument(id: string): Promise<void> {
    const original = await this.getDocument(id);
    const { error } = await this.client
      .from("documents")
      .delete()
      .eq("id", id);
    if (error) throw error;
    if (original) {
      await this.logActivity("deleted", null, `deleted document "${original.title}"`);
    }
  }

  async duplicateDocument(id: string): Promise<DocumentWithRelations> {
    const original = await this.getDocument(id);
    if (!original) throw new Error("Original document not found");
    const currentUser = await this.getCurrentUser();

    const payload = {
      title: `${original.title} (Copy)`,
      content: original.content,
      category_id: original.category_id,
      version: original.version,
      status: "draft",
      created_by: currentUser.id,
      updated_by: currentUser.id,
    };

    const { data: duplicate, error } = await this.client
      .from("documents")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    await this.logActivity("duplicated", duplicate.id, `duplicated "${original.title}" as "${duplicate.title}"`);
    return (await this.getDocument(duplicate.id))!;
  }

  // -------------------------------------------------------------
  // Assignments
  // -------------------------------------------------------------
  async getDocumentAssignments(documentId: string): Promise<Assignment[]> {
    const { data, error } = await this.client
      .from("document_assignments")
      .select(`
        *,
        assigned_user:users!document_assignments_assigned_to_fkey(*)
      `)
      .eq("document_id", documentId);
    if (error) throw error;
    return data || [];
  }

  async assignDocument(data: Omit<Assignment, "id" | "created_at">): Promise<Assignment> {
    const currentUser = await this.getCurrentUser();
    const payload = {
      ...data,
      assigned_by: currentUser.id,
    };

    const { data: newAssign, error } = await this.client
      .from("document_assignments")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    const doc = await this.getDocument(data.document_id);
    let details = `assigned "${doc?.title || "Document"}"`;
    if (data.assigned_to) {
      const users = await this.getUsers();
      const user = users.find((u) => u.id === data.assigned_to);
      details += ` to ${user?.full_name || "user"}`;
    } else if (data.team) {
      details += ` to team ${data.team}`;
    }

    await this.logActivity("assigned", data.document_id, details);
    return newAssign;
  }

  async removeAssignment(id: string): Promise<void> {
    const { error } = await this.client
      .from("document_assignments")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }

  // -------------------------------------------------------------
  // Acknowledgements
  // -------------------------------------------------------------
  async getDocumentAcknowledgements(documentId: string): Promise<Acknowledgement[]> {
    const { data, error } = await this.client
      .from("document_acknowledgements")
      .select(`
        *,
        user:users(*)
      `)
      .eq("document_id", documentId);
    if (error) throw error;
    return data || [];
  }

  async acknowledgeDocument(documentId: string, userId: string): Promise<Acknowledgement> {
    const { data, error } = await this.client
      .from("document_acknowledgements")
      .upsert({ document_id: documentId, user_id: userId, acknowledged_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;

    const doc = await this.getDocument(documentId);
    await this.logActivity("acknowledged", documentId, `acknowledged "${doc?.title || "Document"}"`);
    return data;
  }

  async hasUserAcknowledged(documentId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("document_acknowledgements")
      .select("id")
      .eq("document_id", documentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return false;
    return Boolean(data);
  }

  // -------------------------------------------------------------
  // Views & Read Tracking
  // -------------------------------------------------------------
  async trackView(documentId: string, userId: string): Promise<DocumentView> {
    // Check if view already exists
    const { data: existing } = await this.client
      .from("document_views")
      .select("*")
      .eq("document_id", documentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await this.client
        .from("document_views")
        .update({
          view_count: existing.view_count + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await this.client
        .from("document_views")
        .insert({
          document_id: documentId,
          user_id: userId,
          view_count: 1,
          last_viewed_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  async getDocumentAnalytics(documentId: string): Promise<DocumentAnalytics> {
    const viewsPromise = this.client
      .from("document_views")
      .select(`*, user:users(*)`)
      .eq("document_id", documentId);

    const acksPromise = this.client
      .from("document_acknowledgements")
      .select(`*, user:users(*)`)
      .eq("document_id", documentId);

    const assignsPromise = this.client
      .from("document_assignments")
      .select("id")
      .eq("document_id", documentId);

    const [viewsRes, acksRes, assignsRes] = await Promise.all([
      viewsPromise,
      acksPromise,
      assignsPromise,
    ]);

    const views = viewsRes.data || [];
    const acknowledgements = acksRes.data || [];
    const totalViews = views.reduce((acc, curr) => acc + curr.view_count, 0);
    const uniqueViews = views.length;
    const acknowledgedCount = acknowledgements.length;
    const assignedCount = assignsRes.data?.length || 0;

    return {
      views,
      acknowledgements,
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
    const { data, error } = await this.client
      .from("activity_logs")
      .select(`
        *,
        user:users(*),
        document:documents(id, title)
      `)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  }

  async logActivity(action: string, documentId: string | null, details: string): Promise<ActivityLog> {
    const currentUser = await this.getCurrentUser();
    const { data, error } = await this.client
      .from("activity_logs")
      .insert({
        user_id: currentUser.id,
        action,
        document_id: documentId,
        details,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // -------------------------------------------------------------
  // Attachments
  // -------------------------------------------------------------
  async getAttachments(documentId: string): Promise<Attachment[]> {
    const { data, error } = await this.client
      .from("attachments")
      .select("*")
      .eq("document_id", documentId);
    if (error) throw error;
    return data || [];
  }

  async uploadAttachment(documentId: string, file: File): Promise<Attachment> {
    const currentUser = await this.getCurrentUser();
    const fileExt = file.name.split(".").pop();
    const filePath = `${documentId}/${Math.random()}.${fileExt}`;

    // Upload to Supabase Storage bucket 'attachments'
    const { error: uploadError } = await this.client.storage
      .from("attachments")
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    // Get public URL or store path
    const { data: { publicUrl } } = this.client.storage
      .from("attachments")
      .getPublicUrl(filePath);

    const { data, error } = await this.client
      .from("attachments")
      .insert({
        document_id: documentId,
        file_name: file.name,
        file_path: publicUrl,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: currentUser.id,
      })
      .select()
      .single();
    if (error) throw error;

    await this.logActivity("attached", documentId, `uploaded attachment "${file.name}"`);
    return data;
  }

  async deleteAttachment(id: string): Promise<void> {
    // Fetch attachment metadata to delete storage item first
    const { data: attach } = await this.client
      .from("attachments")
      .select("*")
      .eq("id", id)
      .single();

    if (attach) {
      // Parse file path to delete from bucket
      const pathParts = attach.file_path.split("/attachments/public/");
      const bucketPath = pathParts[1] || attach.file_path;
      await this.client.storage.from("attachments").remove([bucketPath]);
    }

    const { error } = await this.client
      .from("attachments")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }

  // -------------------------------------------------------------
  // Dashboard Analytics Stats
  // -------------------------------------------------------------
  async getDashboardStats(): Promise<DashboardStats> {
    const docsPromise = this.client.from("documents").select("status");
    const usersPromise = this.client.from("users").select("id", { count: "exact", head: true });

    const [docsRes, usersRes] = await Promise.all([
      docsPromise,
      usersPromise,
    ]);

    const docs = docsRes.data || [];
    const totalDocuments = docs.length;
    const publishedDocuments = docs.filter((d) => d.status === "published").length;
    const draftDocuments = docs.filter((d) => d.status === "draft").length;
    const archivedDocuments = docs.filter((d) => d.status === "archived").length;
    const totalUsers = usersRes.count || 0;

    return {
      totalDocuments,
      publishedDocuments,
      draftDocuments,
      archivedDocuments,
      totalUsers,
    };
  }

  // -------------------------------------------------------------
  // Credentials Vault
  // -------------------------------------------------------------
  async getCredentials(): Promise<Credential[]> {
    const { data, error } = await this.client
      .from("credentials")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createCredential(data: Omit<Credential, "id" | "created_at" | "updated_at">): Promise<Credential> {
    const currentUser = await this.getCurrentUser();
    const { data: newCred, error } = await this.client
      .from("credentials")
      .insert({ ...data, created_by: currentUser.id })
      .select()
      .single();
    if (error) throw error;
    return newCred;
  }

  async updateCredential(id: string, data: Partial<Credential>): Promise<Credential> {
    const { data: updated, error } = await this.client
      .from("credentials")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  }

  async deleteCredential(id: string): Promise<void> {
    const { data: cred } = await this.client
      .from("credentials")
      .select("recovery_file_path")
      .eq("id", id)
      .maybeSingle();

    if (cred?.recovery_file_path) {
      const pathParts = cred.recovery_file_path.split("/attachments/public/");
      const bucketPath = pathParts[1] || cred.recovery_file_path;
      if (bucketPath.startsWith("credentials/")) {
        await this.client.storage.from("attachments").remove([bucketPath]);
      }
    }

    const { error } = await this.client.from("credentials").delete().eq("id", id);
    if (error) throw error;
  }

  async uploadCredentialFile(file: File): Promise<{ fileName: string, filePath: string }> {
    const fileExt = file.name.split(".").pop();
    const filePath = `credentials/${Math.random()}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await this.client.storage
      .from("attachments")
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = this.client.storage
      .from("attachments")
      .getPublicUrl(filePath);

    return {
      fileName: file.name,
      filePath: publicUrl,
    };
  }

  async getTaskReminders(): Promise<TaskReminder[]> {
    const { data, error } = await this.client
      .from("task_reminders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createTaskReminder(data: Omit<TaskReminder, "id" | "created_at" | "updated_at">): Promise<TaskReminder> {
    const currentUser = await this.getCurrentUser();
    const { data: newReminder, error } = await this.client
      .from("task_reminders")
      .insert({ ...data, created_by: currentUser.id })
      .select()
      .single();
    if (error) throw error;
    return newReminder;
  }

  async updateTaskReminder(id: string, data: Partial<TaskReminder>): Promise<TaskReminder> {
    const { data: updated, error } = await this.client
      .from("task_reminders")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  }

  async deleteTaskReminder(id: string): Promise<void> {
    const { error } = await this.client
      .from("task_reminders")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }

  async getProjects(): Promise<Project[]> {
    try {
      const { data, error } = await this.client
        .from("projects")
        .select("*")
        .order("sequence", { ascending: true, nullsFirst: false })
        .order("title", { ascending: true });
      if (error) {
        console.warn("Supabase 'projects' table query failed; returning an empty portfolio list:", error.message);
        return [];
      }
      return (data || []) as Project[];
    } catch (e) {
      console.warn("Error querying projects from Supabase; returning an empty portfolio list:", e);
      return [];
    }
  }

  private assertProjectPayload(data: Partial<Project>): void {
    this.assertValidOptionalUrl(data.thumb, "thumb");
    this.assertValidOptionalUrl(data.video_url, "video_url");
    this.assertValidOptionalUrl(data.client_logo, "client_logo");
    for (const [index, url] of (data.gallery || []).entries()) {
      this.assertValidOptionalUrl(url, `gallery[${index}]`);
    }
    if (data.status && data.status !== "draft" && data.status !== "published") {
      throw new Error("Invalid project field: status must be draft or published.");
    }
    if (data.sequence !== undefined && data.sequence !== null && (!Number.isInteger(data.sequence) || data.sequence <= 0)) {
      throw new Error("Invalid project field: sequence must be a positive integer.");
    }
    if (data.reelSection !== undefined) {
      const reel = data.reelSection;
      this.assertBoolean(reel.enabled, "reelSection.enabled");
      if (reel.title !== undefined && typeof reel.title !== "string") throw new Error("Invalid project field: reelSection.title must be a string.");
      if (reel.description !== undefined && typeof reel.description !== "string") throw new Error("Invalid project field: reelSection.description must be a string.");
      if (reel.posterUrl) this.assertValidOptionalUrl(reel.posterUrl, "reelSection.posterUrl");
      if (reel.videoUrl) this.assertSupportedProjectVideoUrl(reel.videoUrl, "reelSection.videoUrl");
      if (reel.enabled && !reel.videoUrl?.trim()) {
        throw new Error("Project Reel requires a video URL when enabled.");
      }
      if (reel.autoplay !== undefined) this.assertBoolean(reel.autoplay, "reelSection.autoplay");
      if (reel.muted !== undefined) this.assertBoolean(reel.muted, "reelSection.muted");
      if (reel.loop !== undefined) this.assertBoolean(reel.loop, "reelSection.loop");
    }
  }

  async createProject(data: Omit<Project, "id" | "created_at">): Promise<Project> {
    await this.assertCanMutateContent();
    this.assertProjectPayload(data);
    try {
      const targetSequence = data.sequence;
      if (targetSequence !== undefined && targetSequence !== null) {
        // Shift existing projects
        const { data: projectsToShift } = await this.client
          .from("projects")
          .select("id, sequence")
          .gte("sequence", targetSequence);
        
        if (projectsToShift && projectsToShift.length > 0) {
          const updates = projectsToShift.map(p => ({
            id: p.id,
            sequence: (p.sequence || 0) + 1
          }));
          await this.client.from("projects").upsert(updates);
        }
      }

      const { data: newProject, error } = await this.client
        .from("projects")
        .insert(data)
        .select()
        .single();
      if (error) {
        throw new Error(error.message || JSON.stringify(error));
      }
      this.triggerFrontendSync(["portfolio", "site-content"]);
      return newProject as Project;
    } catch (e) {
      console.error("Error inserting project in Supabase:", e);
      if (e instanceof Error) throw e;
      throw new Error(e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : JSON.stringify(e));
    }
  }

  private triggerFrontendSync(tags: string[] = ["portfolio", "site-content"]) {
    const uniqueTags = Array.from(new Set(tags));

    if (typeof window !== "undefined") {
      fetch("/api/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: uniqueTags }),
      }).catch((err) => {
        console.error("Failed to request frontend revalidation:", err);
      });
      return;
    }

    const configuredUrl = process.env.FRONTEND_REVALIDATE_URL;
    const revalidateSecret = process.env.REVALIDATE_SECRET;

    if (!configuredUrl) {
      console.warn("FRONTEND_REVALIDATE_URL is not configured; skipping frontend revalidation.");
      return;
    }

    for (const tag of uniqueTags) {
      try {
        const url = new URL(configuredUrl);
        url.searchParams.set("tag", tag);

        if (revalidateSecret) {
          url.searchParams.set("secret", revalidateSecret);
        }

        fetch(url.toString(), { method: "GET" }).catch((err) => {
          console.error(`Failed to sync frontend tag ${tag}:`, err);
        });
      } catch (err) {
        console.error("Invalid frontend revalidation URL configured:", err);
      }
    }
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    await this.assertCanMutateContent();
    this.assertProjectPayload(data);
    try {
      const targetSequence = data.sequence;
      if (targetSequence !== undefined && targetSequence !== null) {
        // Fetch existing project's sequence to check if it has changed
        const { data: existingProject } = await this.client
          .from("projects")
          .select("sequence")
          .eq("id", id)
          .single();
        
        const oldSequence = existingProject?.sequence;

        if (targetSequence !== oldSequence) {
          // Shift conflicting sequences
          const { data: projectsToShift } = await this.client
            .from("projects")
            .select("id, sequence")
            .gte("sequence", targetSequence)
            .neq("id", id);
          
          if (projectsToShift && projectsToShift.length > 0) {
            const updates = projectsToShift.map(p => ({
              id: p.id,
              sequence: (p.sequence || 0) + 1
            }));
            await this.client.from("projects").upsert(updates);
          }
        }
      }

      const { data: updated, error } = await this.client
        .from("projects")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        throw new Error(error.message || JSON.stringify(error));
      }
      this.triggerFrontendSync(["portfolio", "site-content"]);
      return updated as Project;
    } catch (e) {
      console.error("Error updating project in Supabase:", e);
      if (e instanceof Error) throw e;
      throw new Error(e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : JSON.stringify(e));
    }
  }

  async deleteProject(id: string): Promise<void> {
    await this.assertCanMutateContent();
    try {
      const { error } = await this.client
        .from("projects")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message || JSON.stringify(error));
      this.triggerFrontendSync(["portfolio", "site-content"]);
    } catch (e) {
      console.error("Error deleting project in Supabase:", e);
      if (e instanceof Error) throw e;
      throw new Error(e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : JSON.stringify(e));
    }
  }

  async getProjectCategories(): Promise<ProjectCategory[]> {
    try {
      const { data, error } = await this.client
        .from("project_categories")
        .select("*")
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn("Error querying project categories:", e);
      return [];
    }
  }

  async createProjectCategory(name: string): Promise<ProjectCategory> {
    await this.assertCanMutateContent();
    try {
      const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data, error } = await this.client
        .from("project_categories")
        .insert({ name, slug })
        .select()
        .single();
      
      if (error) throw new Error(error.message || JSON.stringify(error));
      this.triggerFrontendSync(["project-categories", "portfolio", "site-content"]);
      return data;
    } catch (e) {
      console.error("Error creating project category in Supabase:", e);
      if (e instanceof Error) throw e;
      throw new Error(e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : JSON.stringify(e));
    }
  }

  async deleteProjectCategory(id: string): Promise<void> {
    await this.assertCanMutateContent();
    try {
      const { error } = await this.client
        .from("project_categories")
        .delete()
        .eq("id", id);
      
      if (error) throw new Error(error.message || JSON.stringify(error));
      this.triggerFrontendSync(["project-categories", "portfolio", "site-content"]);
    } catch (e) {
      console.error("Error deleting project category in Supabase:", e);
      if (e instanceof Error) throw e;
      throw new Error(e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : JSON.stringify(e));
    }
  }

  async getSiteSettings(): Promise<SiteSetting[]> {
    const { data, error } = await this.client
      .from("site_settings")
      .select("*")
      .order("key", { ascending: true });
    if (error) throw error;
    return (data || []) as SiteSetting[];
  }

  async upsertSiteSetting(key: string, value: JsonRecord): Promise<SiteSetting> {
    await this.assertCanMutateContent();
    const { data, error } = await this.client
      .from("site_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    this.triggerFrontendSync(["site-settings", "site-content"]);
    return data as SiteSetting;
  }

  async getClientLogos(includeInactive = false): Promise<ClientLogo[]> {
    let query = this.client
      .from("client_logos")
      .select("*")
      .is("deleted_at", null)
      .order("display_order", { ascending: true });
    if (!includeInactive) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ClientLogo[];
  }

  async createClientLogo(data: Omit<ClientLogo, "id" | "created_at" | "deleted_at">): Promise<ClientLogo> {
    await this.assertCanMutateContent();
    this.assertValidOptionalUrl(data.logo_image, "logo_image");
    const { data: created, error } = await this.client.from("client_logos").insert(data).select().single();
    if (error) throw error;
    this.triggerFrontendSync(["client-logos", "site-content"]);
    return created as ClientLogo;
  }

  async updateClientLogo(id: string, data: Partial<Omit<ClientLogo, "id" | "created_at" | "deleted_at">>): Promise<ClientLogo> {
    await this.assertCanMutateContent();
    this.assertValidOptionalUrl(data.logo_image, "logo_image");
    const { data: updated, error } = await this.client.from("client_logos").update(data).eq("id", id).select().single();
    if (error) throw error;
    this.triggerFrontendSync(["client-logos", "site-content"]);
    return updated as ClientLogo;
  }

  async deleteClientLogo(id: string): Promise<ClientLogo> {
    await this.assertCanMutateContent();
    const { data, error } = await this.client.from("client_logos").update({ deleted_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw error;
    this.triggerFrontendSync(["client-logos", "site-content"]);
    return data as ClientLogo;
  }

  async getImpactNumbers(includeInactive = false): Promise<ImpactNumber[]> {
    let query = this.client
      .from("impact_numbers")
      .select("*")
      .is("deleted_at", null)
      .order("display_order", { ascending: true });
    if (!includeInactive) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ImpactNumber[];
  }

  async createImpactNumber(data: Omit<ImpactNumber, "id" | "created_at" | "deleted_at">): Promise<ImpactNumber> {
    await this.assertCanMutateContent();
    const { data: created, error } = await this.client.from("impact_numbers").insert(data).select().single();
    if (error) throw error;
    this.triggerFrontendSync(["impact-numbers", "site-content"]);
    return created as ImpactNumber;
  }

  async updateImpactNumber(id: string, data: Partial<Omit<ImpactNumber, "id" | "created_at" | "deleted_at">>): Promise<ImpactNumber> {
    await this.assertCanMutateContent();
    const { data: updated, error } = await this.client.from("impact_numbers").update(data).eq("id", id).select().single();
    if (error) throw error;
    this.triggerFrontendSync(["impact-numbers", "site-content"]);
    return updated as ImpactNumber;
  }

  async deleteImpactNumber(id: string): Promise<ImpactNumber> {
    await this.assertCanMutateContent();
    const { data, error } = await this.client.from("impact_numbers").update({ deleted_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw error;
    this.triggerFrontendSync(["impact-numbers", "site-content"]);
    return data as ImpactNumber;
  }

  async getSocialLinks(includeInactive = false): Promise<SocialLink[]> {
    let query = this.client
      .from("social_links")
      .select("*")
      .is("deleted_at", null)
      .order("display_order", { ascending: true });
    if (!includeInactive) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as SocialLink[];
  }

  async createSocialLink(data: Omit<SocialLink, "id" | "created_at" | "deleted_at">): Promise<SocialLink> {
    await this.assertCanMutateContent();
    this.assertValidOptionalUrl(data.profile_url, "profile_url");
    const { data: created, error } = await this.client.from("social_links").insert(data).select().single();
    if (error) throw error;
    this.triggerFrontendSync(["social-links", "site-content"]);
    return created as SocialLink;
  }

  async updateSocialLink(id: string, data: Partial<Omit<SocialLink, "id" | "created_at" | "deleted_at">>): Promise<SocialLink> {
    await this.assertCanMutateContent();
    this.assertValidOptionalUrl(data.profile_url, "profile_url");
    const { data: updated, error } = await this.client.from("social_links").update(data).eq("id", id).select().single();
    if (error) throw error;
    this.triggerFrontendSync(["social-links", "site-content"]);
    return updated as SocialLink;
  }

  async deleteSocialLink(id: string): Promise<SocialLink> {
    await this.assertCanMutateContent();
    const { data, error } = await this.client.from("social_links").update({ deleted_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw error;
    this.triggerFrontendSync(["social-links", "site-content"]);
    return data as SocialLink;
  }

  async uploadProjectFile(file: File): Promise<string> {
    this.assertProjectUploadFile(file);
    const fileExt = file.name.split(".").pop();
    const filePath = `projects/${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await this.client.storage
      .from("attachments")
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = this.client.storage
      .from("attachments")
      .getPublicUrl(filePath);

    return publicUrl;
  }

  // -------------------------------------------------------------
  // Project Management
  // -------------------------------------------------------------
  async getPMProjects(): Promise<PMProject[]> {
    const { data, error } = await this.client
      .from("pm_projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getPMTaskSummary(): Promise<Record<string, PMTaskSummary>> {
    const { data, error } = await this.client
      .from("pm_tasks")
      .select("project_id, title, status, due_date");
    if (error) throw error;

    const today = new Date().toISOString().slice(0, 10);
    const summary: Record<string, PMTaskSummary> = {};
    for (const t of data || []) {
      const s = summary[t.project_id] ?? (summary[t.project_id] = { total: 0, done: 0, in_progress: 0, overdue: 0, active_titles: [] });
      s.total += 1;
      if (t.status === "done") s.done += 1;
      if (t.status === "in_progress") s.in_progress += 1;
      const isOverdue = t.status !== "done" && t.due_date && t.due_date < today;
      if (isOverdue) s.overdue += 1;
      if (t.status === "in_progress" || isOverdue) s.active_titles.push(t.title);
    }
    return summary;
  }

  async getPMProjectDetail(id: string): Promise<PMProjectDetail | null> {
    const { data: project, error } = await this.client
      .from("pm_projects")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !project) return null;

    const { data: workstreams, error: wsError } = await this.client
      .from("pm_workstreams")
      .select("*")
      .eq("project_id", id)
      .order("sequence", { ascending: true });
    if (wsError) throw wsError;

    const { data: tasks, error: taskError } = await this.client
      .from("pm_tasks")
      .select("*")
      .eq("project_id", id)
      .order("sequence", { ascending: true });
    if (taskError) throw taskError;

    const withTasks: WorkstreamWithTasks[] = (workstreams || []).map((w) => ({
      ...w,
      tasks: (tasks || []).filter((t) => t.workstream_id === w.id),
    }));

    return { ...project, workstreams: withTasks };
  }

  async createPMProject(data: Omit<PMProject, "id" | "created_by" | "created_at" | "updated_at">): Promise<PMProject> {
    const currentUser = await this.getCurrentUser();
    const { data: created, error } = await this.client
      .from("pm_projects")
      .insert({ ...data, created_by: currentUser.id })
      .select()
      .single();
    if (error) throw error;
    return created;
  }

  async updatePMProject(id: string, data: Partial<PMProject>): Promise<PMProject> {
    const { data: updated, error } = await this.client
      .from("pm_projects")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  }

  async deletePMProject(id: string): Promise<void> {
    const { error } = await this.client.from("pm_projects").delete().eq("id", id);
    if (error) throw error;
  }

  async createWorkstream(data: Omit<Workstream, "id" | "created_at" | "updated_at">): Promise<Workstream> {
    const { data: created, error } = await this.client
      .from("pm_workstreams")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return created;
  }

  async updateWorkstream(id: string, data: Partial<Workstream>): Promise<Workstream> {
    const { data: updated, error } = await this.client
      .from("pm_workstreams")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  }

  async deleteWorkstream(id: string): Promise<void> {
    const { error } = await this.client.from("pm_workstreams").delete().eq("id", id);
    if (error) throw error;
  }

  async createPMTask(data: Omit<PMTask, "id" | "created_at" | "updated_at">): Promise<PMTask> {
    const { data: created, error } = await this.client
      .from("pm_tasks")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return created;
  }

  async updatePMTask(id: string, data: Partial<PMTask>): Promise<PMTask> {
    const { data: updated, error } = await this.client
      .from("pm_tasks")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  }

  async deletePMTask(id: string): Promise<void> {
    const { error } = await this.client.from("pm_tasks").delete().eq("id", id);
    if (error) throw error;
  }
}
