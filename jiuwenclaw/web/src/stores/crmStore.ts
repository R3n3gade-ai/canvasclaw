import { create } from 'zustand';

const STORAGE_KEY = 'deep_canvas_crm_v1';

export type CrmLeadStage = 'new' | 'qualified' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type CrmLeadStatus = 'active' | 'nurturing' | 'follow-up' | 'stale' | 'closed';
export type CrmDensity = 'compact' | 'cozy';
export type CrmViewPreset = 'all' | 'hot' | 'follow-up' | 'pipeline' | 'closed';
export type CrmSortDirection = 'asc' | 'desc';
export type CrmColumnKind = 'core' | 'custom';
export type CrmSourceFilter = 'all' | string;
export type CrmImportableField =
  | 'name'
  | 'company'
  | 'email'
  | 'phone'
  | 'address'
  | 'website'
  | 'owner'
  | 'source'
  | 'stage'
  | 'status'
  | 'score'
  | 'nextAction'
  | 'lastContactAt'
  | 'tags';
export type CrmImportTarget = '__ignore__' | CrmImportableField | `custom:${string}`;

export interface CrmColumn {
  key: string;
  label: string;
  kind: CrmColumnKind;
  visible: boolean;
}

export interface CrmLeadNote {
  id: string;
  body: string;
  createdAt: string;
}

export interface CrmLead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  owner: string;
  source: string;
  stage: CrmLeadStage;
  status: CrmLeadStatus;
  score: number;
  nextAction: string;
  lastContactAt: string;
  tags: string[];
  customFields: Record<string, string>;
  notes: CrmLeadNote[];
  createdAt: string;
  updatedAt: string;
}

export interface CrmCsvParseResult {
  headers: string[];
  rows: string[][];
}

export interface CrmImportMapping {
  header: string;
  target: CrmImportTarget;
}

export interface CreateLeadInput {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  owner?: string;
  source?: string;
  stage?: CrmLeadStage;
  status?: CrmLeadStatus;
  score?: number;
  nextAction?: string;
  lastContactAt?: string;
  tags?: string[];
  customFields?: Record<string, string>;
}

interface CrmSnapshot {
  columns: CrmColumn[];
  leads: CrmLead[];
  searchQuery: string;
  stageFilter: CrmLeadStage | 'all';
  statusFilter: CrmLeadStatus | 'all';
  sourceFilter: CrmSourceFilter;
  viewPreset: CrmViewPreset;
  density: CrmDensity;
  sortKey: string;
  sortDirection: CrmSortDirection;
  detailLeadId: string | null;
}

interface CrmState extends CrmSnapshot {
  setSearchQuery: (value: string) => void;
  setStageFilter: (value: CrmLeadStage | 'all') => void;
  setStatusFilter: (value: CrmLeadStatus | 'all') => void;
  setSourceFilter: (value: CrmSourceFilter) => void;
  setViewPreset: (value: CrmViewPreset) => void;
  setDensity: (value: CrmDensity) => void;
  setSort: (key: string) => void;
  toggleColumnVisibility: (key: string) => void;
  addCustomColumn: (label: string) => void;
  addLead: (input: CreateLeadInput) => void;
  updateLead: (leadId: string, updates: Partial<Omit<CrmLead, 'id' | 'notes' | 'customFields' | 'createdAt'>>) => void;
  updateLeadCustomField: (leadId: string, fieldKey: string, value: string) => void;
  addLeadNote: (leadId: string, body: string) => void;
  openLead: (leadId: string) => void;
  closeLead: () => void;
  importCsv: (content: string) => number;
  importMappedCsv: (content: string, mappings: CrmImportMapping[]) => number;
}

