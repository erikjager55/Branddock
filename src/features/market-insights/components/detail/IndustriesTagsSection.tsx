'use client';

interface IndustriesTagsSectionProps {
  industries: string[];
  tags: string[];
}

export function IndustriesTagsSection({ industries, tags }: IndustriesTagsSectionProps) {
  return (
    <div className="space-y-4">
      {industries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Industries</h3>
          <ul className="space-y-1">
            {industries.map((industry) => (
              <li key={industry} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0" />
                {industry}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tags.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 border border-gray-200 text-gray-600 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
