"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Eye,
  FileText,
  UserCheck,
  User as UserIcon,
  Shield,
  Edit2,
  Clock,
  ExternalLink,
  CornerDownRight,
  Layers,
} from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/lib/context/user-context";
import {
  getWorkspaceService,
  DocumentWithRelations,
  DocumentAnalytics,
  Assignment,
} from "@/lib/services/api";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AssignDialog } from "@/components/assign-dialog";

interface ViewDocumentPageProps {
  params: Promise<{ id: string }>;
}

export default function ViewDocumentPage({ params }: ViewDocumentPageProps) {
  const { id } = use(params);
  return (
    <LayoutShell>
      <ViewDocumentContent id={id} />
    </LayoutShell>
  );
}

function ViewDocumentContent({ id }: { id: string }) {
  const router = useRouter();
  const { user, users } = useUser();
  const [doc, setDoc] = useState<DocumentWithRelations | null>(null);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [ackChecked, setAckChecked] = useState(false);
  const [analytics, setAnalytics] = useState<DocumentAnalytics | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingAck, setIsSubmittingAck] = useState(false);

  // Assignment Modal
  const [assignOpen, setAssignOpen] = useState(false);

  const loadDocumentData = async () => {
    if (!user) return;
    try {
      const service = getWorkspaceService();
      
      // 1. Fetch document details
      const documentDetails = await service.getDocument(id);
      if (!documentDetails) {
        alert("Document not found");
        router.push("/knowledge-base");
        return;
      }
      
      // If document is draft/archived and user is 'view', redirect
      if (documentDetails.status !== "published" && user.role === "view") {
        router.push("/knowledge-base");
        return;
      }
      
      setDoc(documentDetails);

      // 2. Track view automatically
      await service.trackView(id, user.id);

      // 3. Check acknowledgement status
      const acknowledged = await service.hasUserAcknowledged(id, user.id);
      setHasAcknowledged(acknowledged);
      setAckChecked(acknowledged);

      // 4. Fetch assignments
      const assigns = await service.getDocumentAssignments(id);
      setAssignments(assigns);

      // 5. Fetch analytics (only for editor/admin)
      if (user.role !== "view") {
        const analyticsData = await service.getDocumentAnalytics(id);
        setAnalytics(analyticsData);
      }
    } catch (err) {
      console.error("Failed to load document info:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocumentData();
  }, [id, user]);

  const handleAcknowledge = async () => {
    if (!user || hasAcknowledged || !ackChecked) return;
    setIsSubmittingAck(true);
    try {
      const service = getWorkspaceService();
      await service.acknowledgeDocument(id, user.id);
      setHasAcknowledged(true);
      
      // Reload analytics if administrator
      if (user.role !== "view") {
        const analyticsData = await service.getDocumentAnalytics(id);
        setAnalytics(analyticsData);
      }
    } catch (err: any) {
      console.error("Failed to submit acknowledgement:", err);
      alert("Failed to submit acknowledgement: " + (err?.message || String(err)));
    } finally {
      setIsSubmittingAck(false);
    }
  };

  const handleRemoveAssignment = async (assignId: string) => {
    try {
      const service = getWorkspaceService();
      await service.removeAssignment(assignId);
      // Reload assignments
      const assigns = await service.getDocumentAssignments(id);
      setAssignments(assigns);
      if (user?.role !== "view") {
        const analyticsData = await service.getDocumentAnalytics(id);
        setAnalytics(analyticsData);
      }
    } catch (err) {
      console.error("Failed to remove assignment:", err);
    }
  };

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

  if (!doc) return null;

  const showSidebar = user?.role !== "view";

  return (
    <div className="flex flex-col gap-6">
      {/* Top action header */}
      <div className="flex items-center justify-between border-b border-[#1E2D47] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/knowledge-base">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white hover:bg-[#0F1629]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <span className="text-sm text-slate-500 hover:text-[#0EA5E9] transition-colors">
            <Link href="/knowledge-base">Knowledge Base</Link>
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-sm font-semibold truncate max-w-[200px]">{doc.title}</span>
        </div>
        {user?.role !== "view" && (
          <Link href={`/knowledge-base/edit/${doc.id}`}>
            <Button
              className="bg-[#0F1629] hover:bg-[#1E2D47] text-slate-300 border border-[#1E2D47] hover:text-white flex items-center gap-1.5 font-medium transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              Edit Document
            </Button>
          </Link>
        )}
      </div>

      {/* Grid structure: Reader layout vs Analytics sidebar */}
      <div className="grid gap-6 lg:grid-cols-4">
        
        {/* Document Content Reading Pane */}
        <div className={`space-y-6 ${showSidebar ? "lg:col-span-3" : "lg:col-span-4 max-w-4xl mx-auto w-full"}`}>
          <div className="space-y-4">
            {/* Metadata headers */}
            <div className="flex flex-wrap items-center gap-2">
              {doc.category && (
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
              )}
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-[#0F1629] border border-[#1E2D47] text-slate-300">
                VERSION {doc.version}
              </span>
              {doc.status === "draft" && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B]">
                  DRAFT MODE
                </span>
              )}
              {doc.status === "archived" && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-500/10 border border-slate-500/30 text-slate-400">
                  ARCHIVED
                </span>
              )}
            </div>

            {/* Parent SOP breadcrumb for sub-SOPs */}
            {doc.parent && (
              <Link
                href={`/knowledge-base/${doc.parent.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#0EA5E9] transition-colors"
              >
                <CornerDownRight className="h-3.5 w-3.5" />
                <span>Sub-SOP of</span>
                <span className="text-slate-200">{doc.parent.title}</span>
              </Link>
            )}

            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              {doc.title}
            </h1>

            <div className="flex items-center gap-2 text-xs text-[#94A3B8] border-b border-[#1E2D47]/50 pb-4">
              <span className="font-semibold text-slate-300">{doc.creator?.full_name || "System"}</span>
              <span>•</span>
              <span>Updated {formatRelativeTime(doc.updated_at)}</span>
            </div>
          </div>

          {/* HTML Render Content Box */}
          <div
            className="tiptap prose prose-invert max-w-none text-slate-200"
            dangerouslySetInnerHTML={{ __html: doc.content }}
          />

          {/* Sub-SOPs (child documents) */}
          {doc.children && doc.children.length > 0 && (
            <Card className="border-[#1E2D47] bg-[#0F1629] p-6 text-white">
              <div className="flex items-center gap-2 border-b border-[#1E2D47] pb-3 mb-4">
                <Layers className="h-4 w-4 text-[#0EA5E9]" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8]">
                  Sub-SOPs ({doc.children.length})
                </h2>
              </div>
              <div className="flex flex-col divide-y divide-[#1E2D47]/50">
                {[...doc.children]
                  .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }))
                  .map((child) => (
                  <Link
                    key={child.id}
                    href={`/knowledge-base/${child.id}`}
                    className="flex items-center justify-between gap-2 py-2.5 group"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      <span className="text-sm text-slate-200 group-hover:text-[#0EA5E9] transition-colors truncate">
                        {child.title}
                      </span>
                    </span>
                    <span className="text-[10px] font-semibold uppercase text-slate-500 shrink-0">
                      {child.status}
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Acknowledgement System panel */}
          {doc.status === "published" && (
            <Card className="border-[#1E2D47] bg-[#0F1629] p-6 text-white mt-12 transition-all duration-300">
              <h2 className="text-lg font-bold text-white mb-2">Document Acknowledgement</h2>
              <p className="text-xs text-[#94A3B8] mb-6">
                Please read this document carefully. By checking the box below and submitting, you acknowledge that you have read, understood, and agreed to follow these procedures.
              </p>

              {hasAcknowledged ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E]">
                  <CheckCircle className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-semibold">Acknowledgement Signed</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      You signed off on this document.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="ack-checkbox"
                      checked={ackChecked}
                      onCheckedChange={(checked) => setAckChecked(Boolean(checked))}
                      className="border-[#1E2D47] text-[#0EA5E9] bg-[#07090F] focus:ring-[#0EA5E9] h-4.5 w-4.5 mt-0.5"
                    />
                    <label
                      htmlFor="ack-checkbox"
                      className="text-sm text-slate-300 font-medium select-none cursor-pointer leading-relaxed"
                    >
                      I have read and fully understood the contents of this document.
                    </label>
                  </div>

                  <Button
                    onClick={handleAcknowledge}
                    disabled={!ackChecked || isSubmittingAck}
                    className="self-start bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-medium"
                  >
                    {isSubmittingAck ? "Submitting..." : "Submit Acknowledgement"}
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right Sidebar: Analytics & Assignments */}
        {showSidebar && (
          <div className="space-y-6">
            
            {/* Quick Analytics Summary */}
            {analytics && (
              <Card className="border-[#1E2D47] bg-[#0F1629] p-5 text-white">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#1E2D47] pb-3 mb-4">
                  Document Analytics
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-400">Total Views</span>
                    <p className="text-2xl font-extrabold text-white mt-1 flex items-center gap-1.5">
                      <Eye className="h-4 w-4 text-[#38BDF8]" />
                      {analytics.totalViews}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Unique Views</span>
                    <p className="text-2xl font-extrabold text-white mt-1 flex items-center gap-1.5">
                      <UserIcon className="h-4 w-4 text-[#0EA5E9]" />
                      {analytics.uniqueViews}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#1E2D47]/50">
                  <span className="text-xs text-slate-400">Acknowledgements</span>
                  <p className="text-2xl font-extrabold text-[#22C55E] mt-1 flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" />
                    {analytics.acknowledgedCount}
                  </p>
                </div>
              </Card>
            )}

            {/* Assignments Sidebar Panel */}
            <Card className="border-[#1E2D47] bg-[#0F1629] p-5 text-white">
              <div className="flex items-center justify-between border-b border-[#1E2D47] pb-3 mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                  Assignments
                </h2>
                <Button
                  onClick={() => setAssignOpen(true)}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-[#0EA5E9] hover:bg-[#0EA5E9]/10"
                >
                  Assign
                </Button>
              </div>

              <div className="space-y-3">
                {assignments.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">No active assignments.</p>
                ) : (
                  assignments.map((assign) => (
                    <div
                      key={assign.id}
                      className="text-xs p-2.5 rounded bg-[#07090F] border border-[#1E2D47] space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-slate-200">
                          {assign.assigned_user?.full_name || `Team ${assign.team}`}
                        </span>
                        <Button
                          onClick={() => handleRemoveAssignment(assign.id)}
                          variant="ghost"
                          className="h-4 px-1 text-[10px] text-red-400 hover:text-red-300 hover:bg-transparent"
                        >
                          Remove
                        </Button>
                      </div>
                      {assign.due_date && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Calendar className="h-3 w-3" />
                          <span>Due {new Date(assign.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      )}
                      {assign.notes && (
                        <p className="text-[10px] text-slate-500 italic mt-1 leading-normal">
                          &ldquo;{assign.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Read-Tracking Details Panel */}
            {analytics && (
              <Card className="border-[#1E2D47] bg-[#0F1629] p-5 text-white">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#1E2D47] pb-3 mb-4">
                  Read Tracking Detail
                </h2>

                <div className="max-h-[220px] overflow-y-auto space-y-3">
                  {analytics.views.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">No reader records.</p>
                  ) : (
                    analytics.views.map((v) => {
                      const isAcked = analytics.acknowledgements.some((a) => a.user_id === v.user_id);
                      return (
                        <div key={v.id} className="flex items-start justify-between gap-2 text-xs pb-2 border-b border-[#1E2D47]/30 last:border-b-0 last:pb-0">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-200 truncate">
                              {v.user?.full_name || "Unknown"}
                            </p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" />
                              Viewed {v.view_count}x • {formatRelativeTime(v.last_viewed_at)}
                            </p>
                          </div>
                          <div>
                            {isAcked ? (
                              <span className="inline-flex items-center text-[10px] text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/30 rounded px-1 font-medium">
                                Signed
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded px-1 font-medium">
                                Unsigned
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            )}

          </div>
        )}
      </div>

      {/* Reusable Assignment Dialog launcher */}
      <AssignDialog
        documentId={doc.id}
        documentTitle={doc.title}
        isOpen={assignOpen}
        onOpenChange={setAssignOpen}
        onAssignSuccess={loadDocumentData}
      />
    </div>
  );
}
