"use client";

import React from "react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link2,
  Undo2,
  Redo2,
  FileText,
} from "lucide-react";
import { useContentStudioStore } from "@/stores/useContentStudioStore";

interface TextEditorProps {
  isPreviewMode: boolean;
}

const TOOLBAR_BUTTONS = [
  { icon: Bold, label: "Bold", command: "bold" },
  { icon: Italic, label: "Italic", command: "italic" },
  { icon: Heading1, label: "Heading 1", command: "h1" },
  { icon: Heading2, label: "Heading 2", command: "h2" },
  { icon: List, label: "Bullet List", command: "ul" },
  { icon: ListOrdered, label: "Numbered List", command: "ol" },
  { icon: Quote, label: "Quote", command: "blockquote" },
  { icon: Link2, label: "Link", command: "link" },
  null, // separator
  { icon: Undo2, label: "Undo", command: "undo" },
  { icon: Redo2, label: "Redo", command: "redo" },
];

export function TextEditor({ isPreviewMode }: TextEditorProps) {
  const { textContent, setTextContent } = useContentStudioStore();

  const handleFormat = (command: string) => {
    document.execCommand(command, false);
  };

  if (!textContent) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">No content yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Write a prompt and click Generate to create content
          </p>
        </div>
      </div>
    );
  }

  if (isPreviewMode) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm border p-8">
        <div
          className="prose prose-sm max-w-none text-gray-800"
          dangerouslySetInnerHTML={{ __html: textContent }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-2 bg-white rounded-t-lg border border-b-0">
        {TOOLBAR_BUTTONS.map((btn, i) => {
          if (!btn) {
            return <div key={i} className="w-px h-5 bg-gray-200 mx-1" />;
          }
          const BtnIcon = btn.icon;
          return (
            <button
              key={btn.command}
              onClick={() => handleFormat(btn.command)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
              title={btn.label}
            >
              <BtnIcon className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      {/* Editor */}
      <div
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => setTextContent(e.currentTarget.innerHTML)}
        dangerouslySetInnerHTML={{ __html: textContent }}
        className="flex-1 bg-white rounded-b-lg border p-6 prose prose-sm max-w-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent overflow-y-auto min-h-[300px]"
      />
    </div>
  );
}
