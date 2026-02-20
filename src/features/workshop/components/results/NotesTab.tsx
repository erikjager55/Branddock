'use client';

import { useState } from 'react';
import { Button } from '@/components/shared';
import { Plus, StickyNote } from 'lucide-react';
import { NoteCard } from './NoteCard';
import type { WorkshopNote } from '../../types/workshop.types';

interface NotesTabProps {
  notes: WorkshopNote[];
  onAddNote: (data: {
    authorName: string;
    authorRole?: string;
    content: string;
  }) => void;
  isAdding: boolean;
}

export function NotesTab({ notes, onAddNote, isAdding }: NotesTabProps) {
  const safeNotes = Array.isArray(notes) ? notes : [];
  const [showForm, setShowForm] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (!authorName.trim() || !content.trim()) return;
    onAddNote({
      authorName: authorName.trim(),
      authorRole: authorRole.trim() || undefined,
      content: content.trim(),
    });
    setAuthorName('');
    setAuthorRole('');
    setContent('');
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-teal-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Participant Notes
          </h3>
          <span className="text-sm text-gray-500">({safeNotes.length})</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={Plus}
          onClick={() => setShowForm(!showForm)}
        >
          Add Note
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Your name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="text"
              placeholder="Role (optional)"
              value={authorRole}
              onChange={(e) => setAuthorRole(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <textarea
            placeholder="Write your note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="cta"
              size="sm"
              onClick={handleSubmit}
              isLoading={isAdding}
              disabled={!authorName.trim() || !content.trim()}
            >
              Save Note
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {safeNotes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </div>
  );
}
