import { create } from 'zustand';
import type { Edge, Node } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';

const STORAGE_KEY = 'deep_canvas_project_flow_v2';

export type ProjectFlowBoardMode = 'codebase' | 'project' | 'storyboard' | 'artboard';
export type ProjectFlowNodeKind =
  | 'project'
  | 'code'
  | 'note'
  | 'story'
  | 'art'
  | 'document'
  | 'url'
  | 'image'
  | 'video'
  | 'drawing';
export type ProjectFlowTemplateId = 'blank' | 'codebase' | 'delivery' | 'storyboard' | 'artboard';

export interface ProjectFlowChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface ProjectFlowDrawingStroke {
  id: string;
  color: string;
  width: number;
  path: string;
}

export interface ProjectFlowNodeData extends Record<string, unknown> {
  kind: ProjectFlowNodeKind;
  title: string;
  subtitle: string;
  body: string;
  tags: string[];
  accent: string;
  icon: string;
  checklist: ProjectFlowChecklistItem[];
  url: string;
  fileName: string;
  fileType: string;
  fileSizeLabel: string;
  mediaSrc: string;
  previewMode: 'cover' | 'contain';
  drawingStrokes: ProjectFlowDrawingStroke[];
  drawingBackground: string;
}

export type ProjectFlowNode = Node<ProjectFlowNodeData, 'projectFlowNode'>;

export interface ProjectFlowSnapshot {
  boardTitle: string;
  boardMode: ProjectFlowBoardMode;
  nodes: ProjectFlowNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  snapToGrid: boolean;
  showMiniMap: boolean;
  showGrid: boolean;
}

interface AddNodeInput {
  kind: ProjectFlowNodeKind;
  position: { x: number; y: number };
  overrides?: Partial<ProjectFlowNodeData>;
}

