import type { ScanSummary, ModuleScoreData, AlignmentIssueData } from '@/types/brand-alignment';

interface AlignmentJsonData {
  scan: ScanSummary;
  modules: ModuleScoreData[];
  issues: AlignmentIssueData[];
}

/** Export Brand Alignment scan data as a JSON download */
export function exportAlignmentJson(data: AlignmentJsonData) {
  try {
  const exportPayload = {
    metadata: {
      exportedAt: new Date().toISOString(),
      scanId: data.scan.id,
      scanDate: data.scan.completedAt ?? data.scan.startedAt,
      overallScore: data.scan.score,
    },
    scan: data.scan,
    modules: data.modules,
    issues: data.issues,
  };

  const json = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `brand-alignment-scan.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[exportAlignmentJson] Failed to generate JSON export:', error);
    alert('Failed to generate JSON export. Please try again.');
  }
}
