"use client";

import { useQuery } from "@tanstack/react-query";
import { brandstyleKeys } from "./useBrandstyleHooks";

/**
 * Fetch the workspace-scoped canonical DesignSystemModel via the internal
 * `_model` format of /api/export/design-system/[format]/route.ts.
 *
 * Het model wordt uniform gebruikt door alle emitters — zie
 * src/lib/export/design-system/canonical.ts voor de shape.
 */
export function useDesignSystemModel() {
  return useQuery({
    queryKey: [...brandstyleKeys.all, 'design-system-model'],
    queryFn: async () => {
      const res = await fetch('/api/export/design-system/_model');
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch design-system model: ${res.status} ${text}`);
      }
      return res.json();
    },
    staleTime: 30_000,
  });
}
