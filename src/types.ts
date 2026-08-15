export type ViewTab = 'editor' | 'contribution' | 'timeline';

export type AssignmentMode = 'individual' | 'group';

export interface TimelineEvent {
  id: string;
  time: string;
  type: 'open' | 'edit' | 'paste' | 'contribution' | 'reorder' | 'sealed';
  description: string;
  actor?: string;
  details?: string;
  tag?: string;
}

export interface Contributor {
  name: string;
  role: string;
  percentage: number;
  wordCount: number;
  activeTime: string;
  avatarColor: string;
  assignedSections: string[];
}

export interface WorkflowStep {
  number: string;
  title: string;
  description: string;
  badge: string;
  detailPoints: string[];
}
