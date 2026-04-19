import { lazy, type ComponentType } from 'react';
import { type FeatureKey } from '../../stores/featureStore';
import { CrmWorkspace } from './CrmWorkspace';
import { KanbanWorkspace } from './KanbanWorkspace';
import { LeadGenWorkspace } from './LeadGenWorkspace';
import { ProjectFlowWorkspace } from './ProjectFlowWorkspace';
import { SocialStationWorkspace } from './SocialStationWorkspace';
import { VideoMeetingWorkspace } from './VideoMeetingWorkspace';

const CreativeStudioWorkspace = lazy(async () => {
  const module = await import('./CreativeStudioWorkspace');
  return { default: module.CreativeStudioWorkspace };
});

export interface FeatureWorkspaceComponentProps {
  onExit: () => void;
}

export const FEATURE_WORKSPACE_COMPONENTS: Record<FeatureKey, ComponentType<FeatureWorkspaceComponentProps>> = {
  kanban: KanbanWorkspace,
  creativeStudio: CreativeStudioWorkspace,
  socialStation: SocialStationWorkspace,
  crm: CrmWorkspace,
  leadGen: LeadGenWorkspace,
  videoMeeting: VideoMeetingWorkspace,
  projectFlow: ProjectFlowWorkspace,
};