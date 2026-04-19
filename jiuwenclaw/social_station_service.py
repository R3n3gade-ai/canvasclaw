from __future__ import annotations

import json
import re
import base64
import mimetypes
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

import httpx

from jiuwenclaw.utils import get_env_file, get_user_workspace_dir

STATE_FILE = 'social_station.json'
MEDIA_UPLOAD_DIR = 'social_station_uploads'
SCHEDULE_PREFIX = 'social-station-post-'

SOCIAL_PLATFORM_DEFAULTS: list[dict[str, Any]] = [
    {
        'key': 'tiktok',
        'label': 'TikTok',
        'glyph': 'TT',
        'accentClass': 'is-tiktok',
        'supports': ['video', 'reel', 'agent'],
    },
    {
        'key': 'instagram',
        'label': 'Instagram',
        'glyph': 'IG',
        'accentClass': 'is-instagram',
        'supports': ['post', 'story', 'reel', 'agent'],
    },
    {
        'key': 'x',
        'label': 'X',
        'glyph': 'X',
        'accentClass': 'is-x',
        'supports': ['post', 'thread', 'agent'],
    },
    {
        'key': 'facebook',
        'label': 'Facebook',
        'glyph': 'FB',
        'accentClass': 'is-facebook',
        'supports': ['post', 'story', 'reel', 'agent'],
    },
]

SOCIAL_PLATFORM_KEYS = [platform['key'] for platform in SOCIAL_PLATFORM_DEFAULTS]
ALLOWED_POST_STATUSES = {'pending', 'scheduled', 'posted', 'failed'}
ALLOWED_TABS = {'creation', 'automation', 'feed'}
ALLOWED_FORMATS = {'post', 'story', 'reel', 'thread'}
ALLOWED_FEED_FILTERS = {'all', 'pending', 'scheduled', 'posted', 'failed'}
MAX_UPLOADS = 12
MAX_RSS_FEEDS = 32
MAX_RSS_ITEMS_PER_FEED = 10
UPLOAD_POST_API_BASE = 'https://api.upload-post.com/api'
UPLOAD_POST_ENV_KEY = 'SOCIAL_UPLOAD_POST_API_KEY'


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _today_iso() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _month_start_iso() -> str:
    today = datetime.now(timezone.utc).date()
    return today.replace(day=1).isoformat()


def _make_id(prefix: str) -> str:
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')
    return f'{prefix}_{stamp}'


def _slugify(value: str) -> str:
    clean = re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')
    return clean[:48] or 'item'


def _service_state_path() -> Path:
    return get_user_workspace_dir() / STATE_FILE


def _media_upload_dir() -> Path:
    return get_user_workspace_dir() / MEDIA_UPLOAD_DIR


def _env_path() -> Path:
    return get_env_file()


def _read_env_map() -> dict[str, str]:
    env_map: dict[str, str] = {}
    env_path = _env_path()
    if not env_path.exists():
        return env_map
    try:
        for raw_line in env_path.read_text(encoding='utf-8').splitlines():
            line = raw_line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            env_map[key.strip()] = value.strip().strip('"').strip("'")
    except Exception:
        return {}
    return env_map


def _write_env_map(env_map: dict[str, str]) -> None:
    env_path = _env_path()
    env_path.parent.mkdir(parents=True, exist_ok=True)
    lines = [f'{key}={json.dumps(value)}' for key, value in sorted(env_map.items())]
    env_path.write_text('\n'.join(lines) + ('\n' if lines else ''), encoding='utf-8')


def _deep_merge_dict(base: dict[str, Any], updates: dict[str, Any]) -> dict[str, Any]:
    merged = deepcopy(base)
    for key, value in updates.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge_dict(merged[key], value)
        else:
            merged[key] = deepcopy(value)
    return merged


def _default_platform_connections() -> dict[str, dict[str, Any]]:
    return {
        platform['key']: {
            'connected': False,
            'enabled': platform['key'] in {'instagram', 'x', 'facebook'},
            'displayName': '',
            'handle': '',
            'accountId': '',
            'tokenRef': '',
            'status': 'disconnected',
            'lastSyncAt': '',
            'oauthConfigured': False,
            'scopes': [],
            'notes': '',
        }
        for platform in SOCIAL_PLATFORM_DEFAULTS
    }


