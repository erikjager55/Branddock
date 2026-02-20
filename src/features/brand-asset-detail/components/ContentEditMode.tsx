"use client";

import { useState } from "react";
import { Button, Card } from "@/components/shared";
import { Save, X } from "lucide-react";
import { useUpdateContent } from "../hooks/useBrandAssetDetail";

interface ContentEditModeProps {
  assetId: string;
  initialContent: string;
  onCancel: () => void;
  onSaved: () => void;
}

export function ContentEditMode({
  assetId,
  initialContent,
  onCancel,
  onSaved,
}: ContentEditModeProps) {
  const [content, setContent] = useState(initialContent);
  const [changeNote, setChangeNote] = useState("");
  const updateContent = useUpdateContent(assetId);

  const handleSave = () => {
    updateContent.mutate(
      { content, changeNote: changeNote || undefined },
      { onSuccess: () => onSaved() }
    );
  };

  return (
    <Card>
      <Card.Header>
        <h2 className="text-lg font-semibold text-gray-900">Edit Content</h2>
      </Card.Header>
      <Card.Body>
        <div className="space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[200px] max-h-[400px] p-3 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
            placeholder="Enter brand asset content..."
          />
          <input
            type="text"
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            className="w-full p-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Change note (optional)"
          />
        </div>
      </Card.Body>
      <Card.Footer>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" icon={X} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="cta"
            size="sm"
            icon={Save}
            onClick={handleSave}
            isLoading={updateContent.isPending}
            disabled={!content.trim() || content === initialContent}
          >
            Save Changes
          </Button>
        </div>
      </Card.Footer>
    </Card>
  );
}
