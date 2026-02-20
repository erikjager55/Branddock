'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

const resources = [
  { label: 'API Documentation', href: '#' },
  { label: 'Developer Blog', href: '#' },
  { label: 'Community Forum', href: '#' },
  { label: 'Product Changelog', href: '#' },
  { label: 'System Status Page', href: '#' },
  { label: 'Brand Guidelines', href: '#' },
];

export function ResourceLinks() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Resources</h2>
      <div className="space-y-2">
        {resources.map((resource) => (
          <a
            key={resource.label}
            href={resource.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-2 px-3 rounded-lg text-primary hover:text-primary/80 hover:bg-primary/5 transition-colors"
          >
            <span className="text-sm font-medium">{resource.label}</span>
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
          </a>
        ))}
      </div>
    </section>
  );
}
