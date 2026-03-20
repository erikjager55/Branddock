import type { Interview } from '../types/interview.types';

/** Export interview data as a JSON download */
export function exportInterviewJson(interview: Interview) {
  try {
  const exportPayload = {
    metadata: {
      exportedAt: new Date().toISOString(),
      title: interview.title,
      status: interview.status,
      interviewee: {
        name: interview.intervieweeName,
        position: interview.intervieweePosition,
        company: interview.intervieweeCompany,
        email: interview.intervieweeEmail,
      },
      scheduledDate: interview.scheduledDate,
      scheduledTime: interview.scheduledTime,
      durationMinutes: interview.durationMinutes,
      actualDuration: interview.actualDuration,
      approvedAt: interview.approvedAt,
    },
    questions: interview.questions.map((q) => ({
      questionType: q.questionType,
      questionText: q.questionText,
      options: q.options,
      isAnswered: q.isAnswered,
      answerText: q.answerText,
      answerOptions: q.answerOptions,
      answerRating: q.answerRating,
      answerRanking: q.answerRanking,
    })),
    generalNotes: interview.generalNotes,
    selectedAssets: interview.selectedAssets,
  };

  const json = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filename = (interview.intervieweeName || interview.title || `interview-${interview.orderNumber}`)
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) || 'interview';
  link.download = `interview-${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[exportInterviewJson] Failed to generate JSON export:', error);
    alert('Failed to generate JSON export. Please try again.');
  }
}
