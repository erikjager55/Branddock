'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  X,
  Check,
  Scissors,
  Zap,
  Sparkles,
  Type,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/shared';
import { STUDIO } from '@/lib/constants/design-tokens';
import { useInlineTransform } from '../../hooks/canvas.hooks';

const MAX_SELECTED_TEXT_LENGTH = 5000;

type TransformAction = 'shorter' | 'urgent' | 'brand_voice' | 'simplify';

interface InlineEditorProps {
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
  deliverableId?: string;
}

export function InlineEditor({ initialContent, onSave, onCancel, deliverableId }: InlineEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [activeAction, setActiveAction] = useState<TransformAction | null>(null);
  const activeActionRef = useRef<TransformAction | null>(null);
  const [transformError, setTransformError] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCancelRef = useRef(onCancel);

  const showError = useCallback((msg: string) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setTransformError(msg);
    errorTimerRef.current = setTimeout(() => setTransformError(null), 3000);
  }, []);

  // Sync refs so TipTap's stable handleKeyDown closure reads fresh values
  useEffect(() => {
    activeActionRef.current = activeAction;
  }, [activeAction]);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  // Cleanup error timer on unmount
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const { mutate: transformMutate, isPending: isTransformPending } = useInlineTransform(deliverableId ?? '');

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
          // Read from refs — TipTap's useEditor captures this closure once
          if (activeActionRef.current) return true;
          onCancelRef.current();
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

  const handleTransform = useCallback(
    (action: TransformAction) => {
      if (!editor || !deliverableId || isTransformPending) return;

      const { from, to } = editor.state.selection;
      if (from === to) return;

      const selectedText = editor.state.doc.textBetween(from, to, ' ');
      if (!selectedText.trim()) return;
      if (selectedText.length > MAX_SELECTED_TEXT_LENGTH) {
        showError(`Selection exceeds ${MAX_SELECTED_TEXT_LENGTH} characters.`);
        return;
      }

      // Close link input if open — avoids stale UI during transform
      setShowLinkInput(false);
      setLinkUrl('');

      setActiveAction(action);
      setTransformError(null);

      // Lock editor to prevent edits during async transform (stale position fix)
      editor.setEditable(false);

      transformMutate(
        {
          selectedText,
          action,
          fullContent: editor.getText().slice(0, 2000),
        },
        {
          onSuccess: (data) => {
            if (!editor.isDestroyed) {
              editor.setEditable(true);
              // Strip any HTML tags from AI response via DOM parser (more robust than regex)
              const doc = new DOMParser().parseFromString(data.transformedText, 'text/html');
              const cleanText = doc.body.textContent ?? data.transformedText;
              // Atomic replacement: select range then insert — TipTap handles position math
              editor
                .chain()
                .focus()
                .setTextSelection({ from, to })
                .insertContent(cleanText)
                .run();
            }
            setActiveAction(null);
          },
          onError: () => {
            if (!editor.isDestroyed) {
              editor.setEditable(true);
              editor.chain().focus().run();
            }
            setActiveAction(null);
            showError('Transform failed. Please try again.');
          },
        },
      );
    },
    [editor, deliverableId, isTransformPending, transformMutate, showError],
  );

  useEffect(() => {
    if (showLinkInput && linkInputRef.current) {
      linkInputRef.current.focus();
    }
  }, [showLinkInput]);

  if (!editor) return null;

  return (
    <div
      className="rounded border border-primary-200 bg-white"
      onClick={(e) => e.stopPropagation()}
    >
      {/* AI Bubble Menu — appears on text selection */}
      {deliverableId && (
        <BubbleMenu
          editor={editor}
        >
          <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white px-1 py-0.5 shadow-lg">
            <AiActionButton
              label="Shorter"
              icon={Scissors}
              action="shorter"
              activeAction={activeAction}
              onClick={handleTransform}
            />
            <AiActionButton
              label="Urgent"
              icon={Zap}
              action="urgent"
              activeAction={activeAction}
              onClick={handleTransform}
            />
            <AiActionButton
              label="Brand Voice"
              icon={Sparkles}
              action="brand_voice"
              activeAction={activeAction}
              onClick={handleTransform}
            />
            <AiActionButton
              label="Simplify"
              icon={Type}
              action="simplify"
              activeAction={activeAction}
              onClick={handleTransform}
            />
          </div>
        </BubbleMenu>
      )}

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
            className="flex-1 text-xs px-2 py-1 rounded border border-gray-200 focus:outline-none focus:border-primary-400"
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

      {/* Transform error feedback */}
      {transformError && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-red-100 bg-red-50 text-red-700 text-xs">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {transformError}
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

function AiActionButton({
  label,
  icon: Icon,
  action,
  activeAction,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: TransformAction;
  activeAction: TransformAction | null;
  onClick: (action: TransformAction) => void;
}) {
  const isLoading = activeAction === action;
  const isDisabled = activeAction !== null;

  return (
    <button
      type="button"
      onClick={() => onClick(action)}
      disabled={isDisabled}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
        isLoading
          ? `${STUDIO.toolbar.active.bg} ${STUDIO.toolbar.active.text}`
          : isDisabled
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
      title={label}
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {label}
    </button>
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
