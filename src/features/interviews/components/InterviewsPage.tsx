'use client';

import { Plus } from 'lucide-react';
import { useInterviews, useCreateInterview, useDeleteInterview, useDuplicateInterview } from '../hooks/useInterviews';
import { useInterviewStore } from '../stores/useInterviewStore';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { Button, SkeletonCard } from '@/components/shared';
import { InterviewStatusCounters } from './InterviewStatusCounters';
import { InterviewCard } from './InterviewCard';
import { InterviewWizard } from './wizard/InterviewWizard';

interface InterviewsPageProps {
  assetId: string;
  onBack: () => void;
}

export function InterviewsPage({ assetId, onBack }: InterviewsPageProps) {
  const { data, isLoading } = useInterviews(assetId);
  const createInterview = useCreateInterview(assetId);
  const deleteInterview = useDeleteInterview(assetId);
  const duplicateInterview = useDuplicateInterview(assetId);

  const selectedInterviewId = useInterviewStore((s) => s.selectedInterviewId);
  const setSelectedInterview = useInterviewStore((s) => s.setSelectedInterview);

  const handleAdd = () => {
    createInterview.mutate(undefined, {
      onSuccess: (data) => {
        setSelectedInterview(data.interview.id);
      },
    });
  };

  const handleView = (id: string) => {
    setSelectedInterview(id);
  };

  const handleDelete = (id: string) => {
    deleteInterview.mutate(id);
  };

  const handleDuplicate = (id: string) => {
    duplicateInterview.mutate(id);
  };

  const handleBackFromWizard = () => {
    setSelectedInterview(null);
  };

  // Wizard mode
  if (selectedInterviewId) {
    return (
      <InterviewWizard
        assetId={assetId}
        interviewId={selectedInterviewId}
        onBack={handleBackFromWizard}
      />
    );
  }

  // Overview mode
  const interviews = data?.interviews ?? [];
  const stats = data?.stats ?? { total: 0, toSchedule: 0, scheduled: 0, completed: 0, inReview: 0 };

  return (
    <PageShell>
      <PageHeader
        moduleKey="brand-foundation"
        title="Interviews"
        subtitle="Conduct structured interviews with stakeholders"
        actions={
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Interview
          </Button>
        }
      />

      <InterviewStatusCounters stats={stats} />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : interviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No interviews yet. Add your first interview to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {interviews.map((interview) => (
            <InterviewCard
              key={interview.id}
              interview={interview}
              onView={handleView}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