interface ProjectFlowState extends ProjectFlowSnapshot {
  setBoardTitle: (title: string) => void;
  setBoardMode: (mode: ProjectFlowBoardMode) => void;
  setNodes: (nodes: ProjectFlowNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNode: (nodeId: string | null) => void;
  updateNodeData: (nodeId: string, updates: Partial<ProjectFlowNodeData>) => void;
  addChecklistItem: (nodeId: string, label: string) => void;
  updateChecklistItem: (nodeId: string, itemId: string, updates: Partial<ProjectFlowChecklistItem>) => void;
  removeChecklistItem: (nodeId: string, itemId: string) => void;
  addNode: (input: AddNodeInput) => void;
  duplicateNode: (nodeId: string) => void;
  deleteNodes: (nodeIds: string[]) => void;
  deleteEdges: (edgeIds: string[]) => void;
  setSnapToGrid: (enabled: boolean) => void;
  setShowMiniMap: (enabled: boolean) => void;
  setShowGrid: (enabled: boolean) => void;
  loadTemplate: (templateId: ProjectFlowTemplateId) => void;
  clearBoard: () => void;
  importBoard: (snapshot: Partial<ProjectFlowSnapshot>) => void;
}

interface ProjectFlowNodeLibraryItem {
  kind: ProjectFlowNodeKind;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  accent: string;
  title: string;
  subtitle: string;
  body: string;
  tags: string[];
  checklist: string[];
  url?: string;
  fileName?: string;
  fileType?: string;
  fileSizeLabel?: string;
  mediaSrc?: string;
  previewMode?: 'cover' | 'contain';
  drawingBackground?: string;
}

interface ProjectFlowTemplateDefinition {
  id: ProjectFlowTemplateId;
  title: string;
  shortLabel: string;
  description: string;
  mode: ProjectFlowBoardMode;
}

const NODE_KIND_VALUES: ProjectFlowNodeKind[] = [
  'project',
  'code',
  'note',
  'story',
  'art',
  'document',
  'url',
  'image',
  'video',
  'drawing',
];

export const PROJECT_FLOW_BOARD_MODE_OPTIONS: Array<{ value: ProjectFlowBoardMode; label: string }> = [
  { value: 'project', label: 'Project' },
  { value: 'codebase', label: 'Codebase' },
  { value: 'storyboard', label: 'Storyboard' },
  { value: 'artboard', label: 'Moodboard' },
];

export const PROJECT_FLOW_NODE_LIBRARY: ProjectFlowNodeLibraryItem[] = [
  {
    kind: 'project',
    label: 'Project card',
    shortLabel: 'Task',
    description: 'Milestone with owner, status, and checklist.',
    icon: 'TK',
    accent: '#2dd4bf',
    title: 'Milestone',
    subtitle: 'Owner • next move',
    body: 'What needs to ship next.',
    tags: ['ship'],
    checklist: ['Scope', 'Build', 'Review'],
  },
  {
    kind: 'code',
    label: 'System block',
    shortLabel: 'Code',
    description: 'Service, module, API, or storage layer.',
    icon: '</>',
    accent: '#60a5fa',
    title: 'Service',
    subtitle: 'Boundary',
    body: 'Inputs -> logic -> outputs',
    tags: ['api'],
    checklist: ['Inputs', 'Outputs'],
  },
  {
    kind: 'note',
    label: 'Sticky note',
    shortLabel: 'Note',
    description: 'Loose thought, question, or decision.',
    icon: 'NT',
    accent: '#f59e0b',
    title: 'Working note',
    subtitle: 'Scratchpad',
    body: 'Capture the important bit.',
    tags: ['note'],
    checklist: [],
  },
  {
    kind: 'story',
    label: 'Storyboard frame',
    shortLabel: 'Scene',
    description: 'Shot, beat, script, or transition.',
    icon: 'SB',
    accent: '#f472b6',
    title: 'Scene',
    subtitle: 'Beat',
    body: 'What happens in this frame.',
    tags: ['scene'],
    checklist: ['Visual', 'Copy'],
  },
  {
    kind: 'art',
    label: 'Artboard tile',
    shortLabel: 'Mood',
    description: 'Palette, texture, type, or composition.',
    icon: 'AR',
    accent: '#a78bfa',
    title: 'Art direction',
    subtitle: 'Mood',
    body: 'Palette, type, reference, texture.',
    tags: ['mood'],
    checklist: ['Palette'],
  },
  {
    kind: 'document',
    label: 'Document upload',
    shortLabel: 'Doc',
    description: 'Brief, PDF, deck, doc, or contract.',
    icon: 'DOC',
    accent: '#38bdf8',
    title: 'Brief',
    subtitle: 'Upload a file',
    body: 'Attach a source document.',
    tags: ['doc'],
    checklist: [],
    fileName: 'No file',
    fileType: 'application/octet-stream',
    fileSizeLabel: '0 KB',
  },
  {
    kind: 'url',
    label: 'URL node',
    shortLabel: 'Link',
    description: 'Reference page, repo, ticket, or article.',
    icon: 'URL',
    accent: '#14b8a6',
    title: 'Reference link',
    subtitle: 'Paste a URL',
    body: 'External source or working link.',
    tags: ['link'],
    checklist: [],
    url: 'https://',
  },
  {
    kind: 'image',
    label: 'Image node',
    shortLabel: 'Image',
    description: 'Screenshot, mock, concept, or ref.',
    icon: 'IMG',
    accent: '#fb7185',
    title: 'Image reference',
    subtitle: 'Upload image',
    body: 'Still frame or design ref.',
    tags: ['image'],
    checklist: [],
    previewMode: 'cover',
  },
  {
    kind: 'video',
    label: 'Video node',
    shortLabel: 'Video',
    description: 'Clip, take, export, or motion ref.',
    icon: 'VID',
    accent: '#f97316',
    title: 'Video clip',
    subtitle: 'Upload video',
    body: 'Motion reference or edit asset.',
    tags: ['video'],
    checklist: [],
    previewMode: 'cover',
  },
  {
    kind: 'drawing',
    label: 'Drawing page',
    shortLabel: 'Draw',
    description: 'Open a sketch surface and draw freehand.',
    icon: 'DRW',
    accent: '#22c55e',
    title: 'Sketch pad',
    subtitle: 'Double-click node to draw',
    body: 'Annotate layout, flow, or composition.',
    tags: ['sketch'],
    checklist: [],
    drawingBackground: '#081018',
  },
];

export const PROJECT_FLOW_TEMPLATES: ProjectFlowTemplateDefinition[] = [
  { id: 'blank', title: 'Blank canvas', shortLabel: 'Blank', description: 'Clean board.', mode: 'project' },
  { id: 'codebase', title: 'Codebase map', shortLabel: 'Code', description: 'Architecture layout.', mode: 'codebase' },
  { id: 'delivery', title: 'Delivery rail', shortLabel: 'Ship', description: 'Plan a launch.', mode: 'project' },
  { id: 'storyboard', title: 'Storyboard', shortLabel: 'Story', description: 'Sequence scenes.', mode: 'storyboard' },
  { id: 'artboard', title: 'Mood board', shortLabel: 'Mood', description: 'Visual direction.', mode: 'artboard' },
];

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isNodeKind(value: unknown): value is ProjectFlowNodeKind {
  return typeof value === 'string' && NODE_KIND_VALUES.includes(value as ProjectFlowNodeKind);
}

function getNodeLibraryItem(kind: ProjectFlowNodeKind): ProjectFlowNodeLibraryItem {
  return PROJECT_FLOW_NODE_LIBRARY.find((item) => item.kind === kind) ?? PROJECT_FLOW_NODE_LIBRARY[0];
}

function createNodeData(kind: ProjectFlowNodeKind, overrides?: Partial<ProjectFlowNodeData>): ProjectFlowNodeData {
  const preset = getNodeLibraryItem(kind);
  return {
    kind,
    title: overrides?.title ?? preset.title,
    subtitle: overrides?.subtitle ?? preset.subtitle,
    body: overrides?.body ?? preset.body,
    tags: overrides?.tags ?? preset.tags,
    accent: overrides?.accent ?? preset.accent,
    icon: overrides?.icon ?? preset.icon,
    checklist:
      overrides?.checklist ??
      preset.checklist.map((label) => ({ id: makeId('check'), label, done: false })),
    url: overrides?.url ?? preset.url ?? '',
    fileName: overrides?.fileName ?? preset.fileName ?? '',
    fileType: overrides?.fileType ?? preset.fileType ?? '',
    fileSizeLabel: overrides?.fileSizeLabel ?? preset.fileSizeLabel ?? '',
    mediaSrc: overrides?.mediaSrc ?? preset.mediaSrc ?? '',
    previewMode: overrides?.previewMode ?? preset.previewMode ?? 'cover',
    drawingStrokes: overrides?.drawingStrokes ?? [],
    drawingBackground: overrides?.drawingBackground ?? preset.drawingBackground ?? '#081018',
  };
}

function createNode(kind: ProjectFlowNodeKind, position: { x: number; y: number }, overrides?: Partial<ProjectFlowNodeData>): ProjectFlowNode {
  return {
    id: makeId('node'),
    type: 'projectFlowNode',
    position,
    data: createNodeData(kind, overrides),
  };
}

function createEdge(source: string, target: string, label?: string): Edge {
  return {
    id: makeId('edge'),
    source,
    target,
    type: 'smoothstep',
    animated: false,
    label,
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  };
}

function createBlankSnapshot(): ProjectFlowSnapshot {
  return {
    boardTitle: 'Untitled flow',
    boardMode: 'project',
    nodes: [
      createNode('drawing', { x: 220, y: 150 }, {
        title: 'Sketch here',
        subtitle: 'Double-click node to draw',
        body: 'Add links, media, docs, or tasks from the toolbar.',
        tags: ['start'],
      }),
    ],
    edges: [],
    selectedNodeId: null,
    snapToGrid: true,
    showMiniMap: true,
    showGrid: true,
  };
}

function buildTemplateSnapshot(templateId: ProjectFlowTemplateId): ProjectFlowSnapshot {
  if (templateId === 'blank') {
    return createBlankSnapshot();
  }

  if (templateId === 'codebase') {
    const frontend = createNode('code', { x: 90, y: 140 }, { title: 'Web app', subtitle: 'UI shell', tags: ['frontend'] });
    const gateway = createNode('code', { x: 360, y: 140 }, { title: 'Gateway', subtitle: 'API edge', tags: ['api'] });
    const worker = createNode('code', { x: 630, y: 140 }, { title: 'Workers', subtitle: 'Jobs', tags: ['async'] });
    const storage = createNode('document', { x: 900, y: 140 }, { title: 'Schema pack', subtitle: 'Contracts', fileName: 'schema.md', fileType: 'text/markdown', fileSizeLabel: '12 KB' });
    const repo = createNode('url', { x: 360, y: 360 }, { title: 'Repository', subtitle: 'Source', url: 'https://github.com/', body: 'Primary source of truth.' });
    const sketch = createNode('drawing', { x: 90, y: 360 }, { title: 'Flow sketch', subtitle: 'Hot path', body: 'Annotate request flow.' });

    return {
      boardTitle: 'Codebase map',
      boardMode: 'codebase',
      nodes: [frontend, gateway, worker, storage, repo, sketch],
      edges: [
        createEdge(frontend.id, gateway.id, 'requests'),
        createEdge(gateway.id, worker.id, 'dispatch'),
        createEdge(worker.id, storage.id, 'writes'),
        createEdge(repo.id, gateway.id, 'context'),
      ],
      selectedNodeId: null,
      snapToGrid: true,
      showMiniMap: true,
      showGrid: true,
    };
  }

  if (templateId === 'delivery') {
    const plan = createNode('project', { x: 120, y: 140 }, { title: 'Strategy', subtitle: 'Lock scope', tags: ['plan'] });
    const brief = createNode('document', { x: 410, y: 120 }, { title: 'Client brief', subtitle: 'Requirements', fileName: 'brief.pdf', fileType: 'application/pdf', fileSizeLabel: '1.2 MB' });
    const ref = createNode('url', { x: 410, y: 330 }, { title: 'Live tracker', subtitle: 'Ops board', url: 'https://notion.so/', tags: ['tracker'] });
    const launch = createNode('project', { x: 720, y: 140 }, { title: 'Launch', subtitle: 'Cutover', tags: ['release'] });
    const proof = createNode('image', { x: 720, y: 350 }, { title: 'Approval still', subtitle: 'Hero frame' });

    return {
      boardTitle: 'Delivery rail',
      boardMode: 'project',
      nodes: [plan, brief, ref, launch, proof],
      edges: [
        createEdge(plan.id, brief.id, 'briefs'),
        createEdge(brief.id, launch.id, 'guides'),
        createEdge(ref.id, launch.id, 'status'),
        createEdge(proof.id, launch.id, 'asset'),
      ],
      selectedNodeId: null,
      snapToGrid: true,
      showMiniMap: true,
      showGrid: true,
    };
  }

  if (templateId === 'storyboard') {
    const hook = createNode('story', { x: 110, y: 140 }, { title: 'Hook', subtitle: '0-3s' });
    const clip = createNode('video', { x: 400, y: 140 }, { title: 'Reference clip', subtitle: 'Timing pass' });
    const frame = createNode('image', { x: 690, y: 140 }, { title: 'Shot frame', subtitle: 'Composition' });
    const notes = createNode('note', { x: 400, y: 360 }, { title: 'VO + captions', subtitle: 'Script' });

    return {
      boardTitle: 'Storyboard',
      boardMode: 'storyboard',
      nodes: [hook, clip, frame, notes],
      edges: [
        createEdge(hook.id, clip.id, 'motion'),
        createEdge(clip.id, frame.id, 'freeze'),
        createEdge(notes.id, clip.id, 'supports'),
      ],
      selectedNodeId: null,
      snapToGrid: true,
      showMiniMap: true,
      showGrid: true,
    };
  }

  const mood = createNode('art', { x: 120, y: 130 }, { title: 'Mood', subtitle: 'Atmosphere' });
  const board = createNode('image', { x: 400, y: 130 }, { title: 'Ref image', subtitle: 'Visual sample' });
  const link = createNode('url', { x: 680, y: 130 }, { title: 'Inspiration', subtitle: 'Reference URL', url: 'https://behance.net/' });
  const sketch = createNode('drawing', { x: 400, y: 360 }, { title: 'Layout sketch', subtitle: 'Annotate direction' });

  return {
    boardTitle: 'Mood board',
    boardMode: 'artboard',
    nodes: [mood, board, link, sketch],
    edges: [
      createEdge(mood.id, board.id, 'drives'),
      createEdge(board.id, link.id, 'references'),
      createEdge(sketch.id, board.id, 'annotates'),
    ],
    selectedNodeId: null,
    snapToGrid: true,
    showMiniMap: true,
    showGrid: true,
  };
}

function isBoardMode(value: unknown): value is ProjectFlowBoardMode {
  return value === 'codebase' || value === 'project' || value === 'storyboard' || value === 'artboard';
}

function normalizeDrawingStrokes(value: unknown): ProjectFlowDrawingStroke[] | undefined {
  if (!Array.isArray(value)) return undefined;

  return value
    .filter((item): item is ProjectFlowDrawingStroke => Boolean(item) && typeof item === 'object' && typeof (item as ProjectFlowDrawingStroke).path === 'string')
    .map((item) => ({
      id: item.id || makeId('stroke'),
      color: typeof item.color === 'string' ? item.color : '#f8fafc',
      width: typeof item.width === 'number' ? item.width : 3,
      path: item.path,
    }));
}

function normalizeNode(node: unknown): ProjectFlowNode | null {
  if (!node || typeof node !== 'object') return null;

  const candidate = node as Partial<ProjectFlowNode>;
  if (!candidate.id || !candidate.position || typeof candidate.position.x !== 'number' || typeof candidate.position.y !== 'number') {
    return null;
  }

  const rawData = candidate.data as Partial<ProjectFlowNodeData> | undefined;
  const kind = isNodeKind(rawData?.kind) ? rawData.kind : 'note';

  return {
    id: candidate.id,
    type: 'projectFlowNode',
    position: candidate.position,
    data: createNodeData(kind, {
      ...rawData,
      tags: Array.isArray(rawData?.tags) ? rawData.tags.filter((tag): tag is string => typeof tag === 'string') : undefined,
      checklist: Array.isArray(rawData?.checklist)
        ? rawData.checklist
            .filter((item): item is ProjectFlowChecklistItem => Boolean(item) && typeof item.label === 'string')
            .map((item) => ({
              id: item.id || makeId('check'),
              label: item.label,
              done: Boolean(item.done),
            }))
        : undefined,
      url: typeof rawData?.url === 'string' ? rawData.url : undefined,
      fileName: typeof rawData?.fileName === 'string' ? rawData.fileName : undefined,
      fileType: typeof rawData?.fileType === 'string' ? rawData.fileType : undefined,
      fileSizeLabel: typeof rawData?.fileSizeLabel === 'string' ? rawData.fileSizeLabel : undefined,
      mediaSrc: typeof rawData?.mediaSrc === 'string' ? rawData.mediaSrc : undefined,
      previewMode: rawData?.previewMode === 'contain' ? 'contain' : undefined,
      drawingBackground: typeof rawData?.drawingBackground === 'string' ? rawData.drawingBackground : undefined,
      drawingStrokes: normalizeDrawingStrokes(rawData?.drawingStrokes),
    }),
  };
}

function normalizeEdge(edge: unknown): Edge | null {
  if (!edge || typeof edge !== 'object') return null;
  const candidate = edge as Partial<Edge>;
  if (!candidate.id || !candidate.source || !candidate.target) return null;

  return {
    ...candidate,
    id: candidate.id,
    source: candidate.source,
    target: candidate.target,
    type: candidate.type ?? 'smoothstep',
    markerEnd: candidate.markerEnd ?? { type: MarkerType.ArrowClosed },
  } as Edge;
}

function normalizeSnapshot(snapshot: Partial<ProjectFlowSnapshot>): ProjectFlowSnapshot {
  const fallback = createBlankSnapshot();

  return {
    boardTitle: typeof snapshot.boardTitle === 'string' && snapshot.boardTitle.trim() ? snapshot.boardTitle : fallback.boardTitle,
    boardMode: isBoardMode(snapshot.boardMode) ? snapshot.boardMode : fallback.boardMode,
    nodes: Array.isArray(snapshot.nodes)
      ? snapshot.nodes.map(normalizeNode).filter((node): node is ProjectFlowNode => Boolean(node))
      : fallback.nodes,
    edges: Array.isArray(snapshot.edges)
      ? snapshot.edges.map(normalizeEdge).filter((edge): edge is Edge => Boolean(edge))
      : fallback.edges,
    selectedNodeId: typeof snapshot.selectedNodeId === 'string' ? snapshot.selectedNodeId : null,
    snapToGrid: typeof snapshot.snapToGrid === 'boolean' ? snapshot.snapToGrid : fallback.snapToGrid,
    showMiniMap: typeof snapshot.showMiniMap === 'boolean' ? snapshot.showMiniMap : fallback.showMiniMap,
    showGrid: typeof snapshot.showGrid === 'boolean' ? snapshot.showGrid : fallback.showGrid,
  };
}

function loadSnapshot(): ProjectFlowSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createBlankSnapshot();
    return normalizeSnapshot(JSON.parse(raw) as Partial<ProjectFlowSnapshot>);
  } catch {
    return createBlankSnapshot();
  }
}

