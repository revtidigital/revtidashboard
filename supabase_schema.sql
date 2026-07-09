-- Supabase Database Schema for Revti Workspace
-- Drop existing tables if they exist (for reset purposes)
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS document_views CASCADE;
DROP TABLE IF EXISTS document_acknowledgements CASCADE;
DROP TABLE IF EXISTS document_assignments CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS document_categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table (Synchronized with auth.users via triggers or service layer)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'view' CHECK (role IN ('view', 'edit', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Document Categories Table
CREATE TABLE document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#7C5CFC', -- Hex color code
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Documents Table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '', -- HTML content from Tiptap Editor
    category_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,
    version TEXT NOT NULL DEFAULT '1.0',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Document Assignments Table
CREATE TABLE document_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE CASCADE,
    team TEXT, -- e.g., 'Engineering', 'QA', 'Design', 'Marketing'
    due_date TIMESTAMPTZ,
    notes TEXT,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Document Acknowledgements Table
CREATE TABLE document_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_document_acknowledgement UNIQUE (user_id, document_id)
);

-- 6. Document Views Table (Read Tracking)
CREATE TABLE document_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    view_count INTEGER NOT NULL DEFAULT 1,
    last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_document_view UNIQUE (user_id, document_id)
);

-- 7. Activity Logs Table
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'created', 'updated', 'acknowledged', 'archived', 'assigned'
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Attachments Table
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Supabase Storage path
    file_type TEXT,
    file_size INTEGER,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- Triggers for updated_at Auto-Update
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------------
-- Full-Text Search Config & Indexes
-- -------------------------------------------------------------
-- Add search indexes on title and content for full-text search
CREATE INDEX idx_documents_title_content_search 
ON documents 
USING gin(to_tsvector('english', title || ' ' || content));

CREATE INDEX idx_documents_category_id ON documents(category_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_document_assignments_assigned_to ON document_assignments(assigned_to);
CREATE INDEX idx_document_views_user_document ON document_views(user_id, document_id);
CREATE INDEX idx_document_acknowledgements_user_document ON document_acknowledgements(user_id, document_id);

-- -------------------------------------------------------------
-- Row Level Security (RLS) Policies
-- -------------------------------------------------------------
-- Create security definer helper functions to avoid policy recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_editor_or_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'edit')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- 1. Policies for 'users'
CREATE POLICY "Enable read access for all authenticated users"
    ON users FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable update for users on their own profile"
    ON users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable insert access for admin users"
    ON users FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Enable update access for admin users"
    ON users FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Enable delete access for admin users"
    ON users FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- 2. Policies for 'document_categories'
CREATE POLICY "Enable read for all authenticated users"
    ON document_categories FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable write operations for admins only"
    ON document_categories FOR ALL
    TO authenticated
    USING (public.is_admin());

-- 3. Policies for 'documents'
CREATE POLICY "Enable read access for viewable documents"
    ON documents FOR SELECT
    TO authenticated
    USING (
        -- Admins and editors can see all documents
        public.is_editor_or_admin()
        OR
        -- Viewers can only see published documents
        (status = 'published')
    );

CREATE POLICY "Enable write operations for editors and admins"
    ON documents FOR ALL
    TO authenticated
    USING (public.is_editor_or_admin());

-- 4. Policies for 'document_assignments'
CREATE POLICY "Enable read assignments for all authenticated users"
    ON document_assignments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable write assignments for editors and admins"
    ON document_assignments FOR ALL
    TO authenticated
    USING (public.is_editor_or_admin());

-- 5. Policies for 'document_acknowledgements'
CREATE POLICY "Enable read acknowledgements for all authenticated"
    ON document_acknowledgements FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable users to insert/update their own acknowledgements"
    ON document_acknowledgements FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. Policies for 'document_views'
CREATE POLICY "Enable read views for all authenticated"
    ON document_views FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable users to track their own views"
    ON document_views FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. Policies for 'activity_logs'
CREATE POLICY "Enable read activity logs for all authenticated"
    ON activity_logs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable activity log creation for anyone"
    ON activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 8. Policies for 'attachments'
