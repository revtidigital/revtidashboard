export type UserRole = "view" | "edit" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  created_at: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  version: string;
  status: "draft" | "published" | "archived";
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentWithRelations extends Document {
  category?: Category | null;
  creator?: User | null;
  updater?: User | null;
}

export interface Assignment {
  id: string;
  document_id: string;
  assigned_to: string | null;
  team: string | null;
  due_date: string | null;
  notes: string | null;
  assigned_by: string | null;
  created_at: string;
  assigned_user?: User | null;
}

export interface Acknowledgement {
  id: string;
  user_id: string;
  document_id: string;
  acknowledged_at: string;
  user?: User | null;
}

export interface DocumentView {
  id: string;
  user_id: string;
  document_id: string;
  view_count: number;
  last_viewed_at: string;
  user?: User | null;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  document_id: string | null;
  details: string | null;
  created_at: string;
  user?: User | null;
  document?: Document | null;
}

export interface Attachment {
  id: string;
  document_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface DocumentAnalytics {
  views: Array<DocumentView & { user?: User | null }>;
  acknowledgements: Array<Acknowledgement & { user?: User | null }>;
  totalViews: number;
  uniqueViews: number;
  acknowledgedCount: number;
  assignedCount: number;
}

export interface DashboardStats {
  totalDocuments: number;
  publishedDocuments: number;
  draftDocuments: number;
  archivedDocuments: number;
  totalUsers: number;
}

export type CredentialCategory =
  | "hosting"
  | "domain"
  | "cms"
  | "database"
  | "email"
  | "social"
  | "api"
  | "other";

export interface Credential {
  id: string;
  label: string;
  category: CredentialCategory;
  username: string | null;
  password: string | null;
  url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  recovery_codes?: string | null;
  recovery_file_name?: string | null;
  recovery_file_path?: string | null;
}

export interface TaskReminder {
  id: string;
  website_name: string;
  task_type: string;
  description: string;
  interval_type: "weekly" | "monthly" | "date";
  interval_value: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IWorkspaceService {
  // Authentication / User Persona management
  getCurrentUser(): Promise<User>;
  setCurrentUserPersona(userId: string): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: UserRole): Promise<User>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(name: string, color: string): Promise<Category>;
  updateCategory(id: string, name: string, color: string): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // Documents
  getDocuments(): Promise<DocumentWithRelations[]>;
  getDocument(id: string): Promise<DocumentWithRelations | null>;
  createDocument(data: Partial<Document>): Promise<DocumentWithRelations>;
  updateDocument(id: string, data: Partial<Document>): Promise<DocumentWithRelations>;
  deleteDocument(id: string): Promise<void>;
  duplicateDocument(id: string): Promise<DocumentWithRelations>;

  // Assignments
  getDocumentAssignments(documentId: string): Promise<Assignment[]>;
  assignDocument(data: Omit<Assignment, "id" | "created_at">): Promise<Assignment>;
  removeAssignment(id: string): Promise<void>;

  // Acknowledgements
  getDocumentAcknowledgements(documentId: string): Promise<Acknowledgement[]>;
  acknowledgeDocument(documentId: string, userId: string): Promise<Acknowledgement>;
  hasUserAcknowledged(documentId: string, userId: string): Promise<boolean>;

  // Views & Read Tracking
  trackView(documentId: string, userId: string): Promise<DocumentView>;
  getDocumentAnalytics(documentId: string): Promise<DocumentAnalytics>;

  // Activity Logs
  getActivityLogs(): Promise<ActivityLog[]>;
  logActivity(action: string, documentId: string | null, details: string): Promise<ActivityLog>;

  // Attachments
  getAttachments(documentId: string): Promise<Attachment[]>;
  uploadAttachment(documentId: string, file: File): Promise<Attachment>;
  deleteAttachment(id: string): Promise<void>;

  // Dashboard Stats
  getDashboardStats(): Promise<DashboardStats>;

  // Credentials Vault
  getCredentials(): Promise<Credential[]>;
  createCredential(data: Omit<Credential, "id" | "created_at" | "updated_at">): Promise<Credential>;
  updateCredential(id: string, data: Partial<Credential>): Promise<Credential>;
  deleteCredential(id: string): Promise<void>;
  uploadCredentialFile(file: File): Promise<{ fileName: string, filePath: string }>;

  // Task Reminders
  getTaskReminders(): Promise<TaskReminder[]>;
  createTaskReminder(data: Omit<TaskReminder, "id" | "created_at" | "updated_at">): Promise<TaskReminder>;
  deleteTaskReminder(id: string): Promise<void>;
}

import { isSupabaseConfigured } from "../supabase";
import { SupabaseService } from "./supabase";
import { MockService } from "./mock";

export function getWorkspaceService(): IWorkspaceService {
  if (isSupabaseConfigured) {
    return new SupabaseService();
  }
  return new MockService();
}
