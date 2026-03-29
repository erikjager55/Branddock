"use client";

import React, { useEffect, useCallback, useState, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Minus,
  FileText,
  X,
  Check,
  Unlink,
} from "lucide-react";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import { STUDIO } from "@/lib/constants/design-tokens";
import { EmptyState } from "@/components/shared";

interface TipTapEditorProps {
  isPreviewMode: boolean;
}

/** Toolbar button component */
function ToolbarButton({
  icon: Icon,
  label,
  isActive,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${
        isActive
          ? `${STUDIO.toolbar.active.bg} ${STUDIO.toolbar.active.text}`
          : `${STUDIO.toolbar.inactive.text} ${STUDIO.toolbar.inactive.hover}`
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      title={label}
      type="button"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/** Toolbar separator */
function ToolbarSeparator() {
  return <div className="w-px h-5 bg-gray-200 mx-1" />;
}

/** Inline link popover that replaces window.prompt() */
function LinkPopover({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const currentUrl = editor.getAttributes("link").href || "";
  const [url, setUrl] = useState(currentUrl || "https://");
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleApply = () => {
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    onClose();
  };

  const handleRemove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      className="absolute left-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center gap-1.5"
    >
      <input
        ref={inputRef}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleApply();
          if (e.key === "Escape") onClose();
        }}
        placeholder="https://example.com"
        className={`w-56 px-2 py-1 text-sm border border-gray-200 rounded focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none`}
      />
      <button
        type="button"
        onClick={handleApply}
        className={`p-1 rounded ${STUDIO.toolbar.active.text} hover:bg-primary-50`}
        title="Apply link"
      >
        <Check className="h-4 w-4" />
      </button>
      {currentUrl && (
        <button
          type="button"
          onClick={handleRemove}
          className="p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-red-500"
          title="Remove link"
        >
          <Unlink className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded text-gray-400 hover:bg-gray-100"
        title="Cancel"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Editor toolbar with formatting options */
function EditorToolbar({ editor }: { editor: Editor }) {
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  return (
    <div className="flex items-center gap-0.5 p-2 bg-white rounded-t-lg border border-b-0 flex-wrap">
      {/* Text formatting */}
      <ToolbarButton
        icon={Bold}
        label="Bold (Ctrl+B)"
        isActive={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={Italic}
        label="Italic (Ctrl+I)"
        isActive={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        icon={UnderlineIcon}
        label="Underline (Ctrl+U)"
        isActive={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <ToolbarButton
        icon={Strikethrough}
        label="Strikethrough"
        isActive={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />

      <ToolbarSeparator />

      {/* Headings */}
      <ToolbarButton
        icon={Heading1}
        label="Heading 1"
        isActive={editor.isActive("heading", { level: 1 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
      />
      <ToolbarButton
        icon={Heading2}
        label="Heading 2"
        isActive={editor.isActive("heading", { level: 2 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      />
      <ToolbarButton
        icon={Heading3}
        label="Heading 3"
        isActive={editor.isActive("heading", { level: 3 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
      />

      <ToolbarSeparator />

      {/* Lists */}
      <ToolbarButton
        icon={List}
        label="Bullet List"
        isActive={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        icon={ListOrdered}
        label="Numbered List"
        isActive={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />

      <ToolbarSeparator />

      {/* Block formatting */}
      <ToolbarButton
        icon={Quote}
        label="Blockquote"
        isActive={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <ToolbarButton
        icon={Minus}
        label="Horizontal Rule"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      />
      <div className="relative">
        <ToolbarButton
          icon={Link2}
          label="Link"
          isActive={editor.isActive("link")}
          onClick={() => setShowLinkPopover((prev) => !prev)}
        />
        {showLinkPopover && (
          <LinkPopover editor={editor} onClose={() => setShowLinkPopover(false)} />
        )}
      </div>

      <ToolbarSeparator />

      {/* Alignment */}
      <ToolbarButton
        icon={AlignLeft}
        label="Align Left"
        isActive={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      />
      <ToolbarButton
        icon={AlignCenter}
        label="Align Center"
        isActive={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      />
      <ToolbarButton
        icon={AlignRight}
        label="Align Right"
        isActive={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      />

      <ToolbarSeparator />

      {/* Undo / Redo */}
      <ToolbarButton
        icon={Undo2}
        label="Undo (Ctrl+Z)"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      />
      <ToolbarButton
        icon={Redo2}
        label="Redo (Ctrl+Shift+Z)"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      />

      {/* Word count */}
      <div className="ml-auto flex items-center gap-2 text-xs text-gray-400 pr-1">
        <span>{editor.storage.characterCount.words()} words</span>
        <span className="text-gray-300">|</span>
        <span>{editor.storage.characterCount.characters()} chars</span>
      </div>
    </div>
  );
}

/** TipTap-based rich text editor for the Content Studio */
export function TipTapEditor({ isPreviewMode }: TipTapEditorProps) {
  const textContent = useContentStudioStore((s) => s.textContent);
  const setTextContent = useContentStudioStore((s) => s.setTextContent);

  const handleUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      const html = editor.getHTML();
      // Avoid setting "<p></p>" as content
      const isEmpty = html === "<p></p>" || html === "";
      setTextContent(isEmpty ? "" : html);
    },
    [setTextContent]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: "Start typing or generate content with AI...",
      }),
      CharacterCount,
      Typography,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: textContent || "",
    editable: !isPreviewMode,
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[300px] text-gray-800",
      },
    },
  });

  // Sync external content changes (e.g., from AI generation) into the editor
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    const normalizedCurrent =
      currentHtml === "<p></p>" ? "" : currentHtml;

    if (textContent !== normalizedCurrent) {
      // Use queueMicrotask to avoid update-during-render
      queueMicrotask(() => {
        editor.commands.setContent(textContent || "", { emitUpdate: false });
      });
    }
  }, [textContent, editor]);

  // Toggle editable when preview mode changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isPreviewMode);
    }
  }, [isPreviewMode, editor]);

  // Empty state
  if (!textContent && !editor?.isFocused) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={FileText}
          title="No content yet"
          description="Write a prompt and click Generate to create content"
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-full">
      {/* Toolbar — only in edit mode */}
      {!isPreviewMode && editor && <EditorToolbar editor={editor} />}

      {/* Editor content */}
      <div
        className={`flex-1 bg-white ${
          isPreviewMode ? "rounded-lg shadow-sm border" : "rounded-b-lg border"
        } p-6 overflow-y-auto`}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
