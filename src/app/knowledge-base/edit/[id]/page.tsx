"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Globe, Eye, Archive as ArchiveIcon } from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/lib/context/user-context";
import { getWorkspaceService, Category, DocumentWithRelations } from "@/lib/services/api";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditDocumentPageProps {
  params: Promise<{ id: string }>;
}

export default function EditDocumentPage({ params }: EditDocumentPageProps) {
  const { id } = use(params);
  return (
    <LayoutShell>
      <EditDocumentContent id={id} />
    </LayoutShell>
  );
}

function EditDocumentContent({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useUser();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [document, setDocument] = useState<DocumentWithRelations | null>(null);
  const [allDocuments, setAllDocuments] = useState<DocumentWithRelations[]>([]);

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [parentId, setParentId] = useState<string>("none");
  const [version, setVersion] = useState("1.0");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isNew = id === "new";

  useEffect(() => {
    if (!user) return;

    // Check permissions
    if (user.role === "view") {
      router.push("/knowledge-base");
      return;
    }

    async function loadData() {
      setIsLoading(true);
      try {
        const service = getWorkspaceService();
        const [cats, docs] = await Promise.all([
          service.getCategories(),
          service.getDocuments(),
        ]);
        setCategories(cats);
        setAllDocuments(docs);

        if (!isNew) {
          const doc = await service.getDocument(id);
          if (!doc) {
            alert("Document not found");
            router.push("/knowledge-base");
            return;
          }
          setDocument(doc);
          setTitle(doc.title);
          setContent(doc.content);
          setCategoryId(doc.category_id || "none");
          setParentId(doc.parent_id || "none");
          setVersion(doc.version);
          setStatus(doc.status);
        }
      } catch (err) {
        console.error("Failed to load document for editing:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [id, isNew, user, router]);

  const handleSave = async (customStatus?: "draft" | "published" | "archived") => {
    setIsSaving(true);
    const resolvedStatus = customStatus || status;
    try {
      const service = getWorkspaceService();
      const payload = {
        title: title.trim() || "Untitled Document",
        content,
        category_id: categoryId === "none" ? null : categoryId,
        parent_id: parentId === "none" ? null : parentId,
        version: version.trim() || "1.0",
        status: resolvedStatus,
      };

      let resultDocId = id;
      if (isNew) {
        const newDoc = await service.createDocument(payload);
        resultDocId = newDoc.id;
      } else {
        await service.updateDocument(id, payload);
      }
      
      router.push(`/knowledge-base/${resultDocId}`);
      router.refresh();
    } catch (err: any) {
      console.error("Failed to save document:", err);
      alert("Failed to save document: " + (err?.message || String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  // Build the set of documents that cannot be chosen as a parent:
  // the document itself and all of its descendants (prevents cycles).
  const invalidParentIds = React.useMemo(() => {
    const blocked = new Set<string>();
    if (isNew) return blocked;
    blocked.add(id);
    let changed = true;
    while (changed) {
      changed = false;
      for (const d of allDocuments) {
        if (d.parent_id && blocked.has(d.parent_id) && !blocked.has(d.id)) {
          blocked.add(d.id);
          changed = true;
        }
      }
    }
    return blocked;
  }, [allDocuments, id, isNew]);

  const parentOptions = allDocuments.filter((d) => !invalidParentIds.has(d.id));

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 rounded-full bg-[#0F1629] animate-pulse" />
          <div className="h-8 w-64 rounded bg-[#0F1629] animate-pulse" />
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          <div className="md:col-span-3 h-96 rounded bg-[#0F1629] animate-pulse" />
          <div className="h-96 rounded bg-[#0F1629] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top action header */}
      <div className="flex items-center justify-between border-b border-[#1E2D47] pb-4">
        <div className="flex items-center gap-3">
          <Link href={isNew ? "/knowledge-base" : `/knowledge-base/${id}`}>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white hover:bg-[#0F1629]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-white">
            {isNew ? "Create Document" : `Edit: ${document?.title}`}
          </h1>
        </div>
        
        {/* Mobile quick save indicators */}
        <div className="flex items-center gap-2 md:hidden">
          <Button
            size="sm"
            onClick={() => handleSave(status)}
            disabled={isSaving}
            className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
          >
            <Save className="h-4 w-4 mr-1.5" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Main editor page layout grid */}
      <div className="grid gap-6 md:grid-cols-4">
        
        {/* Editor Body */}
        <div className="space-y-4 md:col-span-3">
          <div className="space-y-2">
            <Label htmlFor="doc-title-input" className="sr-only">Document Title</Label>
            <input
              id="doc-title-input"
              type="text"
              placeholder="Document Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-0 border-b border-[#1E2D47] bg-transparent pb-2 text-2xl font-bold text-white placeholder-slate-600 outline-none focus:border-[#0EA5E9]/80 focus:ring-0 transition-colors"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-400">Document Content</Label>
            <TiptapEditor
              content={content}
              onChange={(html) => setContent(html)}
            />
          </div>
        </div>

        {/* Sidebar Info Panel */}
        <div className="space-y-6">
          <Card className="border-[#1E2D47] bg-[#0F1629] p-5 text-white">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#1E2D47] pb-3 mb-4">
              Document Settings
            </h2>

            <div className="space-y-4">
              {/* Category selector */}
              <div className="space-y-1.5">
                <Label htmlFor="category-select" className="text-xs font-semibold text-slate-300">Category</Label>
                <Select value={categoryId} onValueChange={(val) => setCategoryId(val || "none")}>
                  <SelectTrigger id="category-select" className="w-full border-[#1E2D47] bg-[#07090F] text-white">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white">
                    <SelectItem value="none" className="hover:bg-[#1E2D47] focus:bg-[#1E2D47]">Uncategorized</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="hover:bg-[#1E2D47] focus:bg-[#1E2D47]">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parent SOP selector */}
              <div className="space-y-1.5">
                <Label htmlFor="parent-select" className="text-xs font-semibold text-slate-300">Parent SOP</Label>
                <Select value={parentId} onValueChange={(val) => setParentId(val || "none")}>
                  <SelectTrigger id="parent-select" className="w-full border-[#1E2D47] bg-[#07090F] text-white">
                    <SelectValue placeholder="Top-level SOP" />
                  </SelectTrigger>
                  <SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white">
                    <SelectItem value="none" className="hover:bg-[#1E2D47] focus:bg-[#1E2D47]">None (Top-level SOP)</SelectItem>
                    {parentOptions.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="hover:bg-[#1E2D47] focus:bg-[#1E2D47]">
                        {d.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-500">
                  Leave as top-level, or nest this document under a parent SOP as a sub-SOP.
                </p>
              </div>

              {/* Version input */}
              <div className="space-y-1.5">
                <Label htmlFor="version-input" className="text-xs font-semibold text-slate-300">Version</Label>
                <Input
                  id="version-input"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0"
                  className="border-[#1E2D47] bg-[#07090F] text-white focus:ring-[#0EA5E9]"
                />
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="status-select" className="text-xs font-semibold text-slate-300">Status</Label>
                <Select
                  value={status}
                  onValueChange={(val) => setStatus((val as "draft" | "published" | "archived") || "draft")}
                >
                  <SelectTrigger id="status-select" className="w-full border-[#1E2D47] bg-[#07090F] text-white">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent className="border-[#1E2D47] bg-[#0F1629] text-white">
                    <SelectItem value="draft" className="hover:bg-[#1E2D47] focus:bg-[#1E2D47]">Draft</SelectItem>
                    <SelectItem value="published" className="hover:bg-[#1E2D47] focus:bg-[#1E2D47]">Published</SelectItem>
                    <SelectItem value="archived" className="hover:bg-[#1E2D47] focus:bg-[#1E2D47]">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Read-only Meta */}
              {!isNew && document && (
                <div className="pt-3 border-t border-[#1E2D47]/50 space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Author:</span>
                    <span className="font-medium text-white">{document.creator?.full_name || "System"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{new Date(document.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Updated:</span>
                    <span>{new Date(document.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Action Row panel */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => handleSave("published")}
              disabled={isSaving}
              className="w-full bg-[#0EA5E9] hover:bg-[#0284C7] text-white flex items-center justify-center gap-2 font-medium"
            >
              <Globe className="h-4 w-4" />
              Publish Document
            </Button>
            
            <Button
              onClick={() => handleSave("draft")}
              disabled={isSaving}
              variant="outline"
              className="w-full border-[#1E2D47] bg-[#0F1629]/40 text-slate-200 hover:bg-[#1E2D47] flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save as Draft
            </Button>

            {!isNew && status !== "archived" && (
              <Button
                onClick={() => handleSave("archived")}
                disabled={isSaving}
                variant="ghost"
                className="w-full text-slate-400 hover:text-white hover:bg-[#EF4444]/10 hover:text-[#EF4444] flex items-center justify-center gap-2 border border-transparent hover:border-[#EF4444]/20"
              >
                <ArchiveIcon className="h-4 w-4" />
                Archive Document
              </Button>
            )}
            
            <Link href={isNew ? "/knowledge-base" : `/knowledge-base/${id}`} className="w-full">
              <Button
                variant="ghost"
                className="w-full text-slate-500 hover:text-white"
              >
                Cancel
              </Button>
            </Link>
          </div>
        </div>
        
      </div>
    </div>
  );
}