CREATE POLICY "Enable read attachments for authenticated"
    ON attachments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable write attachments for editors and admins"
    ON attachments FOR ALL
    TO authenticated
    USING (public.is_editor_or_admin());


-- -------------------------------------------------------------
-- Profile sync trigger from auth.users
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'view')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- -------------------------------------------------------------
-- Credentials Vault Table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('hosting','domain','cms','database','email','social','api','other')),
    username TEXT,
    password TEXT,
    url TEXT,
    notes TEXT,
    recovery_codes TEXT,
    recovery_file_name TEXT,
    recovery_file_path TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_credentials_updated_at
    BEFORE UPDATE ON credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read credentials
CREATE POLICY "Enable read credentials for all authenticated"
    ON credentials FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can insert/update/delete credentials
CREATE POLICY "Enable write credentials for admins only"
    ON credentials FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -------------------------------------------------------------
-- Task Reminders Table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_name TEXT NOT NULL,
    task_type TEXT NOT NULL,
    description TEXT,
    interval_type TEXT NOT NULL CHECK (interval_type IN ('weekly', 'monthly', 'date')),
    interval_value TEXT NOT NULL,
    frequency INTEGER NOT NULL DEFAULT 1,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_task_reminders_updated_at
    BEFORE UPDATE ON task_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read reminders for all authenticated"
    ON task_reminders FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable write reminders for editors and admins"
    ON task_reminders FOR ALL
    TO authenticated
    USING (public.is_editor_or_admin());


-- -------------------------------------------------------------
-- 9. Portfolio Projects Table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cat TEXT NOT NULL,
    year TEXT NOT NULL,
    title TEXT NOT NULL,
    client TEXT NOT NULL,
    tagline TEXT NOT NULL,
    headline TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "shortDesc" TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    thumb TEXT NOT NULL,
    gallery TEXT[] NOT NULL DEFAULT '{}',
    stats JSONB NOT NULL DEFAULT '[]',
    feedback JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
    sequence INTEGER,
    video_type TEXT,
    video_url TEXT,
    industry TEXT,
    sprint TEXT,
    client_logo TEXT,
    overview_title TEXT,
    challenge TEXT,
    approach TEXT,
    impact TEXT,
    compliance TEXT,
    process JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sequence INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS video_type TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sprint TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_logo TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS overview_title TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS challenge TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS approach TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS impact TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS compliance TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS process JSONB NOT NULL DEFAULT '[]';

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read projects for all authenticated"
    ON projects FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable public read for published projects"
    ON projects FOR SELECT
    TO anon
    USING (status = 'published');

CREATE POLICY "Enable write projects for admin users only"
    ON projects FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Seed Projects (Optional)
