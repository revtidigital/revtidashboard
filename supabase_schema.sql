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