def _default_draft() -> dict[str, Any]:
    return {
        'selectedFormat': 'post',
        'caption': '',
        'supportingText': '',
        'firstComment': '',
        'hashtags': '',
        'cta': '',
        'audience': 'public',
        'campaignTag': 'Launch Sprint',
        'scheduleTime': '10:30',
        'uploads': [],
        'autoReplyEnabled': True,
        'crossPostEnabled': True,
    }


def _default_automation() -> dict[str, Any]:
    return {
        'agentName': 'Pulse Operator',
        'agentObjective': 'Publish scheduled content, answer safe comments, and surface engagement opportunities.',
        'agentTone': 'Friendly',
        'agentMode': 'Post + Engage',
        'approvalMode': 'Approval for replies only',
        'postingWindow': '09:00 - 18:00',
        'dailyLimit': '12',
        'interactionLimit': '24',
    }


def _default_rss_feeds() -> list[dict[str, Any]]:
    return []


def _default_posts(today_iso: str) -> list[dict[str, Any]]:
    return [
        {
            'id': 'sample_1',
            'title': 'Founder teaser cut',
            'caption': 'Short teaser for the founder clip rollout.',
            'date': today_iso,
            'time': '09:00',
            'platforms': ['instagram', 'tiktok'],
            'status': 'pending',
            'format': 'reel',
            'source': 'manual',
            'createdAt': _now_utc_iso(),
            'updatedAt': _now_utc_iso(),
            'publishedAt': '',
            'scheduledJobId': '',
            'rssFeedId': '',
            'agentRunId': '',
            'failReason': '',
            'meta': {
                'supportingText': '',
                'firstComment': '',
                'hashtags': '',
                'cta': '',
                'audience': 'public',
                'campaignTag': 'Launch Sprint',
                'uploads': [],
                'autoReplyEnabled': True,
                'crossPostEnabled': True,
            },
        },
        {
            'id': 'sample_2',
            'title': 'Product launch thread',
            'caption': 'Thread covering release highlights and CTA.',
            'date': today_iso,
            'time': '14:00',
            'platforms': ['x', 'facebook'],
            'status': 'posted',
            'format': 'thread',
            'source': 'manual',
            'createdAt': _now_utc_iso(),
            'updatedAt': _now_utc_iso(),
            'publishedAt': _now_utc_iso(),
            'scheduledJobId': '',
            'rssFeedId': '',
            'agentRunId': '',
            'failReason': '',
            'meta': {
                'supportingText': '',
                'firstComment': '',
                'hashtags': '',
                'cta': '',
                'audience': 'public',
                'campaignTag': 'Launch Sprint',
                'uploads': [],
                'autoReplyEnabled': False,
                'crossPostEnabled': True,
            },
        },
    ]


def _upload_post_api_key() -> str:
    return _read_env_map().get(UPLOAD_POST_ENV_KEY, '').strip()


def _upload_post_headers(json_body: bool = False) -> dict[str, str]:
    api_key = _upload_post_api_key()
    if not api_key:
        raise ValueError('Upload-Post API key is not configured')
    headers = {'Authorization': f'Apikey {api_key}'}
    if json_body:
        headers['Content-Type'] = 'application/json'
    return headers


def _decode_data_url(data_url: str) -> tuple[bytes, str]:
    if ',' not in data_url:
        raise ValueError('invalid data url')
    header, payload = data_url.split(',', 1)
    mime = 'application/octet-stream'
    if ';base64' not in header:
        raise ValueError('media payload must be base64 data url')
    if header.startswith('data:'):
        mime = header[5:].split(';', 1)[0] or mime
    try:
        return base64.b64decode(payload), mime
    except Exception as exc:  # noqa: BLE001
        raise ValueError('invalid base64 media payload') from exc


