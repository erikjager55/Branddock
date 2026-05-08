import React from 'react';
import { QuestionnaireManager as UpdatedManager } from './QuestionnaireManagerUpdated';

export function QuestionnaireManager(props: React.ComponentProps<typeof UpdatedManager>) {
  return <UpdatedManager {...props} />;
}

export default QuestionnaireManager;