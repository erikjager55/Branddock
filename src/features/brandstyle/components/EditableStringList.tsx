"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/shared";

interface EditableStringListProps {
  items: string[];
  onSave: (items: string[]) => void;
  canEdit: boolean;
  isSaving?: boolean;
  placeholder?: string;
  children: (items: string[]) => React.ReactNode;
  title: string;
}

/** Wraps a string[] display with inline edit capability (add/remove/reorder items). */
export function EditableStringList({
  items,
  onSave,
  canEdit,
  isSaving,
  placeholder = "Add new item...",
  children,
  title,
}: EditableStringListProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");

  const startEdit = () => {
    setEditItems([...items]);
    setNewItem("");
    setIsEditing(true);
  };

  const cancel = () => {
    setIsEditing(false);
    setEditItems([]);
    setNewItem("");
  };

  const save = () => {
    onSave(editItems.filter((i) => i.trim()));
    setIsEditing(false);
  };

  const addItem = () => {
    if (newItem.trim()) {
      setEditItems([...editItems, newItem.trim()]);
      setNewItem("");
    }
  };

  const removeItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    setEditItems(editItems.map((item, i) => (i === index ? value : item)));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {canEdit && !isEditing && (
          <button
            onClick={startEdit}
            className="p-1 text-gray-400 hover:text-teal-600 transition-colors"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          {editItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={item}
                onChange={(e) => updateItem(i, e.target.value)}
                className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={() => removeItem(i)}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem();
                }
              }}
              placeholder={placeholder}
              className="flex-1 text-sm px-3 py-1.5 border border-dashed border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              onClick={addItem}
              className="p-1 text-gray-400 hover:text-teal-600"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="primary" size="sm" onClick={save} isLoading={isSaving}>
              Save
            </Button>
            <Button variant="secondary" size="sm" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        children(items)
      )}
    </div>
  );
}
