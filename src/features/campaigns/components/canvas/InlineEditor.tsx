'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, X, Check } from 'lucide-react';
import { Button } from '@/components/shared';
import { STUDIO } from '@/lib/constants/design-tokens';

interface InlineEditorProps {
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

export function InlineEditor({ initialContent, onSave, onCancel }: InlineEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Underline,
      CharacterCount,
    ],
    content: initialContent,
    autofocus: true,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] p-2',
      },
      handleKeyDown: (_, event) => {
        if (event.key === 'Escape') {
          onCancel();
          return true;
        }
        return false;
      },
    },
  });

  const handleSave = useCallback(() => {
    if (!editor) return;
    onSave(editor.getHTML());
  }, [editor, onSave]);

  const handleAddLink = useCallback(() => {
    if (!editor) return;
    if (showLinkInput) {
      setShowLinkInput(false);
      setLinkUrl('');
      return;
    }
    const existingHref = editor.getAttributes('link').href ?? '';
    setLinkUrl(existingHref);
    setShowLinkInput(true);
  }, [editor, showLinkInput]);

  const handleApplyLink = useCallback(() => {
    if (!editor) return;
    const trimmed = linkUrl.trim();
    if (trimmed) {
      // Block dangerous protocols (javascript:, data:, vbscript:)
      const protocol = trimmed.split(':')[0]?.toLowerCase();
      if (protocol && !['http', 'https', 'mailto'].includes(protocol)) {
        return;
      }
      editor.chain().focus().setLink({ href: trimmed }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  useEffect(() => {
    if (showLinkInput && linkInputRef.current) {
      linkInputRef.current.focus();
    }
  }, [showLinkInput]);

  if (!editor) return null;

  return (
    <div
      className="rounded border border-teal-200 bg-white"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Minimal toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-100">
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('link')}
          onClick={handleAddLink}
          title="Link"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {/* Inline link input */}
      {showLinkInput && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100 bg-gray-50">
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') handleApplyLink();
              if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl(''); }
            }}
            placeholder="https://example.com"
            className="flex-1 text-xs px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-teal-400"
          />
          <button
            type="button"
            onClick={handleApplyLink}
            className="p-1 rounded hover:bg-gray-200 text-emerald-600"
            title="Apply link"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => { setShowLinkInput(false); setLinkUrl(''); }}
            className="p-1 rounded hover:bg-gray-200 text-gray-400"
            title="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Actions */}
      <div className="flex items-center justify-between px-2 py-1.5 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {editor.storage.characterCount?.characters() ?? 0} characters
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        active
          ? `${STUDIO.toolbar.active.bg} ${STUDIO.toolbar.active.text}`
          : `${STUDIO.toolbar.inactive.text} ${STUDIO.toolbar.inactive.hover}`
      }`}
      title={title}
    >
      {children}
    </button>
  );
}
