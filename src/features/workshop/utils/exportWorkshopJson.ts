import type { Workshop } from '../types/workshop.types';

/** Export workshop data as a JSON download */
export function exportWorkshopJson(workshop: Workshop) {
  try {
  const exportPayload = {
    metadata: {
      exportedAt: new Date().toISOString(),
      workshopTitle: workshop.title,
      status: workshop.status,
      completedAt: workshop.completedAt,
      scheduledDate: workshop.scheduledDate,
      scheduledTime: workshop.scheduledTime,
      durationMinutes: workshop.durationMinutes,
      facilitatorName: workshop.facilitatorName,
      participantCount: workshop.participantCount,
    },
    participants: workshop.participants,
    executiveSummary: workshop.executiveSummary,
    findings: workshop.findings,
    recommendations: workshop.recommendations,
    canvasData: workshop.canvasData,
    steps: workshop.steps,
    notes: workshop.notes,
    objectives: workshop.objectives,
    agendaItems: workshop.agendaItems,
    photos: workshop.photos,
  };

  const json = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filename = (workshop.title ?? '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) || 'workshop';
  link.download = `workshop-${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[exportWorkshopJson] Failed to generate JSON export:', error);
    alert('Failed to generate JSON export. Please try again.');
  }
}
