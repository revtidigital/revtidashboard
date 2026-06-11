"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Eye,
  Edit2,
  UserCheck,
  Copy,
  Archive,
  Trash2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/lib/context/user-context";
import {
  getWorkspaceService,
  DocumentWithRelations,
  Category,
} from "@/lib/services/api";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AssignDialog } from "@/components/assign-dialog";

export default function KnowledgeBasePage() {
  return (
    <LayoutShell>
      <KnowledgeBaseContent />
    </LayoutShell>
  );
}

function KnowledgeBaseContent() {
  const router = useRouter();
  const { user } = useUser();
  const [documents, setDocuments] = useState<DocumentWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Assignment Modal State
  const [assignTarget, setAssignTarget] = useState<{ id: string; title: string } | null>(null);

  const loadData = async () => {
    try {
      const service = getWorkspaceService();
      const docs = await service.getDocuments();
      const cats = await service.getCategories();
      
      // Filter out non-published documents if user role is 'view'
      if (user?.role === "view") {
        setDocuments(docs.filter((d) => d.status === "published"));
      } else {
        setDocuments(docs);
      }
      setCategories(cats);
    } catch (err) {
      console.error("Failed to load knowledge base:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Actions
  const handleDuplicate = async (docId: string) => {
    try {
      const service = getWorkspaceService();
      await service.duplicateDocument(docId);
      loadData();
    } catch (err) {
      console.error("Failed to duplicate document:", err);
    }
  };

  const handleArchive = async (docId: string) => {
    try {
      const service = getWorkspaceService();
      await service.updateDocument(docId, { status: "archived" });
      loadData();
    } catch (err) {
      console.error("Failed to archive document:", err);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to permanently delete this document?")) return;
    try {
      const service = getWorkspaceService();
      await service.deleteDocument(docId);
      loadData();
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  // Filter & Search computation
  const filteredDocuments = documents.filter((doc) => {
    const matchesCategory =
      selectedCategory === "all" || doc.category?.slug === selectedCategory;
    
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.category && doc.category.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return (
          <span className="inline-flex items-center rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 px-2 py-0.5 text-xs font-semibold text-[#22C55E]">
            Published
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 px-2 py-0.5 text-xs font-semibold text-[#F59E0B]">
            Draft
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex items-center rounded-full bg-slate-500/10 border border-slate-500/30 px-2 py-0.5 text-xs font-semibold text-slate-400">
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-10 w-48 rounded bg-[#0F1629] animate-pulse" />
        <div className="h-12 w-full rounded bg-[#0F1629] animate-pulse" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 rounded bg-[#0F1629] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Top section: Header & Create button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Knowledge Base
          </h1>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Access internal guides, standard operating procedures, documentation, and tools.
          </p>
        </div>
        {user?.role !== "view" && (
          <Button
            onClick={() => router.push("/knowledge-base/edit/new")}
            className="self-start sm:self-auto bg-[#0EA5E9] hover:bg-[#0284C7] text-white flex items-center gap-2 font-medium"
          >
            <Plus className="h-4 w-4" />
            Create Document
          </Button>
        )}
      </div>

      {/* Search Bar & Category Filter Chips */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#94A3B8]" />
          <Input
            placeholder="Search documents by title, contents, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-[#1E2D47] bg-[#0F1629]/40 text-white placeholder-slate-500 focus:ring-[#0EA5E9] focus:border-[#0EA5E9]"
          />
        </div>

        {/* Categories Chips */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#1E2D47]/50 pb-4">
          <Button
            onClick={() => setSelectedCategory("all")}
            variant={selectedCategory === "all" ? "default" : "outline"}
            className={`rounded-full text-xs font-semibold px-4 py-1.5 h-auto ${
              selectedCategory === "all"
                ? "bg-[#0EA5E9] text-white"
                : "border-[#1E2D47] text-slate-300 bg-[#0F1629]/20 hover:bg-[#0F1629]"
            }`}
          >
            All Documents
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              variant={selectedCategory === cat.slug ? "default" : "outline"}
              className={`rounded-full text-xs font-semibold px-4 py-1.5 h-auto border`}
              style={{
                borderColor: selectedCategory === cat.slug ? cat.color : "#1E2D47",
                backgroundColor: selectedCategory === cat.slug ? cat.color : "#0F162910",
                color: selectedCategory === cat.slug ? "#FFFFFF" : "#CBD5E1",
              }}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid of Documents */}
      {filteredDocuments.length === 0 ? (
        <Card className="border-[#1E2D47] bg-[#0F1629] p-12 text-center text-white flex flex-col items-center justify-center">
          <FileText className="h-12 w-12 text-slate-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No documents found</h3>
          <p className="text-sm text-[#94A3B8] max-w-sm">
            Try adjusting your search query, selecting another category, or creating a new document to get started.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <Card
              key={doc.id}
              className="flex flex-col relative border-[#1E2D47] bg-[#0F1629] p-5 text-white transition-all duration-300 hover:-translate-y-1 hover:border-[#0EA5E9]/40 hover:shadow-[0_4px_25px_-5px_rgba(124,92,252,0.1)]"
            >
              {/* Header: Category and Actions */}
              <div className="flex items-center justify-between mb-4">
                {doc.category ? (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${doc.category.color}20`,
                      color: doc.category.color,
                      border: `1px solid ${doc.category.color}30`,
                    }}
                  >
                    {doc.category.name}
                  </span>
                ) : (
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase bg-slate-500/10 text-slate-400 border border-slate-500/20">
                    Uncategorized
                  </span>
                )}

                {/* Actions Trigger */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-[#1E2D47]/50 cursor-pointer">
                    <MoreVertical className="h-4.5 w-4.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="border-[#1E2D47] bg-[#0F1629] text-white">
                    <DropdownMenuItem
                      onClick={() => router.push(`/knowledge-base/${doc.id}`)}
                      className="flex items-center gap-2 cursor-pointer hover:bg-[#1E2D47] text-white"
                    >
                      <Eye className="h-4 w-4 text-slate-400" />
                      <span>View document</span>
                    </DropdownMenuItem>

                    {user?.role !== "view" && (
                      <>
                        <DropdownMenuItem
                          onClick={() => router.push(`/knowledge-base/edit/${doc.id}`)}
                          className="flex items-center gap-2 cursor-pointer hover:bg-[#1E2D47] text-white"
                        >
                          <Edit2 className="h-4 w-4 text-slate-400" />
                          <span>Edit document</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => setAssignTarget({ id: doc.id, title: doc.title })}
                          className="flex items-center gap-2 cursor-pointer hover:bg-[#1E2D47] text-white"
                        >
                          <UserCheck className="h-4 w-4 text-slate-400" />
                          <span>Assign users</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => handleDuplicate(doc.id)}
                          className="flex items-center gap-2 cursor-pointer hover:bg-[#1E2D47] text-white"
                        >
                          <Copy className="h-4 w-4 text-slate-400" />
                          <span>Duplicate copy</span>
                        </DropdownMenuItem>

                        {doc.status !== "archived" && (
                          <DropdownMenuItem
                            onClick={() => handleArchive(doc.id)}
                            className="flex items-center gap-2 cursor-pointer hover:bg-[#1E2D47] text-white"
                          >
                            <Archive className="h-4 w-4 text-slate-400" />
                            <span>Archive file</span>
                          </DropdownMenuItem>
                        )}
                      </>
                    )}

                    {user?.role === "admin" && (
                      <>
                        <DropdownMenuSeparator className="bg-[#1E2D47]" />
                        <DropdownMenuItem
                          onClick={() => handleDelete(doc.id)}
                          className="flex items-center gap-2 cursor-pointer text-[#EF4444] hover:bg-[#EF4444]/10"
                        >
                          <Trash2 className="h-4 w-4 text-[#EF4444]" />
                          <span>Delete permanently</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Title & Version info */}
              <div className="flex-1 flex flex-col justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white text-base leading-snug tracking-tight hover:text-[#0EA5E9] transition-colors cursor-pointer" onClick={() => router.push(`/knowledge-base/${doc.id}`)}>
                    {doc.title}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    VERSION {doc.version}
                  </p>
                </div>
              </div>

              {/* Footer metadata */}
              <div className="flex items-center justify-between border-t border-[#1E2D47] pt-4 mt-auto">
                <span className="text-[11px] text-[#94A3B8]">
                  Updated {formatRelativeTime(doc.updated_at)}
                </span>
                {getStatusBadge(doc.status)}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Assignment Modal */}
      {assignTarget && (
        <AssignDialog
          documentId={assignTarget.id}
          documentTitle={assignTarget.title}
          isOpen={true}
          onOpenChange={(open) => {
            if (!open) setAssignTarget(null);
          }}
          onAssignSuccess={() => {
            setAssignTarget(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
