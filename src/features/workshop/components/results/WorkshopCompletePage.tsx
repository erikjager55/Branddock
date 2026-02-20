'use client';

import { ChevronLeft } from 'lucide-react';
import { SkeletonCard } from '@/components/shared';
import { PageShell } from '@/components/ui/layout';
import { useWorkshopDetail } from '../../hooks/useWorkshopDetail';
import { useWorkshopReport } from '../../hooks/useWorkshopReport';
import { useWorkshopNotes } from '../../hooks/useWorkshopNotes';
import { useAddNote } from '../../hooks/useAddNote';
import { useGenerateWorkshopReport } from '../../hooks/useGenerateReport';
import { useUpdateCanvas } from '../../hooks/useUpdateCanvas';
import { useWorkshopStore } from '../../store/useWorkshopStore';
import { CompleteBanner } from './CompleteBanner';
import { ResultsTabs } from './ResultsTabs';
import { OverviewTab } from './OverviewTab';
import { CanvasTab } from './CanvasTab';
import { WorkshopDetailsTab } from './WorkshopDetailsTab';
import { NotesTab } from './NotesTab';
import { GalleryTab } from './GalleryTab';

interface WorkshopCompletePageProps {
  workshopId: string;
  onBack: () => void;
  onOpenInGoldenCircle?: () => void;
}

export function WorkshopCompletePage({
  workshopId,
  onBack,
  onOpenInGoldenCircle,
}: WorkshopCompletePageProps) {
  const { data, isLoading } = useWorkshopDetail(workshopId);
  const reportQuery = useWorkshopReport(workshopId, true);
  const notesQuery = useWorkshopNotes(workshopId);
  const addNoteMutation = useAddNote(workshopId);
  const generateMutation = useGenerateWorkshopReport(workshopId);
  const canvasMutation = useUpdateCanvas(workshopId);

  const { activeTab, setActiveTab, canvasEditing, setCanvasEditing } =
    useWorkshopStore();

  const workshop = data?.workshop;

  const handleExportRaw = () => {
    window.open(`/api/workshops/${workshopId}/report/raw`, '_blank');
  };

  const handleToggleCanvasLock = () => {
    if (!workshop) return;
    canvasMutation.mutate({
      canvasData: (workshop.canvasData as Record<string, unknown>) ?? {},
      canvasLocked: !workshop.canvasLocked,
    });
  };

  if (isLoading) {
    return (
      <PageShell>
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      </PageShell>
    );
  }

  if (!workshop) {
    return (
      <PageShell>
      <div className="text-center py-12 text-gray-500">
        Workshop not found.
      </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
    <div data-testid="workshop-complete-page">
      {/* Breadcrumb */}
      <button
        data-testid="back-to-asset-button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Asset
      </button>

      <CompleteBanner workshop={workshop} onExportRaw={handleExportRaw} />

      <ResultsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'overview' && (
        <OverviewTab
          reportGenerated={workshop.reportGenerated}
          executiveSummary={
            reportQuery.data?.executiveSummary ?? workshop.executiveSummary
          }
          findings={reportQuery.data?.findings ?? workshop.findings}
          recommendations={
            reportQuery.data?.recommendations ?? workshop.recommendations
          }
          onGenerateReport={() => generateMutation.mutate()}
          isGenerating={generateMutation.isPending}
        />
      )}

      {activeTab === 'canvas' && (
        <CanvasTab
          canvasData={
            (workshop.canvasData as Record<string, unknown>) ?? null
          }
          canvasLocked={workshop.canvasLocked}
          isEditing={canvasEditing}
          onToggleLock={handleToggleCanvasLock}
          onToggleEdit={() => setCanvasEditing(!canvasEditing)}
          onOpenInGoldenCircle={onOpenInGoldenCircle}
        />
      )}

      {activeTab === 'workshop' && (
        <WorkshopDetailsTab
          objectives={workshop.objectives}
          participants={workshop.participants}
          agendaItems={workshop.agendaItems}
        />
      )}

      {activeTab === 'notes' && (
        <NotesTab
          notes={notesQuery.data?.notes ?? workshop.notes}
          onAddNote={(noteData) => addNoteMutation.mutate(noteData)}
          isAdding={addNoteMutation.isPending}
        />
      )}

      {activeTab === 'gallery' && <GalleryTab photos={workshop.photos} />}
    </div>
    </PageShell>
  );
}
