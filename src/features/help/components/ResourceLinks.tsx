'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';

const resources = [
  { id: 'apiDocs', href: '#' },
  { id: 'developerBlog', href: '#' },
  { id: 'communityForum', href: '#' },
  { id: 'changelog', href: '#' },
  { id: 'statusPage', href: '#' },
  { id: 'brandGuidelines', href: '#' },
] as const;

export function ResourceLinks() {
  const { t } = useTranslation('help');
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('resources.title')}</h2>
      <div className="space-y-2">
        {resources.map((resource) => (
          <a
            key={resource.id}
            href={resource.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-2 px-3 rounded-lg text-primary hover:text-primary/80 hover:bg-primary/5 transition-colors"
          >
            <span className="text-sm font-medium">{t(`resources.links.${resource.id}`)}</span>
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
          </a>
        ))}
      </div>
    </section>
  );
}
