import { create } from 'zustand';

const STORAGE_KEY = 'deep_canvas_social_station_v1';

export type SocialPlatformKey = 'tiktok' | 'instagram' | 'x' | 'facebook';
export type SocialTabKey = 'creation' | 'automation' | 'feed';
export type SocialPostStatus = 'pending' | 'scheduled' | 'posted';
export type SocialFormatKey = 'post' | 'story' | 'reel' | 'thread';
export type SocialAudienceKey = 'public' | 'close-friends' | 'followers';
export type SocialFeedFilter = 'all' | 'pending' | 'scheduled' | 'posted';

export interface SocialPlatformDefinition {
  key: SocialPlatformKey;
  label: string;
  glyph: string;
  accentClass: string;
}

export interface SocialPostItem {
  id: string;
  title: string;
  caption: string;
  date: string;
  time: string;
  platforms: SocialPlatformKey[];
  status: SocialPostStatus;
  format: SocialFormatKey;
}

export interface SocialComposerDraft {
  selectedFormat: SocialFormatKey;
  caption: string;
  supportingText: string;
  firstComment: string;
  hashtags: string;
  cta: string;
  audience: SocialAudienceKey;
  campaignTag: string;
  scheduleTime: string;
  uploads: string[];
  autoReplyEnabled: boolean;
  crossPostEnabled: boolean;
}

export interface SocialAutomationSettings {
  agentName: string;
  agentObjective: string;
  agentTone: string;
  agentMode: string;
  approvalMode: string;
  postingWindow: string;
  dailyLimit: string;
  interactionLimit: string;
}

interface SocialStationSnapshot {
  visibleMonth: string;
  selectedDate: string;
  activeTab: SocialTabKey;
  connectedPlatforms: Record<SocialPlatformKey, boolean>;
  enabledPlatforms: Record<SocialPlatformKey, boolean>;
  draft: SocialComposerDraft;
  automation: SocialAutomationSettings;
  feedFilter: SocialFeedFilter;
  posts: SocialPostItem[];
}

interface SocialStationState extends SocialStationSnapshot {
  shiftVisibleMonth: (offset: number) => void;
  jumpToToday: () => void;
  setSelectedDate: (date: string) => void;
  setActiveTab: (tab: SocialTabKey) => void;
  toggleConnectedPlatform: (platform: SocialPlatformKey) => void;
  toggleEnabledPlatform: (platform: SocialPlatformKey) => void;
  updateDraft: (updates: Partial<SocialComposerDraft>) => void;
  updateAutomation: (updates: Partial<SocialAutomationSettings>) => void;
  setFeedFilter: (filter: SocialFeedFilter) => void;
  createPost: (status: Extract<SocialPostStatus, 'pending' | 'scheduled'>) => void;
}

export const SOCIAL_PLATFORMS: SocialPlatformDefinition[] = [
  { key: 'tiktok', label: 'TikTok', glyph: 'TT', accentClass: 'is-tiktok' },
  { key: 'instagram', label: 'Instagram', glyph: 'IG', accentClass: 'is-instagram' },
  { key: 'x', label: 'X', glyph: 'X', accentClass: 'is-x' },
  { key: 'facebook', label: 'Facebook', glyph: 'FB', accentClass: 'is-facebook' },
];

export const SOCIAL_FORMAT_OPTIONS: SocialFormatKey[] = ['post', 'story', 'reel', 'thread'];
export const SOCIAL_FEED_FILTERS: SocialFeedFilter[] = ['all', 'pending', 'scheduled', 'posted'];
export const SOCIAL_AUDIENCE_OPTIONS: SocialAudienceKey[] = ['public', 'close-friends', 'followers'];
export const SOCIAL_AGENT_TONE_OPTIONS = ['Friendly', 'Bold', 'Executive', 'Supportive'] as const;
export const SOCIAL_AGENT_MODE_OPTIONS = ['Post + Engage', 'Post Only', 'Engage Only'] as const;
export const SOCIAL_APPROVAL_MODE_OPTIONS = [
  'Approval for replies only',
  'Approval for all posts',
  'Fully autonomous',
] as const;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfMonthIso(date: Date): string {
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultDraft(): SocialComposerDraft {
  return {
    selectedFormat: 'post',
    caption: '',
    supportingText: '',
    firstComment: '',
    hashtags: '',
    cta: '',
    audience: 'public',
    campaignTag: 'Launch Sprint',
    scheduleTime: '10:30',
    uploads: [],
    autoReplyEnabled: true,
    crossPostEnabled: true,
  };
}

function createDefaultAutomation(): SocialAutomationSettings {
  return {
    agentName: 'Pulse Operator',
    agentObjective: 'Publish scheduled content, answer safe comments, and surface engagement opportunities.',
    agentTone: 'Friendly',
    agentMode: 'Post + Engage',
    approvalMode: 'Approval for replies only',
    postingWindow: '09:00 - 18:00',
    dailyLimit: '12',
    interactionLimit: '24',
  };
}

function createDefaultSnapshot(): SocialStationSnapshot {
  const today = new Date();
  const todayIso = toIsoDate(today);
  return {
    visibleMonth: startOfMonthIso(today),
    selectedDate: todayIso,
    activeTab: 'creation',
    connectedPlatforms: {
      tiktok: false,
      instagram: false,
      x: false,
      facebook: false,
    },
    enabledPlatforms: {
      tiktok: true,
      instagram: true,
      x: false,
      facebook: false,
    },
    draft: createDefaultDraft(),
    automation: createDefaultAutomation(),
    feedFilter: 'all',
    posts: [
      {
        id: 'sample_1',
        title: 'Founder teaser cut',
        caption: 'Short teaser for the founder clip rollout.',
        date: todayIso,
        time: '09:00',
        platforms: ['instagram', 'tiktok'],
        status: 'pending',
        format: 'reel',
      },
      {
        id: 'sample_2',
        title: 'Product launch thread',
        caption: 'Thread covering release highlights and CTA.',
        date: todayIso,
        time: '14:00',
        platforms: ['x', 'facebook'],
        status: 'posted',
        format: 'thread',
      },
    ],
  };
}

function loadSnapshot(): SocialStationSnapshot {
  const fallback = createDefaultSnapshot();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<SocialStationSnapshot>;
    return {
      visibleMonth: typeof parsed.visibleMonth === 'string' ? parsed.visibleMonth : fallback.visibleMonth,
      selectedDate: typeof parsed.selectedDate === 'string' ? parsed.selectedDate : fallback.selectedDate,
      activeTab: parsed.activeTab === 'creation' || parsed.activeTab === 'automation' || parsed.activeTab === 'feed'
        ? parsed.activeTab
        : fallback.activeTab,
      connectedPlatforms: { ...fallback.connectedPlatforms, ...(parsed.connectedPlatforms ?? {}) },
      enabledPlatforms: { ...fallback.enabledPlatforms, ...(parsed.enabledPlatforms ?? {}) },
      draft: { ...fallback.draft, ...(parsed.draft ?? {}) },
      automation: { ...fallback.automation, ...(parsed.automation ?? {}) },
      feedFilter:
        parsed.feedFilter === 'pending' || parsed.feedFilter === 'scheduled' || parsed.feedFilter === 'posted' || parsed.feedFilter === 'all'
          ? parsed.feedFilter
          : fallback.feedFilter,
      posts: Array.isArray(parsed.posts) ? parsed.posts : fallback.posts,
    };
  } catch {
    return fallback;
  }
}

