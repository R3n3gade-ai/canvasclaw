import { create } from 'zustand';

export type FeatureKey =
  | 'kanban'
  | 'creativeStudio'
  | 'socialStation'
  | 'crm'
  | 'leadGen'
  | 'videoMeeting'
  | 'projectFlow';

export const FEATURE_ORDER: FeatureKey[] = [
  'kanban',
  'creativeStudio',
  'socialStation',
  'crm',
  'leadGen',
  'videoMeeting',
  'projectFlow',
];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  kanban: 'Kanban',
  creativeStudio: 'Creative Studio',
  socialStation: 'Social Station',
  crm: 'CRM',
  leadGen: 'Lead Gen',
  videoMeeting: 'Video Meeting',
  projectFlow: 'Project Flow',
};

interface FeatureState {
  activeFeature: FeatureKey | null;
  openFeature: (feature: FeatureKey) => void;
  closeFeature: () => void;
}

export const useFeatureStore = create<FeatureState>((set) => ({
  activeFeature: null,
  openFeature: (feature) => set({ activeFeature: feature }),
  closeFeature: () => set({ activeFeature: null }),
}));