export const CRM_STAGE_OPTIONS: CrmLeadStage[] = ['new', 'qualified', 'contacted', 'proposal', 'negotiation', 'won', 'lost'];
export const CRM_STATUS_OPTIONS: CrmLeadStatus[] = ['active', 'nurturing', 'follow-up', 'stale', 'closed'];
export const CRM_VIEW_PRESETS: CrmViewPreset[] = ['all', 'hot', 'follow-up', 'pipeline', 'closed'];
export const CRM_IMPORTABLE_FIELDS: Array<{ key: CrmImportableField; label: string }> = [
  { key: 'name', label: 'Lead' },
  { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
  { key: 'website', label: 'Website' },
  { key: 'owner', label: 'Owner' },
  { key: 'source', label: 'Source' },
  { key: 'stage', label: 'Stage' },
  { key: 'status', label: 'Status' },
  { key: 'score', label: 'Score' },
  { key: 'nextAction', label: 'Next Action' },
  { key: 'lastContactAt', label: 'Last Contact' },
  { key: 'tags', label: 'Tags' },
];

const DEFAULT_SOURCE_OPTIONS = ['Website', 'Referral', 'Outbound', 'Event', 'Partner'];

const DEFAULT_COLUMNS: CrmColumn[] = [
  { key: 'name', label: 'Lead', kind: 'core', visible: true },
  { key: 'company', label: 'Company', kind: 'core', visible: true },
  { key: 'email', label: 'Email', kind: 'core', visible: true },
  { key: 'phone', label: 'Phone', kind: 'core', visible: true },
  { key: 'address', label: 'Address', kind: 'core', visible: true },
  { key: 'stage', label: 'Stage', kind: 'core', visible: true },
  { key: 'status', label: 'Status', kind: 'core', visible: true },
  { key: 'owner', label: 'Owner', kind: 'core', visible: true },
  { key: 'source', label: 'Source', kind: 'core', visible: false },
  { key: 'score', label: 'Score', kind: 'core', visible: false },
  { key: 'nextAction', label: 'Next Action', kind: 'core', visible: false },
  { key: 'lastContactAt', label: 'Last Contact', kind: 'core', visible: false },
  { key: 'updatedAt', label: 'Updated', kind: 'core', visible: false },
];

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function parseCrmCsv(content: string): CrmCsvParseResult {
  const lines = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const [headerLine, ...rowLines] = lines;
  return {
    headers: parseCsvLine(headerLine),
    rows: rowLines.map(parseCsvLine),
  };
}

function resolveCoreField(header: string): CrmImportableField | null {
  const normalized = normalizeHeader(header);
  const aliases: Record<string, CrmImportableField> = {
    lead: 'name',
    name: 'name',
    'full name': 'name',
    company: 'company',
    organization: 'company',
    email: 'email',
    'email address': 'email',
    phone: 'phone',
    'phone number': 'phone',
    mobile: 'phone',
    address: 'address',
    location: 'address',
    website: 'website',
    owner: 'owner',
    rep: 'owner',
    source: 'source',
    stage: 'stage',
    status: 'status',
    score: 'score',
    'lead score': 'score',
    'next action': 'nextAction',
    'follow up': 'nextAction',
    'last contact': 'lastContactAt',
    tags: 'tags',
  };

  return aliases[normalized] ?? null;
}

function sanitizeStage(value: string): CrmLeadStage {
  const normalized = value.trim().toLowerCase();
  return CRM_STAGE_OPTIONS.find((option) => option === normalized) ?? 'new';
}

function sanitizeStatus(value: string): CrmLeadStatus {
  const normalized = value.trim().toLowerCase();
  return CRM_STATUS_OPTIONS.find((option) => option === normalized) ?? 'active';
}

function createDefaultSnapshot(): CrmSnapshot {
  const timestamp = nowIso();
  return {
    columns: DEFAULT_COLUMNS,
    leads: [
      {
        id: 'lead_1',
        name: 'Avery Brooks',
        company: 'Northline Studio',
        email: 'avery@northline.studio',
        phone: '(415) 555-0168',
        address: '1142 Market St, San Francisco, CA',
        website: 'northline.studio',
        owner: 'Jordan',
        source: 'Referral',
        stage: 'qualified',
        status: 'follow-up',
        score: 84,
        nextAction: 'Book intro call',
        lastContactAt: '2026-04-16',
        tags: ['high-value', 'design'],
        customFields: {},
        notes: [
          { id: 'note_1', body: 'Interested in a multi-seat rollout next quarter.', createdAt: timestamp },
        ],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: 'lead_2',
        name: 'Sofia Patel',
        company: 'Peak Logistics',
        email: 'spatel@peaklogistics.com',
        phone: '(212) 555-0182',
        address: '85 W 34th St, New York, NY',
        website: 'peaklogistics.com',
        owner: 'Mina',
        source: 'Website',
        stage: 'contacted',
        status: 'active',
        score: 73,
        nextAction: 'Send pricing sheet',
        lastContactAt: '2026-04-17',
        tags: ['ops'],
        customFields: {},
        notes: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: 'lead_3',
        name: 'Marcus Green',
        company: 'Valence Health',
        email: 'marcus.green@valencehealth.io',
        phone: '(646) 555-0107',
        address: '440 9th Ave, New York, NY',
        website: 'valencehealth.io',
        owner: 'Jordan',
        source: 'Event',
        stage: 'proposal',
        status: 'nurturing',
        score: 91,
        nextAction: 'Review proposal feedback',
        lastContactAt: '2026-04-15',
        tags: ['healthcare', 'priority'],
        customFields: {},
        notes: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    searchQuery: '',
    stageFilter: 'all',
    statusFilter: 'all',
    sourceFilter: 'all',
    viewPreset: 'all',
    density: 'compact',
    sortKey: 'updatedAt',
    sortDirection: 'desc',
    detailLeadId: null,
  };
}

function loadSnapshot(): CrmSnapshot {
  const fallback = createDefaultSnapshot();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<CrmSnapshot>;
    const stageFilter = parsed.stageFilter === 'all' || CRM_STAGE_OPTIONS.includes(parsed.stageFilter as CrmLeadStage)
      ? parsed.stageFilter ?? fallback.stageFilter
      : fallback.stageFilter;
    const statusFilter = parsed.statusFilter === 'all' || CRM_STATUS_OPTIONS.includes(parsed.statusFilter as CrmLeadStatus)
      ? parsed.statusFilter ?? fallback.statusFilter
      : fallback.statusFilter;

    return {
      columns: Array.isArray(parsed.columns) && parsed.columns.length > 0 ? parsed.columns : fallback.columns,
      leads: Array.isArray(parsed.leads) ? parsed.leads : fallback.leads,
      searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : fallback.searchQuery,
      stageFilter,
      statusFilter,
      sourceFilter: typeof parsed.sourceFilter === 'string' ? parsed.sourceFilter : fallback.sourceFilter,
      viewPreset: CRM_VIEW_PRESETS.includes(parsed.viewPreset as CrmViewPreset) ? parsed.viewPreset as CrmViewPreset : fallback.viewPreset,
      density: parsed.density === 'cozy' ? 'cozy' : fallback.density,
      sortKey: typeof parsed.sortKey === 'string' ? parsed.sortKey : fallback.sortKey,
      sortDirection: parsed.sortDirection === 'asc' ? 'asc' : fallback.sortDirection,
      detailLeadId: typeof parsed.detailLeadId === 'string' ? parsed.detailLeadId : fallback.detailLeadId,
    };
  } catch {
    return fallback;
  }
}

function persistSnapshot(snapshot: CrmSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore storage failures
  }
}

function commitSnapshot(
  set: (partial: CrmSnapshot | ((state: CrmState) => CrmSnapshot)) => void,
  snapshotOrUpdater: CrmSnapshot | ((state: CrmState) => CrmSnapshot)
) {
  set((state) => {
    const nextSnapshot = typeof snapshotOrUpdater === 'function' ? snapshotOrUpdater(state) : snapshotOrUpdater;
    persistSnapshot(nextSnapshot);
    return nextSnapshot;
  });
}

function ensureColumn(columns: CrmColumn[], label: string): CrmColumn[] {
  const slug = slugify(label);
  const existing = columns.find((column) => column.key === `custom_${slug}` || normalizeHeader(column.label) === normalizeHeader(label));
  if (existing) {
    return columns;
  }

  return [
    ...columns,
    {
      key: `custom_${slug || makeId('field')}`,
      label,
      kind: 'custom',
      visible: true,
    },
  ];
}

export function getDefaultCrmImportMappings(headers: string[]): CrmImportMapping[] {
  return headers.map((header): CrmImportMapping => {
    const coreField = resolveCoreField(header);
    const target: CrmImportTarget = coreField ?? (`custom:${header}` as CrmImportTarget);
    return {
      header,
      target,
    };
  });
}

function applyMappedImport(
  state: CrmSnapshot,
  content: string,
  mappings: CrmImportMapping[]
): { snapshot: CrmSnapshot; importedCount: number } {
  const parsed = parseCrmCsv(content);
  if (parsed.headers.length === 0 || parsed.rows.length === 0) {
    return { snapshot: state, importedCount: 0 };
  }

  let nextColumns = [...state.columns];
  const mappingByHeader = new Map(mappings.map((mapping) => [normalizeHeader(mapping.header), mapping.target]));

  const headerMappings = parsed.headers.map((header, index) => {
    const selectedTarget = mappingByHeader.get(normalizeHeader(header)) ?? '__ignore__';
    if (selectedTarget === '__ignore__') {
      return { index, kind: 'ignore' as const, key: '__ignore__', label: header };
    }

    if (selectedTarget.startsWith('custom:')) {
      const customLabel = selectedTarget.slice('custom:'.length).trim() || header;
      nextColumns = ensureColumn(nextColumns, customLabel);
      const matchingColumn = nextColumns.find((column) => normalizeHeader(column.label) === normalizeHeader(customLabel));
      return {
        index,
        kind: 'custom' as const,
        key: matchingColumn?.key ?? `custom_${slugify(customLabel)}`,
        label: customLabel,
      };
    }

    return { index, kind: 'core' as const, key: selectedTarget, label: header };
  });

  let importedCount = 0;
  const nextLeads = parsed.rows
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => {
      const timestamp = nowIso();
      const lead: CrmLead = {
        id: makeId('lead'),
        name: '',
        company: '',
        email: '',
        phone: '',
        address: '',
        website: '',
        owner: '',
        source: 'Website',
        stage: 'new',
        status: 'active',
        score: 0,
        nextAction: '',
        lastContactAt: '',
        tags: [],
        customFields: {},
        notes: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      headerMappings.forEach(({ index, kind, key }) => {
        if (kind === 'ignore') return;

        const cell = row[index]?.trim() ?? '';
        if (!cell) return;

        if (kind === 'custom') {
          lead.customFields[key] = cell;
          return;
        }

        if (key === 'score') {
          lead.score = Number(cell) || 0;
          return;
        }

        if (key === 'stage') {
          lead.stage = sanitizeStage(cell);
          return;
        }

        if (key === 'status') {
          lead.status = sanitizeStatus(cell);
          return;
        }

        if (key === 'tags') {
          lead.tags = cell.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
          return;
        }

        (lead as unknown as Record<string, string>)[key] = cell;
      });

      if (!lead.name) {
        lead.name = lead.company || lead.email || lead.phone || `Lead ${state.leads.length + importedCount + 1}`;
      }

      importedCount += 1;
      return lead;
    });

  if (nextLeads.length === 0) {
    return { snapshot: state, importedCount: 0 };
  }

  return {
    snapshot: {
      ...state,
      columns: nextColumns,
      leads: [...nextLeads, ...state.leads],
      detailLeadId: nextLeads[0]?.id ?? state.detailLeadId,
    },
    importedCount: nextLeads.length,
  };
}

const initialSnapshot = loadSnapshot();

export const useCrmStore = create<CrmState>((set) => ({
  ...initialSnapshot,

  setSearchQuery: (value) => {
    commitSnapshot(set, (state) => ({ ...state, searchQuery: value }));
  },

  setStageFilter: (value) => {
    commitSnapshot(set, (state) => ({ ...state, stageFilter: value }));
  },

  setStatusFilter: (value) => {
    commitSnapshot(set, (state) => ({ ...state, statusFilter: value }));
  },

  setSourceFilter: (value) => {
    commitSnapshot(set, (state) => ({ ...state, sourceFilter: value }));
  },

  setViewPreset: (value) => {
    commitSnapshot(set, (state) => ({ ...state, viewPreset: value }));
  },

  setDensity: (value) => {
    commitSnapshot(set, (state) => ({ ...state, density: value }));
  },

  setSort: (key) => {
    commitSnapshot(set, (state) => ({
      ...state,
      sortKey: key,
      sortDirection: state.sortKey === key && state.sortDirection === 'asc' ? 'desc' : 'asc',
    }));
  },

  toggleColumnVisibility: (key) => {
    commitSnapshot(set, (state) => ({
      ...state,
      columns: state.columns.map((column) =>
        column.key === key ? { ...column, visible: !column.visible } : column
      ),
    }));
  },

  addCustomColumn: (label) => {
    const cleanLabel = label.trim();
    if (!cleanLabel) return;

    commitSnapshot(set, (state) => ({
      ...state,
      columns: ensureColumn(state.columns, cleanLabel),
    }));
  },

  addLead: (input) => {
    const name = input.name.trim();
    if (!name) return;

    const timestamp = nowIso();
    const nextLead: CrmLead = {
      id: makeId('lead'),
      name,
      company: input.company?.trim() ?? '',
      email: input.email?.trim() ?? '',
      phone: input.phone?.trim() ?? '',
      address: input.address?.trim() ?? '',
      website: input.website?.trim() ?? '',
      owner: input.owner?.trim() ?? '',
      source: input.source?.trim() || 'Website',
      stage: input.stage ?? 'new',
      status: input.status ?? 'active',
      score: Number.isFinite(input.score) ? Number(input.score) : 0,
      nextAction: input.nextAction?.trim() ?? '',
      lastContactAt: input.lastContactAt?.trim() ?? '',
      tags: input.tags ?? [],
      customFields: input.customFields ?? {},
      notes: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    commitSnapshot(set, (state) => ({
      ...state,
      leads: [nextLead, ...state.leads],
      detailLeadId: nextLead.id,
    }));
  },

  updateLead: (leadId, updates) => {
    commitSnapshot(set, (state) => ({
      ...state,
      leads: state.leads.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              ...updates,
              updatedAt: nowIso(),
            }
          : lead
      ),
    }));
  },

  updateLeadCustomField: (leadId, fieldKey, value) => {
    commitSnapshot(set, (state) => ({
      ...state,
      leads: state.leads.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              customFields: { ...lead.customFields, [fieldKey]: value },
              updatedAt: nowIso(),
            }
          : lead
      ),
    }));
  },

  addLeadNote: (leadId, body) => {
    const cleanBody = body.trim();
    if (!cleanBody) return;

    commitSnapshot(set, (state) => ({
      ...state,
      leads: state.leads.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              notes: [{ id: makeId('note'), body: cleanBody, createdAt: nowIso() }, ...lead.notes],
              updatedAt: nowIso(),
            }
          : lead
      ),
    }));
  },

  openLead: (leadId) => {
    commitSnapshot(set, (state) => ({ ...state, detailLeadId: leadId }));
  },

  closeLead: () => {
    commitSnapshot(set, (state) => ({ ...state, detailLeadId: null }));
  },

  importCsv: (content) => {
    const defaultMappings = getDefaultCrmImportMappings(parseCrmCsv(content).headers);
    let importedCount = 0;

    commitSnapshot(set, (state) => {
      const result = applyMappedImport(state, content, defaultMappings);
      importedCount = result.importedCount;
      return result.snapshot;
    });

    return importedCount;

  },

  importMappedCsv: (content, mappings) => {
    let importedCount = 0;

    commitSnapshot(set, (state) => {
      const result = applyMappedImport(state, content, mappings);
      importedCount = result.importedCount;
      return result.snapshot;
    });

    return importedCount;
  },
}));

export function getCrmSourceOptions(leads: CrmLead[]): string[] {
  const values = new Set([...DEFAULT_SOURCE_OPTIONS, ...leads.map((lead) => lead.source).filter(Boolean)]);
  return Array.from(values);
}