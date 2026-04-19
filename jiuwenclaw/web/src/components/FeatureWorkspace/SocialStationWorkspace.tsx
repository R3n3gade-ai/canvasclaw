import { useEffect, useMemo, useState } from 'react';
import {
  SOCIAL_AGENT_MODE_OPTIONS,
  SOCIAL_AGENT_TONE_OPTIONS,
  SOCIAL_APPROVAL_MODE_OPTIONS,
  SOCIAL_AUDIENCE_OPTIONS,
  SOCIAL_FEED_FILTERS,
  SOCIAL_FORMAT_OPTIONS,
  type SocialPostItem,
  type SocialPlatformDefinition,
  useSocialStationStore,
} from '../../stores/socialStationStore';
import './SocialStationWorkspace.css';

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatMonthTitle(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function formatCalendarDay(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function buildMonthGrid(visibleMonth: Date): Date[] {
  const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const startOffset = firstOfMonth.getDay();
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + index);
    return cellDate;
  });
}

export function SocialStationWorkspace({ onExit }: { onExit: () => void }) {
  const [rssName, setRssName] = useState('');
  const [rssUrl, setRssUrl] = useState('');
  const [rssPrompt, setRssPrompt] = useState('');
  const [providerApiKey, setProviderApiKey] = useState('');
  const [profileNameInput, setProfileNameInput] = useState('Deepcanvas');
  const visibleMonthIso = useSocialStationStore((state) => state.visibleMonth);
  const selectedDate = useSocialStationStore((state) => state.selectedDate);
  const activeTab = useSocialStationStore((state) => state.activeTab);
  const platforms = useSocialStationStore((state) => state.platforms);
  const connections = useSocialStationStore((state) => state.connections);
  const draft = useSocialStationStore((state) => state.draft);
  const automation = useSocialStationStore((state) => state.automation);
  const feedFilter = useSocialStationStore((state) => state.feedFilter);
  const posts = useSocialStationStore((state) => state.posts);
  const provider = useSocialStationStore((state) => state.provider);
  const profiles = useSocialStationStore((state) => state.profiles ?? []);
  const mediaLibrary = useSocialStationStore((state) => state.mediaLibrary ?? []);
  const currentProfileName = useSocialStationStore((state) => state.currentProfileName ?? '');
  const currentConnectUrl = useSocialStationStore((state) => state.currentConnectUrl ?? '');
  const rssFeeds = useSocialStationStore((state) => state.rssFeeds);
  const feedPreview = useSocialStationStore((state) => state.feedPreview ?? []);
  const agentRuns = useSocialStationStore((state) => state.agentRuns);
  const mainAgent = useSocialStationStore((state) => state.mainAgent);
  const isLoaded = useSocialStationStore((state) => state.isLoaded);
  const isLoading = useSocialStationStore((state) => state.isLoading);
  const error = useSocialStationStore((state) => state.error);
  const loadState = useSocialStationStore((state) => state.loadState);
  const clearError = useSocialStationStore((state) => state.clearError);
  const setUploadPostApiKey = useSocialStationStore((state) => state.setUploadPostApiKey);
  const uploadMedia = useSocialStationStore((state) => state.uploadMedia);
  const listProfiles = useSocialStationStore((state) => state.listProfiles);
  const ensureProfile = useSocialStationStore((state) => state.ensureProfile);
  const generateConnectUrl = useSocialStationStore((state) => state.generateConnectUrl);
  const publishPost = useSocialStationStore((state) => state.publishPost);
  const shiftVisibleMonth = useSocialStationStore((state) => state.shiftVisibleMonth);
  const jumpToToday = useSocialStationStore((state) => state.jumpToToday);
  const setSelectedDate = useSocialStationStore((state) => state.setSelectedDate);
  const setActiveTab = useSocialStationStore((state) => state.setActiveTab);
  const toggleConnectedPlatform = useSocialStationStore((state) => state.toggleConnectedPlatform);
  const toggleEnabledPlatform = useSocialStationStore((state) => state.toggleEnabledPlatform);
  const updateConnection = useSocialStationStore((state) => state.updateConnection);
  const updateDraft = useSocialStationStore((state) => state.updateDraft);
  const updateAutomation = useSocialStationStore((state) => state.updateAutomation);
  const setFeedFilter = useSocialStationStore((state) => state.setFeedFilter);
  const createPost = useSocialStationStore((state) => state.createPost);
  const updatePost = useSocialStationStore((state) => state.updatePost);
  const deletePost = useSocialStationStore((state) => state.deletePost);
  const upsertRssFeed = useSocialStationStore((state) => state.upsertRssFeed);
  const removeRssFeed = useSocialStationStore((state) => state.removeRssFeed);
  const previewRssFeed = useSocialStationStore((state) => state.previewRssFeed);
  const launchAgent = useSocialStationStore((state) => state.launchAgent);

  const visibleMonth = useMemo(() => new Date(`${visibleMonthIso}T00:00:00`), [visibleMonthIso]);
  const monthCells = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const selectedDateLabel = useMemo(() => {
    const parsed = new Date(`${selectedDate}T00:00:00`);
    return parsed.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  }, [selectedDate]);

  const postsByDay = useMemo(() => {
    return posts.reduce<Record<string, SocialPostItem[]>>((accumulator, post) => {
      accumulator[post.date] = [...(accumulator[post.date] ?? []), post];
      return accumulator;
    }, {});
  }, [posts]);

  const filteredFeed = useMemo(() => {
    if (feedFilter === 'all') return posts;
    return posts.filter((post) => post.status === feedFilter);
  }, [feedFilter, posts]);

  useEffect(() => {
    if (!isLoaded && !isLoading) {
      void loadState();
    }
  }, [isLoaded, isLoading, loadState]);

  const socialPlatforms = (platforms.length > 0 ? platforms : []) as SocialPlatformDefinition[];

  return (
    <div className="feature-social animate-rise">
      <section className="feature-social__calendar-shell">
        <div className="feature-social__toolbar">
          <div className="feature-social__month-nav">
            <button
              type="button"
              className="feature-social__nav-button"
              onClick={() => void shiftVisibleMonth(-1)}
              title="Previous month"
            >
              ‹
            </button>
            <div>
              <div className="feature-social__eyebrow">Social Station</div>
              <h2 className="feature-social__month-title">{formatMonthTitle(visibleMonth)}</h2>
            </div>
            <button
              type="button"
              className="feature-social__nav-button"
              onClick={() => void shiftVisibleMonth(1)}
              title="Next month"
            >
              ›
            </button>
            <button
              type="button"
              className="feature-social__today-button"
              onClick={() => void jumpToToday()}
            >
              Today
            </button>
          </div>

          <div className="feature-social__account-strip">
            {socialPlatforms.map((platform) => {
              const connection = connections[platform.key];
              const connected = connection?.connected;
              return (
                <button
                  key={platform.key}
                  type="button"
                  className={`feature-social__account-button ${platform.accentClass} ${connected ? 'is-connected' : ''}`}
                  onClick={() => void toggleConnectedPlatform(platform.key)}
                  title={connected ? `Disconnect ${platform.label}` : `Connect ${platform.label}`}
                >
                  <span className="feature-social__account-glyph">{platform.glyph}</span>
                  <span className="feature-social__account-label">{connection?.displayName || platform.label}</span>
                  <span className={`feature-social__account-status ${connected ? 'is-on' : ''}`} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="feature-social__calendar-frame">
          <div className="feature-social__weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="feature-social__weekday">
                {day}
              </div>
            ))}
          </div>

          <div className="feature-social__calendar-grid">
            {monthCells.map((date) => {
              const isoDate = toIsoDate(date);
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
              const isSelected = isoDate === selectedDate;
              const dayPosts = postsByDay[isoDate] ?? [];
              return (
                <button
                  key={isoDate}
                  type="button"
                  className={`feature-social__day-cell ${isCurrentMonth ? '' : 'is-dimmed'} ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => void setSelectedDate(isoDate)}
                >
                  <div className="feature-social__day-header">
                    <span className="feature-social__day-number">{date.getDate()}</span>
                    {dayPosts.length > 0 && <span className="feature-social__day-count">{dayPosts.length}</span>}
                  </div>
                  <div className="feature-social__day-content">
                    {dayPosts.slice(0, 2).map((post) => (
                      <div key={post.id} className={`feature-social__day-chip is-${post.status}`}>
                        <span>{post.title}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="feature-social__rail">
        <div className="feature-social__rail-tabs">
          <div className="feature-social__rail-tab-group">
            <button
              type="button"
              className={`feature-social__rail-tab ${activeTab === 'creation' ? 'is-active' : ''}`}
              onClick={() => void setActiveTab('creation')}
            >
              Post Creation
            </button>
            <button
              type="button"
              className={`feature-social__rail-tab ${activeTab === 'automation' ? 'is-active' : ''}`}
              onClick={() => void setActiveTab('automation')}
            >
              Automation Agents
            </button>
            <button
              type="button"
              className={`feature-social__rail-tab ${activeTab === 'feed' ? 'is-active' : ''}`}
              onClick={() => void setActiveTab('feed')}
            >
              Live Feed
            </button>
          </div>
          <button type="button" className="feature-social__secondary-action" onClick={onExit}>
            Back to chat
          </button>
        </div>

        <div className="feature-social__rail-panel">
          {error && (
            <div className="feature-social__error-banner">
              <span>{error}</span>
              <button type="button" className="feature-social__banner-dismiss" onClick={clearError}>
                Dismiss
              </button>
            </div>
          )}
          {!isLoaded && isLoading && <div className="feature-social__error-banner">Loading Social Station…</div>}
          {activeTab === 'creation' && (
            <div className="feature-social__section-stack">
              <section className="feature-social__section">
                <div className="feature-social__section-header">
                  <div>
                    <div className="feature-social__eyebrow">Compose</div>
                    <h3 className="feature-social__section-title">Schedule for {selectedDateLabel}</h3>
                  </div>
                </div>

                <div className="feature-social__platform-grid">
                  {socialPlatforms.map((platform) => {
                    const enabled = connections[platform.key]?.enabled;
                    const summary = buildConnectionSummary(platform, connections[platform.key]);
                    return (
                      <button
                        key={platform.key}
                        type="button"
                        className={`feature-social__platform-toggle ${platform.accentClass} ${enabled ? 'is-enabled' : ''}`}
                        onClick={() => void toggleEnabledPlatform(platform.key)}
                        title={enabled ? `Disable ${platform.label}` : `Enable ${platform.label}`}
                      >
                        <span className="feature-social__platform-glyph">{platform.glyph}</span>
                        <span>{platform.label}</span>
                        <span className="feature-social__platform-state">{summary}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="feature-social__format-row">
                  {SOCIAL_FORMAT_OPTIONS.map((format) => (
                    <button
                      key={format}
                      type="button"
                      className={`feature-social__format-chip ${draft.selectedFormat === format ? 'is-active' : ''}`}
                      onClick={() => void updateDraft({ selectedFormat: format })}
                    >
                      {format}
                    </button>
                  ))}
                </div>

                <textarea
                  value={draft.caption}
                  onChange={(event) => void updateDraft({ caption: event.target.value })}
                  className="feature-social__textarea feature-social__textarea--tall"
                  placeholder="Write caption, hook, or thread opener..."
                  rows={5}
                />

                <div className="feature-social__field-row">
                  <input
                    value={draft.supportingText}
                    onChange={(event) => void updateDraft({ supportingText: event.target.value })}
                    className="feature-social__input"
                    placeholder="Headline or on-screen text"
                    title="Headline or on-screen text"
                  />
                  <input
                    value={draft.cta}
                    onChange={(event) => void updateDraft({ cta: event.target.value })}
                    className="feature-social__input"
                    placeholder="CTA"
                    title="Call to action"
                  />
                </div>

                <div className="feature-social__media-drop">
                  <div className="feature-social__media-drop-header">
                    <span>Media Upload</span>
                    <span>{draft.uploads.length} files</span>
                  </div>
                  <label className="feature-social__upload-button">
                    Image / Video
                    <input
                      type="file"
                      className="feature-social__file-input"
                      multiple
                      accept="image/*,video/*"
                      onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        if (!files.length) return;
                        files.forEach((file) => {
                          void uploadMedia(file);
                        });
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                  {mediaLibrary.length > 0 && (
                    <div className="feature-social__upload-list">
                      {mediaLibrary.map((asset) => (
                        <span key={asset.id} className="feature-social__upload-chip" title={asset.path}>
                          {asset.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="feature-social__section">
                <div className="feature-social__section-header">
                  <div>
                    <div className="feature-social__eyebrow">Platform Variations</div>
                    <h3 className="feature-social__section-title">Delivery Controls</h3>
                  </div>
                </div>

                <div className="feature-social__connection-stack">
                  <article className="feature-social__connection-card">
                    <div className="feature-social__feed-main">
                      <div>
                        <div className="feature-social__feed-title">Upload-Post provider</div>
                        <div className="feature-social__feed-meta">
                          {provider?.apiConfigured ? 'API key configured' : 'Paste API key once to enable profile provisioning and connect links.'}
                        </div>
                      </div>
                      <span className={`feature-social__feed-status ${provider?.apiConfigured ? 'is-posted' : 'is-failed'}`}>
                        {provider?.apiConfigured ? 'ready' : 'missing key'}
                      </span>
                    </div>
                    <div className="feature-social__connection-grid">
                      <label className="feature-social__field-stack feature-social__field-stack--full">
                        <span className="feature-social__field-label">Upload-Post API key</span>
                        <input
                          value={providerApiKey}
                          onChange={(event) => setProviderApiKey(event.target.value)}
                          className="feature-social__input"
                          type="password"
                          placeholder="Paste Upload-Post API key"
                        />
                      </label>
                      <label className="feature-social__field-stack">
                        <span className="feature-social__field-label">Profile name</span>
                        <input
                          value={profileNameInput}
                          onChange={(event) => setProfileNameInput(event.target.value)}
                          className="feature-social__input"
                          placeholder="Deepcanvas"
                        />
                      </label>
                    </div>
                    <div className="feature-social__feed-caption">
                      Active profile: <strong>{currentProfileName || 'none selected'}</strong>
                    </div>
                    <div className="feature-social__action-row">
                      <button
                        type="button"
                        className="feature-social__secondary-action"
                        onClick={() => {
                          if (!providerApiKey.trim()) return;
                          void setUploadPostApiKey(providerApiKey.trim()).then(() => void listProfiles());
                        }}
                      >
                        Save API key
                      </button>
                      <button
                        type="button"
                        className="feature-social__secondary-action"
                        onClick={() => {
                          if (!profileNameInput.trim()) return;
                          void ensureProfile(profileNameInput.trim()).then(() => void listProfiles());
                        }}
                      >
                        Create / select profile
                      </button>
                      <button
                        type="button"
                        className="feature-social__secondary-action"
                        onClick={() => {
                          const targetProfile = profileNameInput.trim() || currentProfileName;
                          if (!targetProfile) return;
                          void generateConnectUrl(targetProfile, {
                            platforms: socialPlatforms.map((platform) => platform.key),
                            connectTitle: 'Connect your social accounts',
                            connectDescription: 'Link the accounts Social Station should publish to.',
                            showCalendar: true,
                          }).then((result) => {
                            if (result?.accessUrl) {
                              window.open(result.accessUrl, '_blank', 'noopener,noreferrer');
                            }
                          });
                        }}
                      >
                        Open connect flow
                      </button>
                      <button type="button" className="feature-social__secondary-action" onClick={() => void listProfiles()}>
                        Refresh profiles
                      </button>
                    </div>
                    {currentConnectUrl && (
                      <div className="feature-social__feed-caption">
                        Latest connect link ready. Opening the hosted flow uses Upload-Post&apos;s account linking page.
                      </div>
                    )}
                  </article>

                  <article className="feature-social__connection-card">
                    <div className="feature-social__feed-main">
                      <div>
                        <div className="feature-social__feed-title">Profiles</div>
                        <div className="feature-social__feed-meta">Each SaaS user maps to one Upload-Post profile.</div>
                      </div>
                    </div>
                    <div className="feature-social__feed-list">
                      {profiles.length === 0 && <div className="feature-social__feed-caption">No profiles loaded yet.</div>}
                      {profiles.map((profile) => (
                        <article key={profile.profileName} className="feature-social__feed-item">
                          <div className="feature-social__feed-main">
                            <div>
                              <div className="feature-social__feed-title">{profile.profileName}</div>
                              <div className="feature-social__feed-meta">
                                {profile.connectedPlatforms.length > 0 ? profile.connectedPlatforms.join(', ') : 'No connected platforms yet'}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="feature-social__secondary-action"
                              onClick={() => {
                                setProfileNameInput(profile.profileName);
                                void ensureProfile(profile.profileName);
                              }}
                            >
                              Use profile
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </article>
                </div>

                <div className="feature-social__field-row">
                  <select
                    className="feature-social__select"
                    value={draft.audience}
                    onChange={(event) => void updateDraft({ audience: event.target.value as (typeof SOCIAL_AUDIENCE_OPTIONS)[number] })}
                    title="Audience"
                  >
                    {SOCIAL_AUDIENCE_OPTIONS.map((audience) => (
                      <option key={audience} value={audience}>
                        {audience}
                      </option>
                    ))}
                  </select>
                  <input
                    value={draft.campaignTag}
                    onChange={(event) => void updateDraft({ campaignTag: event.target.value })}
                    className="feature-social__input"
                    placeholder="Campaign tag"
                    title="Campaign tag"
                  />
                </div>

                <div className="feature-social__field-row">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => void setSelectedDate(event.target.value)}
                    className="feature-social__input"
                    title="Scheduled date"
                  />
                  <input
                    type="time"
                    value={draft.scheduleTime}
                    onChange={(event) => void updateDraft({ scheduleTime: event.target.value })}
                    className="feature-social__input"
                    title="Scheduled time"
                  />
                </div>

                <textarea
                  value={draft.firstComment}
                  onChange={(event) => void updateDraft({ firstComment: event.target.value })}
                  className="feature-social__textarea"
                  placeholder="First comment, thread continuation, or pinned reply"
                  rows={2}
                />
                <input
                  value={draft.hashtags}
                  onChange={(event) => void updateDraft({ hashtags: event.target.value })}
                  className="feature-social__input"
                  placeholder="#hashtags #keywords"
                  title="Hashtags"
                />

                <div className="feature-social__toggle-row">
                  <label className="feature-social__toggle-card">
                    <span>Cross-post enabled</span>
                    <input
                      type="checkbox"
                      checked={draft.crossPostEnabled}
                      onChange={() => void updateDraft({ crossPostEnabled: !draft.crossPostEnabled })}
                    />
                  </label>
                  <label className="feature-social__toggle-card">
                    <span>Auto-reply after publish</span>
                    <input
                      type="checkbox"
                      checked={draft.autoReplyEnabled}
                      onChange={() => void updateDraft({ autoReplyEnabled: !draft.autoReplyEnabled })}
                    />
                  </label>
                </div>

                <div className="feature-social__action-row">
                  <button type="button" className="feature-social__primary-action" onClick={() => void createPost('scheduled')}>
                    Schedule Post
                  </button>
                  <button type="button" className="feature-social__secondary-action" onClick={() => void createPost('pending')}>
                    Save Draft
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'automation' && (
            <div className="feature-social__section-stack">
              <section className="feature-social__section">
                <div className="feature-social__section-header">
                  <div>
                    <div className="feature-social__eyebrow">Autonomous Social Agents</div>
                    <h3 className="feature-social__section-title">Operator Setup</h3>
                  </div>
                </div>

                <input
                  value={automation.agentName}
                  onChange={(event) => void updateAutomation({ agentName: event.target.value })}
                  className="feature-social__input"
                  placeholder="Agent name"
                  title="Agent name"
                />
                <textarea
                  value={automation.agentObjective}
                  onChange={(event) => void updateAutomation({ agentObjective: event.target.value })}
                  className="feature-social__textarea feature-social__textarea--tall"
                  placeholder="Mission, brand rules, and engagement goals"
                  rows={5}
                />

                <div className="feature-social__field-row">
                  <select
                    className="feature-social__select"
                    value={automation.agentTone}
                    onChange={(event) => void updateAutomation({ agentTone: event.target.value })}
                    title="Agent tone"
                  >
                    {SOCIAL_AGENT_TONE_OPTIONS.map((tone) => (
                      <option key={tone}>{tone}</option>
                    ))}
                  </select>
                  <select
                    className="feature-social__select"
                    value={automation.agentMode}
                    onChange={(event) => void updateAutomation({ agentMode: event.target.value })}
                    title="Agent mode"
                  >
                    {SOCIAL_AGENT_MODE_OPTIONS.map((mode) => (
                      <option key={mode}>{mode}</option>
                    ))}
                  </select>
                </div>

                <div className="feature-social__field-row">
                  <select
                    className="feature-social__select"
                    value={automation.approvalMode}
                    onChange={(event) => void updateAutomation({ approvalMode: event.target.value })}
                    title="Approval mode"
                  >
                    {SOCIAL_APPROVAL_MODE_OPTIONS.map((mode) => (
                      <option key={mode}>{mode}</option>
                    ))}
                  </select>
                  <input
                    value={automation.postingWindow}
                    onChange={(event) => void updateAutomation({ postingWindow: event.target.value })}
                    className="feature-social__input"
                    placeholder="Posting window"
                    title="Posting window"
                  />
                </div>

                <div className="feature-social__field-row">
                  <input
                    value={automation.dailyLimit}
                    onChange={(event) => void updateAutomation({ dailyLimit: event.target.value })}
                    className="feature-social__input"
                    placeholder="Posts per day"
                    title="Posts per day"
                  />
                  <input
                    value={automation.interactionLimit}
                    onChange={(event) => void updateAutomation({ interactionLimit: event.target.value })}
                    className="feature-social__input"
                    placeholder="Interactions per day"
                    title="Interactions per day"
                  />
                </div>

                <div className="feature-social__platform-grid">
                  {socialPlatforms.map((platform) => (
                    <button
                      key={platform.key}
                      type="button"
                      className={`feature-social__platform-toggle ${platform.accentClass} ${connections[platform.key]?.enabled ? 'is-enabled' : ''}`}
                      onClick={() => void toggleEnabledPlatform(platform.key)}
                    >
                      <span className="feature-social__platform-glyph">{platform.glyph}</span>
                      <span>{platform.label}</span>
                    </button>
                  ))}
                </div>

                <button type="button" className="feature-social__primary-action" onClick={() => void launchAgent()}>
                  Launch Automation Agent
                </button>

                <div className="feature-social__agent-summary-card">
                  <div className="feature-social__eyebrow">Main agent control</div>
                  <div className="feature-social__feed-caption">{mainAgent.notes}</div>
                  <div className="feature-social__upload-list">
                    {mainAgent.scope.map((scope) => (
                      <span key={scope} className="feature-social__upload-chip">{scope}</span>
                    ))}
                  </div>
                </div>

                {agentRuns.length > 0 && (
                  <div className="feature-social__agent-run-list">
                    {agentRuns.map((run) => (
                      <article key={run.id} className="feature-social__feed-item">
                        <div className="feature-social__feed-main">
                          <div>
                            <div className="feature-social__feed-title">{run.name}</div>
                            <div className="feature-social__feed-meta">{run.mode} · {run.approvalMode}</div>
                          </div>
                          <span className="feature-social__feed-status is-posted">{run.status}</span>
                        </div>
                        <p className="feature-social__feed-caption">{run.objective}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'feed' && (
            <div className="feature-social__section-stack">
              <section className="feature-social__section">
                <div className="feature-social__section-header">
                  <div>
                    <div className="feature-social__eyebrow">RSS + Activity Feed</div>
                    <h3 className="feature-social__section-title">Pending + Posted</h3>
                  </div>
                  <div className="feature-social__filter-row">
                    {SOCIAL_FEED_FILTERS.map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        className={`feature-social__filter-chip ${feedFilter === filter ? 'is-active' : ''}`}
                        onClick={() => void setFeedFilter(filter)}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="feature-social__section feature-social__section--nested">
                  <div className="feature-social__section-header">
                    <div>
                      <div className="feature-social__eyebrow">RSS publishing</div>
                      <h3 className="feature-social__section-title">Feed automation</h3>
                    </div>
                  </div>
                  <div className="feature-social__field-row">
                    <input
                      value={rssName}
                      onChange={(event) => setRssName(event.target.value)}
                      className="feature-social__input"
                      placeholder="Feed name"
                      title="Feed name"
                    />
                    <input
                      value={rssUrl}
                      onChange={(event) => setRssUrl(event.target.value)}
                      className="feature-social__input"
                      placeholder="https://example.com/feed.xml"
                      title="RSS url"
                    />
                  </div>
                  <textarea
                    value={rssPrompt}
                    onChange={(event) => setRssPrompt(event.target.value)}
                    className="feature-social__textarea"
                    placeholder="Transform prompt or posting instructions"
                    rows={3}
                  />
                  <div className="feature-social__action-row">
                    <button
                      type="button"
                      className="feature-social__secondary-action"
                      onClick={() => {
                        if (!rssUrl.trim()) return;
                        void previewRssFeed(rssUrl.trim());
                      }}
                    >
                      Preview Feed
                    </button>
                    <button
                      type="button"
                      className="feature-social__secondary-action"
                      onClick={() => {
                        if (!rssUrl.trim()) return;
                        void upsertRssFeed({
                          name: rssName.trim() || 'RSS Feed',
                          url: rssUrl.trim(),
                          prompt: rssPrompt.trim(),
                          enabled: true,
                          publishPlatforms: socialPlatforms.filter((platform) => connections[platform.key]?.enabled).map((platform) => platform.key),
                          lastCheckedAt: '',
                          lastItemAt: '',
                        });
                        setRssName('');
                        setRssUrl('');
                        setRssPrompt('');
                      }}
                    >
                      Add RSS Feed
                    </button>
                  </div>
                  {feedPreview.length > 0 && (
                    <div className="feature-social__feed-list">
                      {feedPreview.map((item, index) => (
                        <article key={`${item.link}-${index}`} className="feature-social__feed-item">
                          <div className="feature-social__feed-main">
                            <div>
                              <div className="feature-social__feed-title">{item.title || 'Untitled item'}</div>
                              <div className="feature-social__feed-meta">{item.publishedAt || 'No publish date'}</div>
                            </div>
                            {item.link && (
                              <a className="feature-social__link" href={item.link} target="_blank" rel="noreferrer">
                                Open
                              </a>
                            )}
                          </div>
                          {item.summary && <p className="feature-social__feed-caption">{item.summary}</p>}
                        </article>
                      ))}
                    </div>
                  )}
                  {rssFeeds.length > 0 && (
                    <div className="feature-social__feed-list">
                      {rssFeeds.map((feed) => (
                        <article key={feed.id} className="feature-social__feed-item">
                          <div className="feature-social__feed-main">
                            <div>
                              <div className="feature-social__feed-title">{feed.name}</div>
                              <div className="feature-social__feed-meta">{feed.url}</div>
                            </div>
                            <button type="button" className="feature-social__secondary-action" onClick={() => void removeRssFeed(feed.id)}>
                              Remove
                            </button>
                          </div>
                          {feed.prompt && <p className="feature-social__feed-caption">{feed.prompt}</p>}
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div className="feature-social__feed-list">
                  {filteredFeed.map((post) => (
                    <article key={post.id} className="feature-social__feed-item">
                      <div className="feature-social__feed-main">
                        <div>
                          <div className="feature-social__feed-title">{post.title}</div>
                          <div className="feature-social__feed-meta">{formatCalendarDay(new Date(`${post.date}T00:00:00`))} · {post.time} · {post.format}</div>
                        </div>
                        <span className={`feature-social__feed-status is-${post.status}`}>{post.status}</span>
                      </div>
                      <p className="feature-social__feed-caption">{post.caption}</p>
                      <div className="feature-social__feed-platforms">
                        {post.platforms.map((platformKey) => {
                          const platform = socialPlatforms.find((item) => item.key === platformKey)!;
                          return (
                            <span key={platform.key} className={`feature-social__platform-badge ${platform.accentClass}`}>
                              {platform.glyph}
                            </span>
                          );
                        })}
                      </div>
                      <div className="feature-social__filter-row">
                        {post.status !== 'posted' && (
                          <button type="button" className="feature-social__secondary-action" onClick={() => void publishPost(post.id)}>
                            Publish now
                          </button>
                        )}
                        {post.status !== 'posted' && (
                          <button type="button" className="feature-social__secondary-action" onClick={() => void updatePost(post.id, { status: 'posted' })}>
                            Mark posted
                          </button>
                        )}
                        {post.status !== 'failed' && (
                          <button type="button" className="feature-social__secondary-action" onClick={() => void updatePost(post.id, { status: 'failed', failReason: 'Manual review required' })}>
                            Mark failed
                          </button>
                        )}
                        <button type="button" className="feature-social__secondary-action" onClick={() => void deletePost(post.id)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}