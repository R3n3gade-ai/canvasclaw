import { create } from 'zustand';
import { webRequest } from '../services/webClient';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export type SocialPlatformKey = 'tiktok' | 'instagram' | 'x' | 'facebook';
export type SocialTabKey = 'creation' | 'automation' | 'feed';
export type SocialPostStatus = 'pending' | 'scheduled' | 'posted' | 'failed';
export type SocialFormatKey = 'post' | 'story' | 'reel' | 'thread';
export type SocialAudienceKey = 'public' | 'close-friends' | 'followers';
export type SocialFeedFilter = 'all' | 'pending' | 'scheduled' | 'posted' | 'failed';

export interface SocialPlatformDefinition {
  key: SocialPlatformKey;
  label: string;
  glyph: string;
  accentClass: string;
  supports?: string[];
}

export interface SocialPlatformConnection {
  connected: boolean;
  enabled: boolean;
  displayName: string;
  handle: string;
  accountId: string;
  tokenRef: string;
  status: string;
  lastSyncAt: string;
  oauthConfigured: boolean;
  scopes: string[];
  notes: string;
}

export interface SocialProviderState {
  name: string;
  apiConfigured: boolean;
  baseUrl: string;
}

export interface SocialProviderProfile {
  profileName: string;
  connectedPlatforms: SocialPlatformKey[];
  raw?: Record<string, unknown>;
}

export interface SocialMediaAsset {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: string;
}