function persistSnapshot(snapshot: ProjectFlowSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore storage failures
  }
}

function commitSnapshot(
  set: (partial: ProjectFlowSnapshot | ((state: ProjectFlowState) => ProjectFlowSnapshot)) => void,
  snapshotOrUpdater: ProjectFlowSnapshot | ((state: ProjectFlowState) => ProjectFlowSnapshot)
) {
  set((state) => {
    const nextSnapshot = typeof snapshotOrUpdater === 'function' ? snapshotOrUpdater(state) : snapshotOrUpdater;
    persistSnapshot(nextSnapshot);
    return nextSnapshot;
  });
}

const initialSnapshot = loadSnapshot();

export const useProjectFlowStore = create<ProjectFlowState>((set) => ({
  ...initialSnapshot,

  setBoardTitle: (boardTitle) => {
    commitSnapshot(set, (state) => ({
      ...state,
      boardTitle,
    }));
  },

  setBoardMode: (boardMode) => {
    commitSnapshot(set, (state) => ({
      ...state,
      boardMode,
    }));
  },

  setNodes: (nodes) => {
    commitSnapshot(set, (state) => ({
      ...state,
      nodes,
    }));
  },

  setEdges: (edges) => {
    commitSnapshot(set, (state) => ({
      ...state,
      edges,
    }));
  },

  setSelectedNode: (selectedNodeId) => {
    commitSnapshot(set, (state) => ({
      ...state,
      selectedNodeId,
    }));
  },

  updateNodeData: (nodeId, updates) => {
    commitSnapshot(set, (state) => ({
      ...state,
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...updates,
              },
            }
          : node
      ),
    }));
  },

  addChecklistItem: (nodeId, label) => {
    const cleanLabel = label.trim();
    if (!cleanLabel) return;

    commitSnapshot(set, (state) => ({
      ...state,
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                checklist: [...node.data.checklist, { id: makeId('check'), label: cleanLabel, done: false }],
              },
            }
          : node
      ),
    }));
  },

  updateChecklistItem: (nodeId, itemId, updates) => {
    commitSnapshot(set, (state) => ({
      ...state,
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                checklist: node.data.checklist.map((item) =>
                  item.id === itemId
                    ? {
                        ...item,
                        ...updates,
                      }
                    : item
                ),
              },
            }
          : node
      ),
    }));
  },

  removeChecklistItem: (nodeId, itemId) => {
    commitSnapshot(set, (state) => ({
      ...state,
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                checklist: node.data.checklist.filter((item) => item.id !== itemId),
              },
            }
          : node
      ),
    }));
  },

  addNode: ({ kind, position, overrides }) => {
    commitSnapshot(set, (state) => ({
      ...state,
      nodes: [...state.nodes, createNode(kind, position, overrides)],
      selectedNodeId: null,
    }));
  },

  duplicateNode: (nodeId) => {
    commitSnapshot(set, (state) => {
      const node = state.nodes.find((item) => item.id === nodeId);
      if (!node) return state;

      const duplicate = createNode(node.data.kind, { x: node.position.x + 40, y: node.position.y + 40 }, {
        ...node.data,
        checklist: node.data.checklist.map((item) => ({ ...item, id: makeId('check') })),
        drawingStrokes: node.data.drawingStrokes.map((stroke) => ({ ...stroke, id: makeId('stroke') })),
      });

      return {
        ...state,
        nodes: [...state.nodes, duplicate],
        selectedNodeId: duplicate.id,
      };
    });
  },

  deleteNodes: (nodeIds) => {
    if (nodeIds.length === 0) return;

    commitSnapshot(set, (state) => ({
      ...state,
      nodes: state.nodes.filter((node) => !nodeIds.includes(node.id)),
      edges: state.edges.filter((edge) => !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)),
      selectedNodeId: nodeIds.includes(state.selectedNodeId ?? '') ? null : state.selectedNodeId,
    }));
  },

  deleteEdges: (edgeIds) => {
    if (edgeIds.length === 0) return;

    commitSnapshot(set, (state) => ({
      ...state,
      edges: state.edges.filter((edge) => !edgeIds.includes(edge.id)),
    }));
  },

  setSnapToGrid: (snapToGrid) => {
    commitSnapshot(set, (state) => ({
      ...state,
      snapToGrid,
    }));
  },

  setShowMiniMap: (showMiniMap) => {
    commitSnapshot(set, (state) => ({
      ...state,
      showMiniMap,
    }));
  },

  setShowGrid: (showGrid) => {
    commitSnapshot(set, (state) => ({
      ...state,
      showGrid,
    }));
  },

  loadTemplate: (templateId) => {
    commitSnapshot(set, buildTemplateSnapshot(templateId));
  },

  clearBoard: () => {
    commitSnapshot(set, createBlankSnapshot());
  },

  importBoard: (snapshot) => {
    commitSnapshot(set, normalizeSnapshot(snapshot));
  },
}));