async def _fetch_rss_preview(url: str) -> list[dict[str, str]]:
    timeout = httpx.Timeout(15.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        response = await client.get(url, headers={'user-agent': 'JiuwenClaw SocialStation/1.0'})
        response.raise_for_status()
        body = response.text

    root = ET.fromstring(body)
    items: list[dict[str, str]] = []

    def _text(elem: Any, tag: str) -> str:
        found = elem.find(tag)
        if found is None or found.text is None:
            return ''
        return found.text.strip()

    channel = root.find('channel')
    if channel is not None:
        for item in channel.findall('item')[:MAX_RSS_ITEMS_PER_FEED]:
            items.append({
                'title': _text(item, 'title'),
                'link': _text(item, 'link'),
                'publishedAt': _text(item, 'pubDate'),
                'summary': _text(item, 'description'),
            })
        return items

    atom_ns = '{http://www.w3.org/2005/Atom}'
    for entry in root.findall(f'{atom_ns}entry')[:MAX_RSS_ITEMS_PER_FEED]:
        link = ''
        link_elem = entry.find(f'{atom_ns}link')
        if link_elem is not None:
            link = (link_elem.attrib.get('href') or '').strip()
        items.append({
            'title': _text(entry, f'{atom_ns}title'),
            'link': link,
            'publishedAt': _text(entry, f'{atom_ns}updated') or _text(entry, f'{atom_ns}published'),
            'summary': _text(entry, f'{atom_ns}summary') or _text(entry, f'{atom_ns}content'),
        })
    return items


def default_social_station_state() -> dict[str, Any]:
    today_iso = _today_iso()
    return {
        'visibleMonth': _month_start_iso(),
        'selectedDate': today_iso,
        'activeTab': 'creation',
        'platforms': deepcopy(SOCIAL_PLATFORM_DEFAULTS),
        'connections': _default_platform_connections(),
        'feedPreview': [],
        'provider': {
            'name': 'upload-post',
            'apiConfigured': False,
            'baseUrl': UPLOAD_POST_API_BASE,
        },
        'profiles': [],
        'currentProfileName': '',
        'currentConnectUrl': '',
        'mediaLibrary': [],
        'draft': _default_draft(),
        'automation': _default_automation(),
        'feedFilter': 'all',
        'posts': _default_posts(today_iso),
        'rssFeeds': _default_rss_feeds(),
        'agentRuns': [],
        'mainAgent': {
            'enabled': True,
            'scope': ['connections', 'posts', 'schedule', 'rss', 'automation'],
            'lastActionAt': '',
            'notes': 'Main chat agent can manage Social Station through the same backend service.',
        },
        'updatedAt': _now_utc_iso(),
    }


class SocialStationService:
    def __init__(self, state_path: Path | None = None) -> None:
        self._state_path = state_path or _service_state_path()
        self._state_path.parent.mkdir(parents=True, exist_ok=True)

    def load_state(self) -> dict[str, Any]:
        fallback = default_social_station_state()
        if not self._state_path.exists():
            self.save_state(fallback)
            return self._apply_runtime_connection_metadata(fallback)
        try:
            raw = json.loads(self._state_path.read_text(encoding='utf-8'))
        except Exception:
            self.save_state(fallback)
            return self._apply_runtime_connection_metadata(fallback)
        if not isinstance(raw, dict):
            self.save_state(fallback)
            return self._apply_runtime_connection_metadata(fallback)
        state = _deep_merge_dict(fallback, raw)
        state['platforms'] = deepcopy(SOCIAL_PLATFORM_DEFAULTS)
        return self._apply_runtime_connection_metadata(state)

    def save_state(self, state: dict[str, Any]) -> dict[str, Any]:
        state = deepcopy(state)
        state['platforms'] = deepcopy(SOCIAL_PLATFORM_DEFAULTS)
        state['updatedAt'] = _now_utc_iso()
        self._state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding='utf-8')
        return self._apply_runtime_connection_metadata(state)

    def _apply_runtime_connection_metadata(self, state: dict[str, Any]) -> dict[str, Any]:
        next_state = deepcopy(state)
        next_state['provider'] = {
            **deepcopy(next_state.get('provider') or {}),
            'name': 'upload-post',
            'apiConfigured': bool(_upload_post_api_key()),
            'baseUrl': UPLOAD_POST_API_BASE,
        }
        active_profile = str(next_state.get('currentProfileName') or '').strip()
        known_profiles = {
            str(item.get('profileName') or '').strip(): item
            for item in list(next_state.get('profiles') or [])
            if str(item.get('profileName') or '').strip()
        }
        active_profile_row = known_profiles.get(active_profile)
        for platform in SOCIAL_PLATFORM_KEYS:
            connection = deepcopy(next_state['connections'].get(platform, {}))
            is_connected = False
            if isinstance(active_profile_row, dict):
                connected_platforms = active_profile_row.get('connectedPlatforms') or []
                is_connected = platform in connected_platforms
            connection['oauthConfigured'] = bool(active_profile)
            connection['connected'] = is_connected
            connection['status'] = 'connected' if is_connected else ('configured' if active_profile else 'disconnected')
            if is_connected:
                connection['lastSyncAt'] = _now_utc_iso()
                if not connection.get('displayName'):
                    connection['displayName'] = SOCIAL_PLATFORM_DEFAULTS[SOCIAL_PLATFORM_KEYS.index(platform)]['label']
            next_state['connections'][platform] = connection
        return next_state

    def get_state(self) -> dict[str, Any]:
        return self.load_state()

    def update_state(self, updates: dict[str, Any]) -> dict[str, Any]:
        state = self.load_state()
        state = _deep_merge_dict(state, updates)
        return self.save_state(state)

    def set_active_tab(self, tab: str) -> dict[str, Any]:
        if tab not in ALLOWED_TABS:
            raise ValueError('invalid tab')
        return self.update_state({'activeTab': tab})

    def set_selected_date(self, value: str) -> dict[str, Any]:
        datetime.fromisoformat(value)
        return self.update_state({'selectedDate': value, 'visibleMonth': value[:8] + '01'})

    def shift_visible_month(self, offset: int) -> dict[str, Any]:
        state = self.load_state()
        current = datetime.fromisoformat(state['visibleMonth'])
        year = current.year + ((current.month - 1 + offset) // 12)
        month = ((current.month - 1 + offset) % 12) + 1
        next_month = datetime(year, month, 1).date().isoformat()
        state['visibleMonth'] = next_month
        return self.save_state(state)

    def jump_to_today(self) -> dict[str, Any]:
        today = _today_iso()
        return self.update_state({'selectedDate': today, 'visibleMonth': today[:8] + '01'})

    def update_connection(self, platform: str, updates: dict[str, Any]) -> dict[str, Any]:
        if platform not in SOCIAL_PLATFORM_KEYS:
            raise ValueError('invalid platform')
        state = self.load_state()
        current = deepcopy(state['connections'].get(platform, {}))
        current.update(deepcopy(updates))
        state['connections'][platform] = current
        return self.save_state(state)

    def toggle_connected_platform(self, platform: str) -> dict[str, Any]:
        if platform not in SOCIAL_PLATFORM_KEYS:
            raise ValueError('invalid platform')
        raise ValueError('connect platforms via Upload-Post profile links')

    def toggle_enabled_platform(self, platform: str) -> dict[str, Any]:
        state = self.load_state()
        current = deepcopy(state['connections'][platform])
        current['enabled'] = not bool(current.get('enabled'))
        state['connections'][platform] = current
        return self.save_state(state)

    def update_draft(self, updates: dict[str, Any]) -> dict[str, Any]:
        state = self.load_state()
        state['draft'].update(deepcopy(updates))
        uploads = state['draft'].get('uploads') or []
        if isinstance(uploads, list):
            state['draft']['uploads'] = [str(item) for item in uploads][:MAX_UPLOADS]
        return self.save_state(state)

    def update_automation(self, updates: dict[str, Any]) -> dict[str, Any]:
        state = self.load_state()
        state['automation'].update(deepcopy(updates))
        return self.save_state(state)

    def set_feed_filter(self, feed_filter: str) -> dict[str, Any]:
        if feed_filter not in ALLOWED_FEED_FILTERS:
            raise ValueError('invalid feed filter')
        return self.update_state({'feedFilter': feed_filter})

    def list_posts(self) -> list[dict[str, Any]]:
        return self.load_state()['posts']

    def get_post(self, post_id: str) -> dict[str, Any] | None:
        for post in self.load_state()['posts']:
            if post.get('id') == post_id:
                return deepcopy(post)
        return None

    def create_post(self, *, status: str, draft_override: dict[str, Any] | None = None, source: str = 'manual') -> dict[str, Any]:
        if status not in {'pending', 'scheduled'}:
            raise ValueError('invalid post status')
        state = self.load_state()
        draft = deepcopy(state['draft'])
        if draft_override:
            draft.update(deepcopy(draft_override))
        active_platforms = [
            platform['key']
            for platform in SOCIAL_PLATFORM_DEFAULTS
            if state['connections'].get(platform['key'], {}).get('enabled')
        ]
        caption = str(draft.get('caption') or '').strip()
        if not active_platforms:
            raise ValueError('enable at least one platform')
        if not caption:
            raise ValueError('caption is required')
        selected_date = state.get('selectedDate') or _today_iso()
        schedule_time = str(draft.get('scheduleTime') or '10:30')
        next_post = {
            'id': _make_id('social'),
            'title': caption[:42],
            'caption': caption,
            'date': selected_date,
            'time': schedule_time,
            'platforms': active_platforms,
            'status': status,
            'format': draft.get('selectedFormat') if draft.get('selectedFormat') in ALLOWED_FORMATS else 'post',
            'source': source,
            'createdAt': _now_utc_iso(),
            'updatedAt': _now_utc_iso(),
            'publishedAt': '',
            'scheduledJobId': '',
            'rssFeedId': '',
            'agentRunId': '',
            'failReason': '',
            'meta': {
                'supportingText': draft.get('supportingText', ''),
                'firstComment': draft.get('firstComment', ''),
                'hashtags': draft.get('hashtags', ''),
                'cta': draft.get('cta', ''),
                'audience': draft.get('audience', 'public'),
                'campaignTag': draft.get('campaignTag', ''),
                'uploads': list(draft.get('uploads') or [])[:MAX_UPLOADS],
                'autoReplyEnabled': bool(draft.get('autoReplyEnabled', False)),
                'crossPostEnabled': bool(draft.get('crossPostEnabled', False)),
            },
        }
        state['activeTab'] = 'feed'
        state['posts'] = [next_post, *state['posts']]
        state['draft'].update({
            'caption': '',
            'supportingText': '',
            'firstComment': '',
            'hashtags': '',
            'cta': '',
            'uploads': [],
        })
        self.save_state(state)
        return next_post

    def update_post(self, post_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        state = self.load_state()
        updated: dict[str, Any] | None = None
        for index, post in enumerate(state['posts']):
            if post.get('id') != post_id:
                continue
            next_post = deepcopy(post)
            for key, value in patch.items():
                if key == 'status' and value not in ALLOWED_POST_STATUSES:
                    raise ValueError('invalid post status')
                if key == 'platforms' and isinstance(value, list):
                    next_post[key] = [item for item in value if item in SOCIAL_PLATFORM_KEYS]
                elif key == 'meta' and isinstance(value, dict):
                    next_post['meta'] = _deep_merge_dict(next_post.get('meta', {}), value)
                else:
                    next_post[key] = deepcopy(value)
            next_post['updatedAt'] = _now_utc_iso()
            if next_post.get('status') == 'posted' and not next_post.get('publishedAt'):
                next_post['publishedAt'] = _now_utc_iso()
            state['posts'][index] = next_post
            updated = next_post
            break
        if updated is None:
            raise ValueError('post not found')
        self.save_state(state)
        return updated

    def delete_post(self, post_id: str) -> dict[str, Any]:
        state = self.load_state()
        original_len = len(state['posts'])
        state['posts'] = [post for post in state['posts'] if post.get('id') != post_id]
        if len(state['posts']) == original_len:
            raise ValueError('post not found')
        return self.save_state(state)

    def upsert_rss_feed(self, feed: dict[str, Any]) -> dict[str, Any]:
        state = self.load_state()
        feeds = list(state.get('rssFeeds') or [])
        feed_id = str(feed.get('id') or '').strip() or _make_id('rss')
        url = str(feed.get('url') or '').strip()
        if not url:
            raise ValueError('rss feed url is required')
        parsed = urlparse(url)
        if parsed.scheme not in {'http', 'https'} or not parsed.netloc:
            raise ValueError('rss feed url must be http(s)')
        item = {
            'id': feed_id,
            'name': str(feed.get('name') or 'RSS Feed').strip() or 'RSS Feed',
            'url': url,
            'enabled': bool(feed.get('enabled', True)),
            'publishPlatforms': [item for item in list(feed.get('publishPlatforms') or []) if item in SOCIAL_PLATFORM_KEYS],
            'prompt': str(feed.get('prompt') or '').strip(),
            'lastCheckedAt': str(feed.get('lastCheckedAt') or ''),
            'lastItemAt': str(feed.get('lastItemAt') or ''),
        }
        replaced = False
        next_feeds = []
        for existing in feeds:
            if existing.get('id') == feed_id:
                next_feeds.append(item)
                replaced = True
            else:
                next_feeds.append(existing)
        if not replaced:
            next_feeds.append(item)
        state['rssFeeds'] = next_feeds[:MAX_RSS_FEEDS]
        self.save_state(state)
        return item

    def remove_rss_feed(self, feed_id: str) -> dict[str, Any]:
        state = self.load_state()
        state['rssFeeds'] = [feed for feed in state.get('rssFeeds', []) if feed.get('id') != feed_id]
        return self.save_state(state)

    def set_upload_post_api_key(self, api_key: str) -> dict[str, Any]:
        value = str(api_key or '').strip()
        if not value:
            raise ValueError('api key is required')
        env_map = _read_env_map()
        env_map[UPLOAD_POST_ENV_KEY] = value
        _write_env_map(env_map)
        return self.load_state()

    async def list_upload_post_profiles(self) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=httpx.Timeout(20.0), follow_redirects=True) as client:
            response = await client.get(f'{UPLOAD_POST_API_BASE}/uploadposts/users', headers=_upload_post_headers())
            response.raise_for_status()
            data = response.json()
        profiles_raw = data if isinstance(data, list) else data.get('users') or data.get('profiles') or []
        profiles: list[dict[str, Any]] = []
        for item in profiles_raw:
            if not isinstance(item, dict):
                continue
            profile_name = str(item.get('username') or item.get('user') or '').strip()
            if not profile_name:
                continue
            connected_platforms = [
                str(platform).strip().lower()
                for platform in (item.get('platforms') or item.get('connected_platforms') or item.get('socialNetworks') or [])
                if str(platform).strip().lower() in SOCIAL_PLATFORM_KEYS
            ]
            profiles.append({
                'profileName': profile_name,
                'connectedPlatforms': connected_platforms,
                'raw': item,
            })
        state = self.load_state()
        state['profiles'] = profiles
        if not state.get('currentProfileName') and profiles:
            state['currentProfileName'] = profiles[0]['profileName']
        self.save_state(state)
        return profiles

    async def ensure_upload_post_profile(self, profile_name: str) -> dict[str, Any]:
        normalized = str(profile_name or '').strip()
        if not normalized:
            raise ValueError('profile name is required')
        profiles = await self.list_upload_post_profiles()
        existing = next((item for item in profiles if item['profileName'] == normalized), None)
        if existing is None:
            payload = {'username': normalized}
            async with httpx.AsyncClient(timeout=httpx.Timeout(20.0), follow_redirects=True) as client:
                response = await client.post(
                    f'{UPLOAD_POST_API_BASE}/uploadposts/users',
                    headers=_upload_post_headers(json_body=True),
                    json=payload,
                )
                response.raise_for_status()
            profiles = await self.list_upload_post_profiles()
            existing = next((item for item in profiles if item['profileName'] == normalized), None)
        if existing is None:
            existing = {'profileName': normalized, 'connectedPlatforms': [], 'raw': {}}
        state = self.load_state()
        state['currentProfileName'] = normalized
        self.save_state(state)
        return existing

    async def generate_upload_post_connect_url(
        self,
        profile_name: str,
        *,
        redirect_url: str = '',
        logo_image: str = '',
        connect_title: str = 'Connect your social accounts',
        connect_description: str = 'Link the social media accounts you want Social Station to publish to.',
        platforms: list[str] | None = None,
        show_calendar: bool = True,
        readonly_calendar: bool = False,
    ) -> dict[str, Any]:
        normalized = str(profile_name or '').strip()
        if not normalized:
            raise ValueError('profile name is required')
        await self.ensure_upload_post_profile(normalized)
        payload: dict[str, Any] = {
            'username': normalized,
            'connect_title': connect_title,
            'connect_description': connect_description,
            'show_calendar': bool(show_calendar),
            'readonly_calendar': bool(readonly_calendar),
        }
        if redirect_url.strip():
            payload['redirect_url'] = redirect_url.strip()
        if logo_image.strip():
            payload['logo_image'] = logo_image.strip()
        if platforms:
            payload['platforms'] = [item for item in platforms if item in SOCIAL_PLATFORM_KEYS]
        async with httpx.AsyncClient(timeout=httpx.Timeout(20.0), follow_redirects=True) as client:
            response = await client.post(
                f'{UPLOAD_POST_API_BASE}/uploadposts/users/generate-jwt',
                headers=_upload_post_headers(json_body=True),
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
        access_url = str(data.get('access_url') or '').strip()
        state = self.load_state()
        state['currentProfileName'] = normalized
        state['currentConnectUrl'] = access_url
        self.save_state(state)
        return {'profileName': normalized, 'accessUrl': access_url, 'raw': data}

    async def preview_rss_feed(self, url: str) -> list[dict[str, str]]:
        parsed = urlparse(url.strip())
        if parsed.scheme not in {'http', 'https'} or not parsed.netloc:
            raise ValueError('rss feed url must be http(s)')
        items = await _fetch_rss_preview(url.strip())
        state = self.load_state()
        state['feedPreview'] = items
        self.save_state(state)
        return items

    def upload_media_asset(self, name: str, data_url: str) -> dict[str, Any]:
        file_name = Path(str(name or 'upload').strip() or 'upload').name
        raw_bytes, mime = _decode_data_url(data_url)
        ext = Path(file_name).suffix or mimetypes.guess_extension(mime) or ''
        asset_id = _make_id('media')
        target_dir = _media_upload_dir()
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / f'{asset_id}{ext}'
        target_path.write_bytes(raw_bytes)
        asset = {
            'id': asset_id,
            'name': file_name,
            'mimeType': mime,
            'size': len(raw_bytes),
            'path': str(target_path),
            'createdAt': _now_utc_iso(),
        }
        state = self.load_state()
        media_library = list(state.get('mediaLibrary') or [])
        media_library.append(asset)
        state['mediaLibrary'] = media_library[-MAX_UPLOADS * 5 :]
        draft = deepcopy(state.get('draft') or _default_draft())
        uploads = list(draft.get('uploads') or [])
        uploads.append(str(target_path))
        draft['uploads'] = uploads[-MAX_UPLOADS:]
        state['draft'] = draft
        self.save_state(state)
        return asset

    def launch_agent(self) -> dict[str, Any]:
        state = self.load_state()
        run = {
            'id': _make_id('agent'),
            'name': state['automation'].get('agentName') or 'Social Agent',
            'status': 'active',
            'startedAt': _now_utc_iso(),
            'objective': state['automation'].get('agentObjective', ''),
            'mode': state['automation'].get('agentMode', ''),
            'approvalMode': state['automation'].get('approvalMode', ''),
            'platforms': [
                platform['key']
                for platform in SOCIAL_PLATFORM_DEFAULTS
                if state['connections'].get(platform['key'], {}).get('enabled')
            ],
        }
        state['agentRuns'] = [run, *(state.get('agentRuns') or [])][:20]
        self.save_state(state)
        return run

    async def publish_post_via_upload_post(self, post_id: str) -> dict[str, Any]:
        state = self.load_state()
        profile_name = str(state.get('currentProfileName') or '').strip()
        if not profile_name:
            raise ValueError('select or create an Upload-Post profile first')
        post = self.get_post(post_id)
        if post is None:
            raise ValueError('post not found')
        uploads = list((post.get('meta') or {}).get('uploads') or [])
        first_comment = str((post.get('meta') or {}).get('firstComment') or '').strip()
        hashtags = str((post.get('meta') or {}).get('hashtags') or '').strip()
        caption = str(post.get('caption') or '').strip()
        if hashtags:
            caption = f"{caption}\n\n{hashtags}".strip()
        platforms = [platform for platform in list(post.get('platforms') or []) if platform in SOCIAL_PLATFORM_KEYS]
        if not platforms:
            raise ValueError('post has no enabled platforms')

        if uploads:
            has_video = any(str(item).lower().endswith(('.mp4', '.mov', '.webm', '.mkv')) for item in uploads)
            endpoint = '/upload' if has_video else '/upload_photos'
            files: list[tuple[str, tuple[str, Any, str]]] = []
            data: list[tuple[str, str]] = [('user', profile_name), ('title', caption)]
            if first_comment:
                data.append(('first_comment', first_comment))
            for platform in platforms:
                data.append(('platform[]', platform))
            if has_video:
                video_path = Path(uploads[0])
                files.append(('video', (video_path.name, video_path.open('rb'), 'application/octet-stream')))
            else:
                for upload in uploads:
                    photo_path = Path(upload)
                    files.append(('photos[]', (photo_path.name, photo_path.open('rb'), 'application/octet-stream')))
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(120.0), follow_redirects=True) as client:
                    response = await client.post(
                        f'{UPLOAD_POST_API_BASE}{endpoint}',
                        headers={'Authorization': _upload_post_headers()['Authorization']},
                        data=data,
                        files=files,
                    )
                    response.raise_for_status()
                    provider_response = response.json()
            finally:
                for _, file_tuple in files:
                    try:
                        file_tuple[1].close()
                    except Exception:
                        pass
        else:
            payload: dict[str, Any] = {
                'user': profile_name,
                'title': caption,
                'platform': platforms,
            }
            if first_comment:
                payload['first_comment'] = first_comment
            async with httpx.AsyncClient(timeout=httpx.Timeout(40.0), follow_redirects=True) as client:
                response = await client.post(
                    f'{UPLOAD_POST_API_BASE}/upload_text',
                    headers=_upload_post_headers(json_body=True),
                    json=payload,
                )
                response.raise_for_status()
                provider_response = response.json()

        patch = {
            'status': 'posted',
            'publishedAt': _now_utc_iso(),
            'meta': {
                'provider': 'upload-post',
                'providerResponse': provider_response,
                'providerProfileName': profile_name,
            },
            'failReason': '',
        }
        return self.update_post(post_id, patch)

    def build_cron_job_payload(self, post: dict[str, Any]) -> dict[str, Any]:
        run_at = f"{post['date']}T{post['time']}:00"
        return {
            'name': f"{SCHEDULE_PREFIX}{post['id']}",
            'enabled': True,
            'schedule': {
                'kind': 'at',
                'at': run_at,
            },
            'payload': {
                'kind': 'agentTurn',
                'message': (
                    'Social Station scheduled post execution. '
                    f"Publish post {post['id']} to Upload-Post profile {post.get('meta', {}).get('providerProfileName', 'current-profile')}. "
                    f"Platforms: {', '.join(post.get('platforms') or [])}. Caption: {post.get('caption', '')}"
                ),
            },
            'delivery': {
                'mode': 'none',
            },
            'sessionTarget': 'isolated',
        }

    def sync_post_job(self, post_id: str, job_id: str | None) -> dict[str, Any]:
        patch = {'scheduledJobId': job_id or ''}
        if job_id:
            patch['status'] = 'scheduled'
        return self.update_post(post_id, patch)