-- INSERT INTO projects (cat, year, title, client, tagline, headline, "desc", "shortDesc", tags, thumb, gallery, stats, feedback) VALUES
-- ('web', '2025', 'MERIDIAN', 'Meridian Goods', 'One Team, One Vision\nEvery Channel Driving Growth', 'MARKETING\nWITHOUT GAPS,\nGROWTH WITHOUT\nLIMITS', 'A headless e-commerce platform built with Next.js, delivering lightning-fast page loads and a seamless checkout experience powered by Stripe and Sanity CMS.', 'A headless e-commerce platform.', ARRAY['Next.js','Sanity CMS','Stripe'], 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1400&q=85', ARRAY['https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1400&q=85','https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=900&q=85','https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&q=85'], '[{"num":"3.8\u00d7","label":"Conversion"},{"num":"$4M+","label":"GMV"},{"num":"0.8s","label":"LCP"},{"num":"99.9%","label":"Uptime"}]'::jsonb, '[{"name":"Sarah Holden","role":"CEO \u00b7 Meridian","text":"Revti Tech completely transformed our online business. Revenue nearly doubled within six months."},{"name":"James Park","role":"Customer","text":"The checkout flow is the smoothest I have ever used \u2014 fast, clear, zero friction."}]'::jsonb),
-- ('mobile', '2025', 'PETAL', 'Petal Health', 'Your Wellness,\nPersonalised Daily', 'WELLNESS\nWITHOUT\nBARRIERS', 'A mental wellness app with AI-powered mood tracking, journaling, and personalised insights built on React Native and Firebase, used by 200K+ people.', 'A wellness app.', ARRAY['React Native','Firebase','AI'], 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1400&q=85', ARRAY['https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1400&q=85','https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=900&q=85','https://images.unsplash.com/photo-1551650975-87deedd944c3?w=900&q=85'], '[{"num":"200K","label":"Users"},{"num":"4.8\u2605","label":"App Store"},{"num":"68%","label":"Retention"},{"num":"12min","label":"Session"}]'::jsonb, '[{"name":"Dr. Leena","role":"Clinical Advisor","text":"Remarkably sensitive design that respects the emotional nature of the content."},{"name":"Alex T.","role":"Reviewer","text":"Finally an app that understands what wellness feels like. Stuck with it for a year."}]'::jsonb),
-- ('brand', '2024', 'NOVA', 'Nova Financial', 'A Brand Built\nFor the Future', 'IDENTITY\nTHAT OPENS\nDOORS', 'A complete brand identity overhaul for a fintech firm \u2014 logo, type system, colour palette, and a 320-component design system shipped in just six weeks.', 'Complete brand overhaul.', ARRAY['Branding','Design Systems','Strategy'], 'https://images.unsplash.com/photo-1634733988138-bf2c3a2a13fa?w=1400&q=85', ARRAY['https://images.unsplash.com/photo-1634733988138-bf2c3a2a13fa?w=1400&q=85','https://images.unsplash.com/photo-1561070791-2526d30994b5?w=900&q=85','https://images.unsplash.com/photo-1558655146-d09347e92766?w=900&q=85'], '[{"num":"42%","label":"Recall \u2191"},{"num":"320+","label":"Components"},{"num":"6wk","label":"Delivery"},{"num":"3","label":"Markets"}]'::jsonb, '[{"name":"Marcus Webb","role":"CMO \u00b7 Nova","text":"It finally reflects who we are. The new identity opened doors we had been knocking on for years."},{"name":"Priya S.","role":"Design Manager","text":"The design system alone made our team ship three times faster."}]'::jsonb);



-- -------------------------------------------------------------
-- Project Management Module (Projects -> Workstreams -> Tasks)
-- -------------------------------------------------------------
DROP TABLE IF EXISTS pm_tasks CASCADE;
DROP TABLE IF EXISTS pm_workstreams CASCADE;
DROP TABLE IF EXISTS pm_projects CASCADE;

CREATE TABLE pm_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    client TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'archived')),
    view_mode TEXT NOT NULL DEFAULT 'gantt' CHECK (view_mode IN ('gantt', 'list')),
    start_date DATE,
    end_date DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pm_workstreams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#0EA5E9',
    sequence INTEGER NOT NULL DEFAULT 0,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workstream_id UUID NOT NULL REFERENCES pm_workstreams(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'blocked', 'done')),
    assignee TEXT,
    start_date DATE,
    due_date DATE,
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    time_taken_minutes INTEGER CHECK (time_taken_minutes IS NULL OR time_taken_minutes >= 0),
    sequence INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pm_workstreams_project ON pm_workstreams(project_id);
CREATE INDEX idx_pm_tasks_workstream ON pm_tasks(workstream_id);
CREATE INDEX idx_pm_tasks_project ON pm_tasks(project_id);

CREATE TRIGGER update_pm_projects_updated_at BEFORE UPDATE ON pm_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pm_workstreams_updated_at BEFORE UPDATE ON pm_workstreams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pm_tasks_updated_at BEFORE UPDATE ON pm_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE pm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_workstreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read pm_projects for all authenticated" ON pm_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable write pm_projects for admin/edit" ON pm_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable read pm_workstreams for all authenticated" ON pm_workstreams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable write pm_workstreams for admin/edit" ON pm_workstreams FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable read pm_tasks for all authenticated" ON pm_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable write pm_tasks for admin/edit" ON pm_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
