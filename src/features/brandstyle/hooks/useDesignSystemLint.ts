"use client";

import { useQuery } from "@tanstack/react-query";
import { brandstyleKeys } from "./useBrandstyleHooks";
import type { LintReport } from "@/lib/export/design-system/linter";

export function useDesignSystemLint() {
  return useQuery<LintReport>({
    queryKey: [...brandstyleKeys.all, 'design-system-lint'],
    queryFn: async () => {
      const res = await fetch('/api/export/design-system/_lint');
      if (!res.ok) throw new Error('Lint fetch failed');
      return res.json();
    },
    staleTime: 30_000,
  });
}
