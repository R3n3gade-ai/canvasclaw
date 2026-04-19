import { useMemo } from 'react';
import {
  SOCIAL_AGENT_MODE_OPTIONS,
  SOCIAL_AGENT_TONE_OPTIONS,
  SOCIAL_APPROVAL_MODE_OPTIONS,
  SOCIAL_AUDIENCE_OPTIONS,
  SOCIAL_FEED_FILTERS,
  SOCIAL_FORMAT_OPTIONS,
  SOCIAL_PLATFORMS,
  type SocialPostItem,
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
  const visibleMonthIso = useSocialStationStore((state) => state.visibleMonth);
  const selectedDate = useSocialStationStore((state) => state.selectedDate);
  const activeTab = useSocialStationStore((state) => state.activeTab);
  const connectedPlatforms = useSocialStationStore((state) => state.connectedPlatforms);
  const enabledPlatforms = useSocialStationStore((state) => state.enabledPlatforms);
  const draft = useSocialStationStore((state) => state.draft);
  const automation = useSocialStationStore((state) => state.automation);
  const feedFilter = useSocialStationStore((state) => state.feedFilter);
  const posts = useSocialStationStore((state) => state.posts);
  const shiftVisibleMonth = useSocialStationStore((state) => state.shiftVisibleMonth);
  const jumpToToday = useSocialStationStore((state) => state.jumpToToday);
  const setSelectedDate = useSocialStationStore((state) => state.setSelectedDate);
  const setActiveTab = useSocialStationStore((state) => state.setActiveTab);
  const toggleConnectedPlatform = useSocialStationStore((state) => state.toggleConnectedPlatform);
  const toggleEnabledPlatform = useSocialStationStore((state) => state.toggleEnabledPlatform);
  const updateDraft = useSocialStationStore((state) => state.updateDraft);
  const updateAutomation = useSocialStationStore((state) => state.updateAutomation);
  const setFeedFilter = useSocialStationStore((state) => state.setFeedFilter);
  const createPost = useSocialStationStore((state) => state.createPost);

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

  return (
    <div className="feature-social animate-rise">
      <section className="feature-social__calendar-shell">
        <div className="feature-social__toolbar">
          <div className="feature-social__month-nav">
            <button
              type="button"
              className="feature-social__nav-button"
              onClick={() => shiftVisibleMonth(-1)}
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
              onClick={() => shiftVisibleMonth(1)}
              title="Next month"
            >
              ›
            </button>
            <button
              type="button"
              className="feature-social__today-button"
              onClick={jumpToToday}
            >
              Today
            </button>
          </div>

          <div className="feature-social__account-strip">
            {SOCIAL_PLATFORMS.map((platform) => {
              const connected = connectedPlatforms[platform.key];
              return (
                <button
                  key={platform.key}
                  type="button"
                  className={`feature-social__account-button ${platform.accentClass} ${connected ? 'is-connected' : ''}`}
                  onClick={() => toggleConnectedPlatform(platform.key)}
                  title={connected ? `Disconnect ${platform.label}` : `Connect ${platform.label}`}
                >
                  <span className="feature-social__account-glyph">{platform.glyph}</span>
                  <span className="feature-social__account-label">{platform.label}</span>
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
                  onClick={() => setSelectedDate(isoDate)}
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
              onClick={() => setActiveTab('creation')}
            >
              Post Creation
            </button>
            <button
              type="button"
              className={`feature-social__rail-tab ${activeTab === 'automation' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('automation')}
            >
              Automation Agents
            </button>
            <button
              type="button"
              className={`feature-social__rail-tab ${activeTab === 'feed' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('feed')}
            >
              Live Feed
            </button>
          </div>
          <button type="button" className="feature-social__secondary-action" onClick={onExit}>
            Back to chat
          </button>
        </div>

        <div className="feature-social__rail-panel">
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
                  {SOCIAL_PLATFORMS.map((platform) => {
                    const enabled = enabledPlatforms[platform.key];
                    return (
                      <button
                        key={platform.key}
                        type="button"
                        className={`feature-social__platform-toggle ${platform.accentClass} ${enabled ? 'is-enabled' : ''}`}
                        onClick={() => toggleEnabledPlatform(platform.key)}
                        title={enabled ? `Disable ${platform.label}` : `Enable ${platform.label}`}
                      >
                        <span className="feature-social__platform-glyph">{platform.glyph}</span>
                        <span>{platform.label}</span>
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
                      onClick={() => updateDraft({ selectedFormat: format })}
                    >
                      {format}
                    </button>
                  ))}
                </div>

                <textarea
                  value={draft.caption}
                  onChange={(event) => updateDraft({ caption: event.target.value })}
                  className="feature-social__textarea feature-social__textarea--tall"
                  placeholder="Write caption, hook, or thread opener..."
                  rows={5}
                />

                <div className="feature-social__field-row">
                  <input
                    value={draft.supportingText}
                    onChange={(event) => updateDraft({ supportingText: event.target.value })}
                    className="feature-social__input"
                    placeholder="Headline or on-screen text"
                    title="Headline or on-screen text"
                  />
                  <input
                    value={draft.cta}
                    onChange={(event) => updateDraft({ cta: event.target.value })}
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
                        const files = Array.from(event.target.files ?? []).map((file) => file.name);
                        updateDraft({ uploads: files });
                      }}
                    />
                  </label>
                  {draft.uploads.length > 0 && (
                    <div className="feature-social__upload-list">
                      {draft.uploads.map((fileName) => (
                        <span key={fileName} className="feature-social__upload-chip">
                          {fileName}
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

                <div className="feature-social__field-row">
                  <select
                    className="feature-social__select"
                    value={draft.audience}
                    onChange={(event) => updateDraft({ audience: event.target.value as (typeof SOCIAL_AUDIENCE_OPTIONS)[number] })}
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
                    onChange={(event) => updateDraft({ campaignTag: event.target.value })}
                    className="feature-social__input"
                    placeholder="Campaign tag"
                    title="Campaign tag"
                  />
                </div>

                <div className="feature-social__field-row">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="feature-social__input"
                    title="Scheduled date"
                  />
                  <input
                    type="time"
                    value={draft.scheduleTime}
                    onChange={(event) => updateDraft({ scheduleTime: event.target.value })}
                    className="feature-social__input"
                    title="Scheduled time"
                  />
                </div>

                <textarea
                  value={draft.firstComment}
                  onChange={(event) => updateDraft({ firstComment: event.target.value })}
                  className="feature-social__textarea"
                  placeholder="First comment, thread continuation, or pinned reply"
                  rows={2}
                />
                <input
                  value={draft.hashtags}
                  onChange={(event) => updateDraft({ hashtags: event.target.value })}
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
                      onChange={() => updateDraft({ crossPostEnabled: !draft.crossPostEnabled })}
                    />
                  </label>
                  <label className="feature-social__toggle-card">
                    <span>Auto-reply after publish</span>
                    <input
                      type="checkbox"
                      checked={draft.autoReplyEnabled}
                      onChange={() => updateDraft({ autoReplyEnabled: !draft.autoReplyEnabled })}
                    />
                  </label>
                </div>

                <div className="feature-social__action-row">
                  <button type="button" className="feature-social__primary-action" onClick={() => createPost('scheduled')}>
                    Schedule Post
                  </button>
                  <button type="button" className="feature-social__secondary-action" onClick={() => createPost('pending')}>
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
                  onChange={(event) => updateAutomation({ agentName: event.target.value })}
                  className="feature-social__input"
                  placeholder="Agent name"
                  title="Agent name"
                />
                <textarea
                  value={automation.agentObjective}
                  onChange={(event) => updateAutomation({ agentObjective: event.target.value })}
                  className="feature-social__textarea feature-social__textarea--tall"
                  placeholder="Mission, brand rules, and engagement goals"
                  rows={5}
                />

                <div className="feature-social__field-row">
                  <select
                    className="feature-social__select"
                    value={automation.agentTone}
                    onChange={(event) => updateAutomation({ agentTone: event.target.value })}
                    title="Agent tone"
                  >
                    {SOCIAL_AGENT_TONE_OPTIONS.map((tone) => (
                      <option key={tone}>{tone}</option>
                    ))}
                  </select>
                  <select
                    className="feature-social__select"
                    value={automation.agentMode}
                    onChange={(event) => updateAutomation({ agentMode: event.target.value })}
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
                    onChange={(event) => updateAutomation({ approvalMode: event.target.value })}
                    title="Approval mode"
                  >
                    {SOCIAL_APPROVAL_MODE_OPTIONS.map((mode) => (
                      <option key={mode}>{mode}</option>
                    ))}
                  </select>
                  <input
                    value={automation.postingWindow}
                    onChange={(event) => updateAutomation({ postingWindow: event.target.value })}
                    className="feature-social__input"
                    placeholder="Posting window"
                    title="Posting window"
                  />
                </div>

                <div className="feature-social__field-row">
                  <input
                    value={automation.dailyLimit}
                    onChange={(event) => updateAutomation({ dailyLimit: event.target.value })}
                    className="feature-social__input"
                    placeholder="Posts per day"
                    title="Posts per day"
                  />
                  <input
                    value={automation.interactionLimit}
                    onChange={(event) => updateAutomation({ interactionLimit: event.target.value })}
                    className="feature-social__input"
                    placeholder="Interactions per day"
                    title="Interactions per day"
                  />
                </div>

                <div className="feature-social__platform-grid">
                  {SOCIAL_PLATFORMS.map((platform) => (
                    <button
                      key={platform.key}
                      type="button"
                      className={`feature-social__platform-toggle ${platform.accentClass} ${enabledPlatforms[platform.key] ? 'is-enabled' : ''}`}
                      onClick={() => toggleEnabledPlatform(platform.key)}
                    >
                      <span className="feature-social__platform-glyph">{platform.glyph}</span>
                      <span>{platform.label}</span>
                    </button>
                  ))}
                </div>

                <button type="button" className="feature-social__primary-action">
                  Launch Automation Agent
                </button>
              </section>
            </div>
          )}

          {activeTab === 'feed' && (
            <div className="feature-social__section-stack">
              <section className="feature-social__section">
                <div className="feature-social__section-header">
                  <div>
                    <div className="feature-social__eyebrow">Activity Feed</div>
                    <h3 className="feature-social__section-title">Pending + Posted</h3>
                  </div>
                  <div className="feature-social__filter-row">
                    {SOCIAL_FEED_FILTERS.map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        className={`feature-social__filter-chip ${feedFilter === filter ? 'is-active' : ''}`}
                        onClick={() => setFeedFilter(filter)}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
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
                          const platform = SOCIAL_PLATFORMS.find((item) => item.key === platformKey)!;
                          return (
                            <span key={platform.key} className={`feature-social__platform-badge ${platform.accentClass}`}>
                              {platform.glyph}
                            </span>
                          );
                        })}
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