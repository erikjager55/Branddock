import React from 'react';
import { ValidationMethodButton } from '../validation/ValidationMethodButton';
import {
  FileText,
  Image,
  Video,
  Mail,
  Globe,
  Sparkles,
} from 'lucide-react';

interface Deliverable {
  id: string;
  name: string;
  type: 'document' | 'image' | 'video' | 'email' | 'website' | 'social';
  status: 'completed' | 'in-progress' | 'not-started';
  progress?: number;
}

interface DeliverableCardProps {
  deliverable: Deliverable;
  onWorkClick: () => void;
  onViewClick: () => void;
}

const deliverableIcons = {
  document: FileText,
  image: Image,
  video: Video,
  email: Mail,
  website: Globe,
  social: Sparkles
};

const getDeliverableTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    document: 'Document',
    image: 'Image',
    video: 'Video',
    email: 'Email',
    website: 'Website',
    social: 'Social Media'
  };
  return labels[type] || type;
};

export function DeliverableCard({ deliverable, onWorkClick, onViewClick }: DeliverableCardProps) {
  const DeliverableIcon = deliverableIcons[deliverable.type] || FileText;
  const typeLabel = getDeliverableTypeLabel(deliverable.type);
  
  // Map deliverable status to validation method status
  const validationStatus = deliverable.status === 'completed' ? 'completed' 
    : deliverable.status === 'in-progress' ? 'running' 
    : 'available';
  
  return (
    <ValidationMethodButton
      label={deliverable.name}
      description={typeLabel}
      type={deliverable.type}
      status={validationStatus}
      progress={deliverable.progress}
      icon={DeliverableIcon}
      onPrimaryClick={deliverable.status === 'completed' ? onViewClick : onWorkClick}
      showIcon={true}
    />
  );
}