export interface SocialPostMeta {
  supportingText: string;
  firstComment: string;
  hashtags: string;
  cta: string;
  audience: SocialAudienceKey;
  campaignTag: string;
  uploads: string[];
  autoReplyEnabled: boolean;
  crossPostEnabled: boolean;
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
  source?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  scheduledJobId?: string;
  rssFeedId?: string;
  agentRunId?: string;
  failReason?: string;
  meta?: Partial<SocialPostMeta>;
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

export interface SocialRssFeed {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  publishPlatforms: SocialPlatformKey[];
  prompt: string;
  lastCheckedAt: string;
  lastItemAt: string;
}

export interface SocialAgentRun {
  id: string;
  name: string;
  status: string;
  startedAt: string;
  objective: string;
  mode: string;
  approvalMode: string;
  platforms: SocialPlatformKey[];
}

export interface SocialMainAgentState {
  enabled: boolean;
  scope: string[];
  lastActionAt: string;
  notes: string;
}

export interface SocialStationSnapshot {
  visibleMonth: string;
  selectedDate: string;
  activeTab: SocialTabKey;
  platforms: SocialPlatformDefinition[];
  connections: Record<SocialPlatformKey, SocialPlatformConnection>;
  provider?: SocialProviderState;
  profiles?: SocialProviderProfile[];
  currentProfileName?: string;
  currentConnectUrl?: string;
  mediaLibrary?: SocialMediaAsset[];
  draft: SocialComposerDraft;
  automation: SocialAutomationSettings;
  feedFilter: SocialFeedFilter;
  posts: SocialPostItem[];
  rssFeeds: SocialRssFeed[];
  feedPreview?: Array<{ title: string; link: string; publishedAt: string; summary: string }>;
  agentRuns: SocialAgentRun[];
  mainAgent: SocialMainAgentState;
  updatedAt?: string;
}

interface SocialStationState extends SocialStationSnapshot {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  loadState: () => Promise<void>;
  refreshState: () => Promise<void>;
  clearError: () => void;
  shiftVisibleMonth: (offset: number) => Promise<void>;
  jumpToToday: () => Promise<void>;
  setSelectedDate: (date: string) => Promise<void>;
  setActiveTab: (tab: SocialTabKey) => Promise<void>;
  toggleConnectedPlatform: (platform: SocialPlatformKey) => Promise<void>;
  toggleEnabledPlatform: (platform: SocialPlatformKey) => Promise<void>;
  updateConnection: (platform: SocialPlatformKey, updates: Partial<SocialPlatformConnection>) => Promise<void>;
  setUploadPostApiKey: (apiKey: string) => Promise<void>;
  uploadMedia: (file: File) => Promise<void>;
  listProfiles: () => Promise<void>;
  ensureProfile: (profileName: string) => Promise<void>;
  generateConnectUrl: (profileName: string, params?: { redirectUrl?: string; logoImage?: string; connectTitle?: string; connectDescription?: string; platforms?: SocialPlatformKey[]; showCalendar?: boolean; readonlyCalendar?: boolean }) => Promise<{ accessUrl: string; profileName: string } | null>;
  publishPost: (postId: string) => Promise<void>;
  updateDraft: (updates: Partial<SocialComposerDraft>) => Promise<void>;
  updateAutomation: (updates: Partial<SocialAutomationSettings>) => Promise<void>;
  setFeedFilter: (filter: SocialFeedFilter) => Promise<void>;
  createPost: (status: Extract<SocialPostStatus, 'pending' | 'scheduled'>) => Promise<void>;
  updatePost: (postId: string, patch: Partial<SocialPostItem>) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  upsertRssFeed: (feed: Partial<SocialRssFeed> & Pick<SocialRssFeed, 'url'>) => Promise<void>;
  removeRssFeed: (feedId: string) => Promise<void>;
  previewRssFeed: (url: string) => Promise<void>;
  launchAgent: () => Promise<void>;
}

export const SOCIAL_FORMAT_OPTIONS: SocialFormatKey[] = ['post', 'story', 'reel', 'thread'];
export const SOCIAL_FEED_FILTERS: SocialFeedFilter[] = ['all', 'pending', 'scheduled', 'posted', 'failed'];
export const SOCIAL_AUDIENCE_OPTIONS: SocialAudienceKey[] = ['public', 'close-friends', 'followers'];
export const SOCIAL_AGENT_TONE_OPTIONS = ['Friendly', 'Bold', 'Executive', 'Supportive'] as const;
export const SOCIAL_AGENT_MODE_OPTIONS = ['Post + Engage', 'Post Only', 'Engage Only'] as const;
export const SOCIAL_APPROVAL_MODE_OPTIONS = [
  'Approval for replies only',
  'Approval for all posts',
  'Fully autonomous',
] as const;

const EMPTY_STATE: SocialStationSnapshot = {
  visibleMonth: new Date().toISOString().slice(0, 7) + '-01',
  selectedDate: new Date().toISOString().slice(0, 10),
  activeTab: 'creation',
  platforms: SOCIAL_PLATFORMS,
  connections: {
    tiktok: emptyConnection(),
    instagram: emptyConnection(),
    x: emptyConnection(),
    facebook: emptyConnection(),
  },
  provider: {
    name: 'upload-post',
    apiConfigured: false,
    baseUrl: '',
  },
  profiles: [],
  currentProfileName: '',
  currentConnectUrl: '',
  mediaLibrary: [],
  draft: {
    selectedFormat: 'post',
    caption: '',
    supportingText: '',
    firstComment: '',
    hashtags: '',
    cta: '',
    audience: 'public',
    campaignTag: '',
    scheduleTime: '10:30',
    uploads: [],
    autoReplyEnabled: true,
    crossPostEnabled: true,
  },
  automation: {
    agentName: 'Pulse Operator',
    agentObjective: '',
    agentTone: 'Friendly',
    agentMode: 'Post + Engage',
    approvalMode: 'Approval for replies only',
    postingWindow: '09:00 - 18:00',
    dailyLimit: '12',
    interactionLimit: '24',
  },
  feedFilter: 'all',
  posts: [],
  rssFeeds: [],
  feedPreview: [],
  agentRuns: [],
  mainAgent: {
    enabled: true,
    scope: [],
    lastActionAt: '',
    notes: '',
  },
  updatedAt: '',
};

function emptyConnection(): SocialPlatformConnection {
  return {
    connected: false,
    enabled: false,
    displayName: '',
    handle: '',
    accountId: '',
    tokenRef: '',
    status: 'disconnected',
    lastSyncAt: '',
    oauthConfigured: false,
    scopes: [],
    notes: '',
  };
}

function normalizeState(state: Partial<SocialStationSnapshot> | undefined): SocialStationSnapshot {
  return {
    ...EMPTY_STATE,
    ...state,
    platforms: Array.isArray(state?.platforms) ? state!.platforms : EMPTY_STATE.platforms,
    connections: {
      tiktok: { ...emptyConnection(), ...(state?.connections?.tiktok ?? {}) },
      instagram: { ...emptyConnection(), ...(state?.connections?.instagram ?? {}) },
      x: { ...emptyConnection(), ...(state?.connections?.x ?? {}) },
      facebook: { ...emptyConnection(), ...(state?.connections?.facebook ?? {}) },
    },
    provider: { ...EMPTY_STATE.provider, ...(state?.provider ?? {}) },
    profiles: Array.isArray(state?.profiles) ? state!.profiles : [],
    currentProfileName: typeof state?.currentProfileName === 'string' ? state.currentProfileName : '',
    currentConnectUrl: typeof state?.currentConnectUrl === 'string' ? state.currentConnectUrl : '',
    mediaLibrary: Array.isArray(state?.mediaLibrary) ? state!.mediaLibrary : [],
    draft: { ...EMPTY_STATE.draft, ...(state?.draft ?? {}) },
    automation: { ...EMPTY_STATE.automation, ...(state?.automation ?? {}) },
    posts: Array.isArray(state?.posts) ? state!.posts : [],
    rssFeeds: Array.isArray(state?.rssFeeds) ? state!.rssFeeds : [],
    feedPreview: Array.isArray(state?.feedPreview) ? state!.feedPreview : [],
    agentRuns: Array.isArray(state?.agentRuns) ? state!.agentRuns : [],
    mainAgent: { ...EMPTY_STATE.mainAgent, ...(state?.mainAgent ?? {}) },
  };
}

async function fetchState(): Promise<SocialStationSnapshot> {
  const payload = await webRequest<{ state: SocialStationSnapshot }>('social.station.get_state');
  return normalizeState(payload.state);
}

function applyState(set: (partial: Partial<SocialStationState>) => void, state: Partial<SocialStationSnapshot>) {
  set({
    ...normalizeState(state),
    isLoaded: true,
    isLoading: false,
    error: null,
  });
}

async function requestAndApply(
  set: (partial: Partial<SocialStationState>) => void,
  method: string,
  params?: Record<string, unknown>
): Promise<void> {
  try {
    const payload = await webRequest<{ state: SocialStationSnapshot }>(method, params);
    applyState(set, payload.state);
  } catch (error) {
    set({ error: error instanceof Error ? error.message : `Failed request: ${method}` });
    throw error;
  }
}

export const useSocialStationStore = create<SocialStationState>((set) => ({
  ...EMPTY_STATE,
  isLoaded: false,
  isLoading: false,
  error: null,

  loadState: async () => {
    set({ isLoading: true, error: null });
    try {
      applyState(set, await fetchState());
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : 'Failed to load Social Station' });
    }
  },

  refreshState: async () => {
    try {
      applyState(set, await fetchState());
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to refresh Social Station' });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  shiftVisibleMonth: async (offset) => requestAndApply(set, 'social.station.shift_visible_month', { offset }),

  jumpToToday: async () => requestAndApply(set, 'social.station.jump_to_today'),

  setSelectedDate: async (date) => requestAndApply(set, 'social.station.set_selected_date', { date }),

  setActiveTab: async (tab) => requestAndApply(set, 'social.station.set_active_tab', { tab }),

  toggleConnectedPlatform: async (platform) => requestAndApply(set, 'social.station.toggle_connected_platform', { platform }),

  toggleEnabledPlatform: async (platform) => requestAndApply(set, 'social.station.toggle_enabled_platform', { platform }),

  updateConnection: async (platform, updates) => requestAndApply(set, 'social.station.update_connection', { platform, updates }),

  setUploadPostApiKey: async (apiKey) => requestAndApply(set, 'social.station.set_upload_post_api_key', { apiKey }),

  uploadMedia: async (file) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      const payload = await webRequest<{ asset: SocialMediaAsset; state: SocialStationSnapshot }>('social.station.upload_media', {
        name: file.name,
        dataUrl,
      });
      applyState(set, payload.state);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to upload media' });
      throw error;
    }
  },

  listProfiles: async () => requestAndApply(set, 'social.station.list_profiles'),

  ensureProfile: async (profileName) => requestAndApply(set, 'social.station.ensure_profile', { profileName }),

  generateConnectUrl: async (profileName, params) => {
    try {
      const payload = await webRequest<{ result: { accessUrl: string; profileName: string }; state: SocialStationSnapshot }>('social.station.generate_connect_url', {
        profileName,
        ...(params ?? {}),
      });
      applyState(set, payload.state);
      return payload.result;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to generate connect URL' });
      throw error;
    }
  },

  publishPost: async (postId) => requestAndApply(set, 'social.station.publish_post', { postId }),

  updateDraft: async (updates) => requestAndApply(set, 'social.station.update_draft', { updates }),

  updateAutomation: async (updates) => requestAndApply(set, 'social.station.update_automation', { updates }),

  setFeedFilter: async (feedFilter) => requestAndApply(set, 'social.station.set_feed_filter', { feedFilter }),

  createPost: async (status) => requestAndApply(set, 'social.station.create_post', { status, source: 'manual' }),

  updatePost: async (postId, patch) => requestAndApply(set, 'social.station.update_post', { postId, patch }),

  deletePost: async (postId) => requestAndApply(set, 'social.station.delete_post', { postId }),

  upsertRssFeed: async (feed) => requestAndApply(set, 'social.station.upsert_rss_feed', { feed }),

  removeRssFeed: async (feedId) => requestAndApply(set, 'social.station.remove_rss_feed', { feedId }),

  previewRssFeed: async (url) => requestAndApply(set, 'social.station.preview_rss_feed', { url }),

  launchAgent: async () => requestAndApply(set, 'social.station.launch_agent'),
}));

export const SOCIAL_PLATFORMS: SocialPlatformDefinition[] = [
  { key: 'tiktok', label: 'TikTok', glyph: 'TT', accentClass: 'is-tiktok', supports: ['video', 'reel', 'agent'] },
  { key: 'instagram', label: 'Instagram', glyph: 'IG', accentClass: 'is-instagram', supports: ['post', 'story', 'reel', 'agent'] },
  { key: 'x', label: 'X', glyph: 'X', accentClass: 'is-x', supports: ['post', 'thread', 'agent'] },
  { key: 'facebook', label: 'Facebook', glyph: 'FB', accentClass: 'is-facebook', supports: ['post', 'story', 'reel', 'agent'] },
];