function persistSnapshot(snapshot: SocialStationSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore storage failures
  }
}

function commitSnapshot(
  set: (partial: SocialStationSnapshot | ((state: SocialStationState) => SocialStationSnapshot)) => void,
  snapshotOrUpdater: SocialStationSnapshot | ((state: SocialStationState) => SocialStationSnapshot)
) {
  set((state) => {
    const nextSnapshot = typeof snapshotOrUpdater === 'function' ? snapshotOrUpdater(state) : snapshotOrUpdater;
    persistSnapshot(nextSnapshot);
    return nextSnapshot;
  });
}

const initialSnapshot = loadSnapshot();

export const useSocialStationStore = create<SocialStationState>((set) => ({
  ...initialSnapshot,

  shiftVisibleMonth: (offset) => {
    commitSnapshot(set, (state) => {
      const visibleMonth = parseIsoDate(state.visibleMonth);
      const nextVisibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
      return {
        ...state,
        visibleMonth: startOfMonthIso(nextVisibleMonth),
      };
    });
  },

  jumpToToday: () => {
    const today = new Date();
    const todayIso = toIsoDate(today);
    commitSnapshot(set, (state) => ({
      ...state,
      visibleMonth: startOfMonthIso(today),
      selectedDate: todayIso,
    }));
  },

  setSelectedDate: (date) => {
    const parsed = parseIsoDate(date);
    commitSnapshot(set, (state) => ({
      ...state,
      selectedDate: date,
      visibleMonth: startOfMonthIso(parsed),
    }));
  },

  setActiveTab: (tab) => {
    commitSnapshot(set, (state) => ({
      ...state,
      activeTab: tab,
    }));
  },

  toggleConnectedPlatform: (platform) => {
    commitSnapshot(set, (state) => ({
      ...state,
      connectedPlatforms: {
        ...state.connectedPlatforms,
        [platform]: !state.connectedPlatforms[platform],
      },
    }));
  },

  toggleEnabledPlatform: (platform) => {
    commitSnapshot(set, (state) => ({
      ...state,
      enabledPlatforms: {
        ...state.enabledPlatforms,
        [platform]: !state.enabledPlatforms[platform],
      },
    }));
  },

  updateDraft: (updates) => {
    commitSnapshot(set, (state) => ({
      ...state,
      draft: {
        ...state.draft,
        ...updates,
      },
    }));
  },

  updateAutomation: (updates) => {
    commitSnapshot(set, (state) => ({
      ...state,
      automation: {
        ...state.automation,
        ...updates,
      },
    }));
  },

  setFeedFilter: (filter) => {
    commitSnapshot(set, (state) => ({
      ...state,
      feedFilter: filter,
    }));
  },

  createPost: (status) => {
    commitSnapshot(set, (state) => {
      const activePlatforms = SOCIAL_PLATFORMS.filter((platform) => state.enabledPlatforms[platform.key]).map((platform) => platform.key);
      const caption = state.draft.caption.trim();
      if (activePlatforms.length === 0 || !caption) {
        return state;
      }

      const nextPost: SocialPostItem = {
        id: makeId('social'),
        title: caption.slice(0, 42),
        caption,
        date: state.selectedDate,
        time: state.draft.scheduleTime,
        platforms: activePlatforms,
        status,
        format: state.draft.selectedFormat,
      };

      return {
        ...state,
        activeTab: 'feed',
        posts: [nextPost, ...state.posts],
        draft: {
          ...state.draft,
          caption: '',
          supportingText: '',
          firstComment: '',
          hashtags: '',
          cta: '',
          uploads: [],
        },
      };
    });
  },
}));