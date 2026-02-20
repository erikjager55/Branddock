'use client';

import { useHelpStore } from '@/stores/useHelpStore';

const TAGS = [
  'Popular',
  'Getting started',
  'Features',
  'Billing',
  'API',
  'Troubleshooting',
] as const;

export function QuickTags() {
  const activeTag = useHelpStore((s) => s.activeTag);
  const setActiveTag = useHelpStore((s) => s.setActiveTag);

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {TAGS.map((tag) => {
        const isActive = activeTag === tag;
        return (
          <button
            key={tag}
            onClick={() => setActiveTag(isActive ? null : tag)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
