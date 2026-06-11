"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Menu, ChevronDown, User as UserIcon, Shield, Check, FileText } from "lucide-react";
import { useUser } from "@/lib/context/user-context";
import { getWorkspaceService, DocumentWithRelations } from "@/lib/services/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

export function Topbar() {
  const router = useRouter();
  const { user, users, switchPersona } = useUser();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DocumentWithRelations[]>([]);
  const [allDocs, setAllDocs] = useState<DocumentWithRelations[]>([]);

  // Fetch all documents on mount for local search
  useEffect(() => {
    async function loadDocuments() {
      try {
        const service = getWorkspaceService();
        const docs = await service.getDocuments();
        setAllDocs(docs);
      } catch (err) {
        console.error("Failed to load documents for search:", err);
      }
    }
    loadDocuments();
  }, [searchOpen]);

  // Live filter search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const filtered = allDocs.filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) ||
        doc.content.toLowerCase().includes(q) ||
        (doc.category && doc.category.name.toLowerCase().includes(q))
    );
    setSearchResults(filtered);
  }, [searchQuery, allDocs]);

  const handleResultClick = (docId: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(`/knowledge-base/${docId}`);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin (Full Access)";
      case "edit":
        return "Editor (Create & Edit)";
      case "view":
      default:
        return "Viewer (Read Only)";
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-[#1E2D47] bg-[#07090F]/80 px-6 backdrop-blur-md">
      {/* Mobile Drawer Trigger */}
      <div className="flex items-center gap-4 lg:hidden">
        <Sheet>
          <SheetTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#94A3B8] hover:text-white hover:bg-[#0F1629] cursor-pointer outline-none">
            <Menu className="h-6 w-6" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 border-[#1E2D47] bg-[#07090F]">
            <Sidebar className="w-full relative" />
          </SheetContent>
        </Sheet>
        <span className="font-bold text-white text-lg tracking-tight">Revti Workspace</span>
      </div>

      {/* Global Search Bar (Trigger) */}
      <div className="hidden md:flex flex-1 max-w-md">
        <Button
          variant="outline"
          onClick={() => setSearchOpen(true)}
          className="w-full justify-start text-[#94A3B8] border-[#1E2D47] bg-[#0F1629]/40 hover:bg-[#0F1629]/80 hover:text-white"
        >
          <Search className="mr-2 h-4 w-4 shrink-0 text-[#94A3B8]" />
          <span>Search documents, SOPs, policies...</span>
          <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border border-[#1E2D47] bg-[#07090F] px-1.5 font-mono text-[10px] font-medium text-[#94A3B8] opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>

      {/* Mobile Search Button */}
      <div className="flex md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSearchOpen(true)}
          className="text-[#94A3B8] hover:text-white hover:bg-[#0F1629]"
        >
          <Search className="h-5 w-5" />
        </Button>
      </div>

      {/* Right Navigation Elements: User Switcher */}
      <div className="flex items-center gap-4">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 border border-[#1E2D47] bg-[#0F1629]/40 px-3 py-1.5 text-sm font-medium hover:bg-[#0F1629] text-white rounded-md cursor-pointer transition-colors outline-none">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0EA5E9]/20 text-[#0EA5E9]">
                <UserIcon className="h-3.5 w-3.5" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="max-w-[120px] truncate text-xs font-semibold">{user.full_name}</p>
                <p className="text-[9px] text-[#94A3B8] capitalize">{user.role}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 border-[#1E2D47] bg-[#0F1629] text-white">
              <div className="px-2.5 py-1.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">ACTING PERSONA</div>
              <div className="px-2 py-1.5">
                <p className="text-sm font-bold text-white">{user.full_name}</p>
                <p className="text-xs text-[#94A3B8]">{user.email}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] bg-[#07090F] px-2 py-1 rounded border border-[#1E2D47] text-indigo-300">
                  <Shield className="h-3.5 w-3.5 text-[#0EA5E9]" />
                  <span>{getRoleLabel(user.role)}</span>
                </div>
              </div>
              <DropdownMenuSeparator className="bg-[#1E2D47]" />
              <div className="px-2.5 py-1.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">SWITCH PERSONA FOR TESTING</div>
              {users.map((u) => (
                <DropdownMenuItem
                  key={u.id}
                  onClick={() => switchPersona(u.id)}
                  className="flex items-center justify-between cursor-pointer hover:bg-[#1E2D47] focus:bg-[#1E2D47] text-white"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{u.full_name}</span>
                    <span className="text-[10px] text-[#94A3B8] capitalize">{u.role}</span>
                  </div>
                  {u.id === user.id && <Check className="h-4 w-4 text-[#0EA5E9]" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Global Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-2xl border-[#1E2D47] bg-[#0F1629] p-0 text-white shadow-2xl">
          <DialogHeader className="p-4 border-b border-[#1E2D47]">
            <DialogTitle className="sr-only">Search Workspace</DialogTitle>
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Type title, category, or keywords to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-0 bg-transparent text-sm text-white placeholder-[#94A3B8] outline-none focus:ring-0"
                autoFocus
              />
            </div>
          </DialogHeader>

          <div className="max-h-[350px] overflow-y-auto p-2">
            {searchQuery === "" ? (
              <div className="p-8 text-center text-sm text-[#94A3B8]">
                Type search query to query documents, SOPs, policies, and materials.
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#94A3B8]">
                No matching documents found.
              </div>
            ) : (
              <div className="space-y-1">
                {searchResults.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleResultClick(doc.id)}
                    className="w-full flex items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[#1E2D47]"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-[#0EA5E9]" />
                      <div>
                        <p className="font-semibold text-white">{doc.title}</p>
                        <p className="text-xs text-[#94A3B8] truncate max-w-[400px]">
                          {doc.content.replace(/<[^>]*>/g, " ").substring(0, 80)}...
                        </p>
                      </div>
                    </div>
                    {doc.category && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${doc.category.color}20`,
                          color: doc.category.color,
                          border: `1px solid ${doc.category.color}40`,
                        }}
                      >
                        {doc.category.name}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
