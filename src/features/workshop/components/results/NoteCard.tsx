'use client';

import { User } from 'lucide-react';
import type { WorkshopNote } from '../../types/workshop.types';

interface NoteCardProps {
  note: WorkshopNote;
}

export function NoteCard({ note }: NoteCardProps) {
  const timeAgo = new Date(note.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="p-4 bg-white border border-gray-100 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">
              {note.authorName}
            </span>
            {note.authorRole && (
              <span className="text-xs text-gray-500">{note.authorRole}</span>
            )}
            <span className="text-xs text-gray-400 ml-auto">{timeAgo}</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {note.content}
          </p>
        </div>
      </div>
    </div>
  );
}
