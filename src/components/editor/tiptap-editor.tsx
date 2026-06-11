"use client";

import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Pilcrow,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-brand-primary underline cursor-pointer",
        },
      }),
    ],
    content: content || "<p></p>",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-[#1E2D47] bg-[#0F1629]/20">
        <span className="text-sm text-[#94A3B8] animate-pulse">Loading Editor...</span>
      </div>
    );
  }

  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="flex flex-col rounded-lg border border-[#1E2D47] bg-[#0F1629]/30 focus-within:border-[#0EA5E9]/50 transition-colors">
      {/* Editor Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-[#1E2D47] bg-[#0F1629]/70 p-2 rounded-t-lg">
        {/* Paragraph & Headings */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`h-8 w-8 text-slate-300 hover:text-white ${editor.isActive("paragraph") ? "bg-[#1E2D47] text-white" : ""}`}
          title="Paragraph"
        >
          <Pilcrow className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`h-8 w-8 text-slate-300 hover:text-white ${editor.isActive("heading", { level: 1 }) ? "bg-[#1E2D47] text-white" : ""}`}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`h-8 w-8 text-slate-300 hover:text-white ${editor.isActive("heading", { level: 2 }) ? "bg-[#1E2D47] text-white" : ""}`}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`h-8 w-8 text-slate-300 hover:text-white ${editor.isActive("heading", { level: 3 }) ? "bg-[#1E2D47] text-white" : ""}`}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <div className="h-4 w-[1px] bg-[#1E2D47] mx-1" />

        {/* Basic Formats */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-8 w-8 text-slate-300 hover:text-white ${editor.isActive("bold") ? "bg-[#1E2D47] text-white" : ""}`}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-8 w-8 text-slate-300 hover:text-white ${editor.isActive("italic") ? "bg-[#1E2D47] text-white" : ""}`}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`h-8 w-8 text-slate-300 hover:text-white ${editor.isActive("underline") ? "bg-[#1E2D47] text-white" : ""}`}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <div className="h-4 w-[1px] bg-[#1E2D47] mx-1" />

        {/* Lists & Checkboxes */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-8 w-8 text-slate-300 hover:text-white ${editor.isActive("bulletList") ? "bg-[#1E2D47] text-white" : ""}`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`h-8 w-8 text-slate-300 hover:text-white ${editor.isActive("orderedList") ? "bg-[#1E2D47] text-white" : ""}`}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`h-8 w-8 text-slate-300 hover:text-white ${editor.isActive("taskList") ? "bg-[#1E2D47] text-white" : ""}`}
          title="Checklist"
        >
          <CheckSquare className="h-4 w-4" />
        </Button>

        <div className="h-4 w-[1px] bg-[#1E2D47] mx-1" />

        {/* Code, Quote, Table, Divider, Links */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`h-8 w-8 text-slate-300 hover:text-white ${editor.isActive("codeBlock") ? "bg-[#1E2D47] text-white" : ""}`}
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`h-8 w-8 text-slate-300 hover:text-white ${editor.isActive("blockquote") ? "bg-[#1E2D47] text-white" : ""}`}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="h-8 w-8 text-slate-300 hover:text-white"
          title="Divider Line"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={addLink}
          className={`h-8 w-8 text-slate-300 hover:text-white ${editor.isActive("link") ? "bg-[#1E2D47] text-[#0EA5E9]" : ""}`}
          title="Hyperlink"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={addImage}
          className="h-8 w-8 text-slate-300 hover:text-white"
          title="Embed Image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={addTable}
          className="h-8 w-8 text-slate-300 hover:text-white"
          title="Insert Table Grid"
        >
          <TableIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Content Area */}
      <div className="p-4 md:p-6 min-h-[300px] text-slate-100">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
