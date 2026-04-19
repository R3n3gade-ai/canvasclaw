import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type NodeMouseHandler,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  PROJECT_FLOW_NODE_LIBRARY,
  PROJECT_FLOW_TEMPLATES,
  formatFileSize,
  useProjectFlowStore,
  type ProjectFlowBoardMode,
  type ProjectFlowDrawingStroke,
  type ProjectFlowNode,
  type ProjectFlowNodeKind,
  type ProjectFlowSnapshot,
} from '../../../stores/projectFlowStore';
import { ProjectFlowCanvasNode } from './ProjectFlowNodes';
import './ProjectFlowWorkspace.css';

const DRAG_MIME = 'application/deep-canvas-project-flow-node';
const DRAWING_VIEWBOX = { width: 1000, height: 620 };
const HEADER_NODE_KINDS: ProjectFlowNodeKind[] = ['project', 'note', 'document', 'url', 'image', 'video', 'drawing'];
const HEADER_NODE_MENU_KINDS: ProjectFlowNodeKind[] = ['code', 'story', 'art'];
const NODE_TYPES = { projectFlowNode: ProjectFlowCanvasNode };

const VISIBLE_TEMPLATE_IDS = new Set(['blank', 'delivery']);

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.kt', '.rb', '.php', '.cs', '.swift', '.sql']);
const TEXT_EXTENSIONS = new Set(['.md', '.txt', '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.env', '.csv', '.xml', '.html', '.css', '.scss', '.less']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.m4v', '.avi']);

type UploadKind = 'document' | 'image' | 'video';
type RelativeFile = File & { webkitRelativePath?: string };

type IngestResult = {
  snapshot: ProjectFlowSnapshot;
  message: string;
};

type FileMeta = {
  file: RelativeFile;
  relativePath: string;
  lowerPath: string;
  extension: string;
  kind: ProjectFlowNodeKind;
  textLike: boolean;
};

type ProjectFlowWorkspaceProps = {
  onExit: () => void;
};

function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getUploadAccept(kind: UploadKind | null): string {
  if (kind === 'image') return 'image/*';
  if (kind === 'video') return 'video/*';
  if (kind === 'document') return '.pdf,.doc,.docx,.txt,.md,.csv,.ppt,.pptx,.xls,.xlsx';
  return '*/*';
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

function fileToText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => resolve('');
    reader.readAsText(file);
  });
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getPreset(kind: ProjectFlowNodeKind) {
  return PROJECT_FLOW_NODE_LIBRARY.find((item) => item.kind === kind) ?? PROJECT_FLOW_NODE_LIBRARY[0];
}

function createFlowNode(kind: ProjectFlowNodeKind, position: { x: number; y: number }, overrides: Partial<ProjectFlowNode['data']> = {}): ProjectFlowNode {
  const preset = getPreset(kind);
  return {
    id: makeId('node'),
    type: 'projectFlowNode',
    position,
    data: {
      kind,
      title: overrides.title ?? preset.title,
      subtitle: overrides.subtitle ?? preset.subtitle,
      body: overrides.body ?? preset.body,
      tags: overrides.tags ?? preset.tags,
      accent: overrides.accent ?? preset.accent,
      icon: overrides.icon ?? preset.icon,
      checklist:
        overrides.checklist ?? preset.checklist.map((label) => ({ id: makeId('check'), label, done: false })),
      url: overrides.url ?? preset.url ?? '',
      fileName: overrides.fileName ?? preset.fileName ?? '',
      fileType: overrides.fileType ?? preset.fileType ?? '',
      fileSizeLabel: overrides.fileSizeLabel ?? preset.fileSizeLabel ?? '',
      mediaSrc: overrides.mediaSrc ?? preset.mediaSrc ?? '',
      previewMode: overrides.previewMode ?? preset.previewMode ?? 'cover',
      drawingStrokes: overrides.drawingStrokes ?? [],
      drawingBackground: overrides.drawingBackground ?? preset.drawingBackground ?? '#081018',
    },
  };
}

function createFlowEdge(source: string, target: string, label?: string): Edge {
  return {
    id: makeId('edge'),
    source,
    target,
    label,
    type: 'smoothstep',
    animated: false,
  };
}

function getRelativePath(file: RelativeFile): string {
  return (file.webkitRelativePath?.trim() || file.name).replace(/\\/g, '/');
}

function getExtension(path: string): string {
  const match = /\.([^.\/]+)$/.exec(path.toLowerCase());
  return match ? `.${match[1]}` : '';
}

function normalizePath(path: string): string {
  const parts: string[] = [];
  path.split('/').forEach((part) => {
    if (!part || part === '.') return;
    if (part === '..') {
      parts.pop();
      return;
    }
    parts.push(part);
  });
  return parts.join('/');
}

function getDirname(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf('/');
  return index === -1 ? '' : normalized.slice(0, index);
}

function getBasename(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf('/');
  return index === -1 ? normalized : normalized.slice(index + 1);
}

function getDepth(path: string): number {
  return normalizePath(path).split('/').filter(Boolean).length;
}

function getNodeKindFromPath(path: string): ProjectFlowNodeKind {
  const extension = getExtension(path);
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (VIDEO_EXTENSIONS.has(extension)) return 'video';
  if (CODE_EXTENSIONS.has(extension)) return 'code';
  if (TEXT_EXTENSIONS.has(extension) || extension === '.pdf' || extension === '.doc' || extension === '.docx') return 'document';
  return 'document';
}

function isTextLikePath(path: string): boolean {
  const extension = getExtension(path);
  return CODE_EXTENSIONS.has(extension) || TEXT_EXTENSIONS.has(extension);
}

function inferBoardModeFromName(name: string): ProjectFlowBoardMode {
  const lower = name.toLowerCase();
  if (/(story|scene|shot|script|caption)/.test(lower)) return 'storyboard';
  if (/(mood|palette|art|brand|style)/.test(lower)) return 'artboard';
  if (/(repo|code|schema|api|service|arch|blueprint|system|src)/.test(lower)) return 'codebase';
  return 'project';
}

function trimExcerpt(input: string, maxLength = 160): string {
  const clean = input.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 3)}...` : clean;
}

function pickConceptNodeKind(text: string, mode: ProjectFlowBoardMode): ProjectFlowNodeKind {
  if (mode === 'storyboard') return 'story';
  if (mode === 'artboard') return 'art';
  if (mode === 'codebase') return /(api|service|db|database|schema|component|route|worker|gateway)/i.test(text) ? 'code' : 'note';
  return /(launch|scope|owner|milestone|timeline|brief|deliver)/i.test(text) ? 'project' : 'note';
}

function extractIdeaSections(content: string, mode: ProjectFlowBoardMode): Array<{ title: string; body: string; kind: ProjectFlowNodeKind }> {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const structured = lines
    .filter((line) => /^#{1,4}\s+/.test(line) || /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line))
    .slice(0, 8)
    .map((line) => {
      const clean = line.replace(/^#{1,4}\s+/, '').replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
      return {
        title: trimExcerpt(clean, 48),
        body: trimExcerpt(clean, 120),
        kind: pickConceptNodeKind(clean, mode),
      };
    });

  if (structured.length > 0) {
    return structured;
  }

  return content
    .split(/\n\s*\n/)
    .map((section) => section.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((section, index) => ({
      title: trimExcerpt(section.split(/\r?\n/)[0] || `Section ${index + 1}`, 48),
      body: trimExcerpt(section, 140),
      kind: pickConceptNodeKind(section, mode),
    }));
}

function extractRelativeImports(content: string): string[] {
  const patterns = [/from\s+['"]([^'"]+)['"]/g, /import\s+['"]([^'"]+)['"]/g, /require\(\s*['"]([^'"]+)['"]\s*\)/g];
  const results = new Set<string>();
  patterns.forEach((pattern) => {
    let match = pattern.exec(content);
    while (match) {
      const specifier = match[1];
      if (specifier.startsWith('.')) {
        results.add(specifier);
      }
      match = pattern.exec(content);
    }
  });
  return Array.from(results);
}

function resolveImportPath(fromPath: string, specifier: string, fileLookup: Map<string, string>): string | null {
  const base = getDirname(fromPath);
  const resolved = normalizePath(`${base}/${specifier}`);
  const candidates = [
    resolved,
    `${resolved}.ts`,
    `${resolved}.tsx`,
    `${resolved}.js`,
    `${resolved}.jsx`,
    `${resolved}.py`,
    `${resolved}.json`,
    `${resolved}/index.ts`,
    `${resolved}/index.tsx`,
    `${resolved}/index.js`,
    `${resolved}/index.jsx`,
    `${resolved}/__init__.py`,
  ];
  const match = candidates.find((candidate) => fileLookup.has(candidate.toLowerCase()));
  return match ?? null;
}

async function summarizeTextFile(file: File, kind: ProjectFlowNodeKind): Promise<string> {
  const content = await fileToText(file);
  if (!content) {
    return kind === 'code' ? 'Code file imported.' : 'Document imported.';
  }
  if (kind === 'code') {
    return trimExcerpt(`${extractRelativeImports(content).length} local links. ${content}`, 150) || 'Code file imported.';
  }
  return trimExcerpt(content, 150) || 'Document imported.';
}

async function buildDocumentIngest(
  files: RelativeFile[],
  currentSettings: Pick<ProjectFlowSnapshot, 'snapToGrid' | 'showMiniMap' | 'showGrid'>
): Promise<IngestResult> {
  const file = files[0];
  const relativePath = getRelativePath(file);
  const kind = getNodeKindFromPath(relativePath);
  const boardMode = inferBoardModeFromName(relativePath);

  const root = createFlowNode(kind === 'code' ? 'code' : kind, { x: 110, y: 190 }, {
    title: getBasename(relativePath),
    subtitle: 'Ingested source',
    body: isTextLikePath(relativePath) ? await summarizeTextFile(file, kind === 'code' ? 'code' : 'document') : 'Imported asset.',
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    fileSizeLabel: formatFileSize(file.size),
    mediaSrc: kind === 'image' || kind === 'video' ? await fileToDataUrl(file) : '',
    tags: ['ingest'],
  });

  const nodes: ProjectFlowNode[] = [root];
  const edges: Edge[] = [];

  if (isTextLikePath(relativePath)) {
    const content = await fileToText(file);
    let previousId = root.id;
    extractIdeaSections(content, boardMode).forEach((section, index) => {
      const node = createFlowNode(section.kind, { x: 420 + (index % 2) * 280, y: 110 + Math.floor(index / 2) * 180 }, {
        title: section.title || `Section ${index + 1}`,
        subtitle: 'Extracted idea',
        body: section.body,
        tags: ['ingest'],
      });
      nodes.push(node);
      edges.push(createFlowEdge(previousId, node.id, index === 0 ? 'expands' : 'next'));
      previousId = node.id;
    });
  }

  return {
    snapshot: {
      boardTitle: getBasename(relativePath),
      boardMode,
      nodes,
      edges,
      selectedNodeId: null,
      snapToGrid: currentSettings.snapToGrid,
      showMiniMap: currentSettings.showMiniMap,
      showGrid: currentSettings.showGrid,
    },
    message: `Ingested ${file.name} into a ${boardMode} map.`,
  };
}

async function buildRepoIngest(
  files: RelativeFile[],
  currentSettings: Pick<ProjectFlowSnapshot, 'snapToGrid' | 'showMiniMap' | 'showGrid'>
): Promise<IngestResult> {
  const limitedFiles = files.slice(0, 80);
  const metas: FileMeta[] = limitedFiles.map((file) => {
    const relativePath = getRelativePath(file);
    return {
      file,
      relativePath,
      lowerPath: relativePath.toLowerCase(),
      extension: getExtension(relativePath),
      kind: getNodeKindFromPath(relativePath),
      textLike: isTextLikePath(relativePath),
    };
  });

  const topSegments = metas.map((meta) => meta.relativePath.split('/')[0]).filter(Boolean);
  const boardTitle = topSegments[0] || 'Imported workspace';
  const nodes: ProjectFlowNode[] = [];
  const edges: Edge[] = [];
  const nodeLookup = new Map<string, string>();
  const laneCount = new Map<number, number>();

  const nextPosition = (depth: number) => {
    const current = laneCount.get(depth) ?? 0;
    laneCount.set(depth, current + 1);
    return { x: 80 + depth * 280, y: 100 + current * 118 };
  };

  const root = createFlowNode('project', { x: 60, y: 100 }, {
    title: boardTitle,
    subtitle: `${limitedFiles.length}${files.length > limitedFiles.length ? ` of ${files.length}` : ''} files`,
    body: 'Auto-ingested workspace map.',
    tags: ['ingest', 'codebase'],
  });
  nodes.push(root);
  nodeLookup.set('', root.id);

  const directorySet = new Set<string>();
  metas.forEach((meta) => {
    const parts = meta.relativePath.split('/');
    for (let index = 0; index < parts.length - 1; index += 1) {
      directorySet.add(parts.slice(0, index + 1).join('/'));
    }
  });

  Array.from(directorySet)
    .sort((left, right) => {
      const depthDifference = getDepth(left) - getDepth(right);
      return depthDifference !== 0 ? depthDifference : left.localeCompare(right);
    })
    .forEach((directory) => {
      const node = createFlowNode('project', nextPosition(getDepth(directory)), {
        title: getBasename(directory),
        subtitle: 'Folder',
        body: directory,
        tags: ['folder'],
      });
      nodes.push(node);
      nodeLookup.set(directory.toLowerCase(), node.id);
      edges.push(createFlowEdge(nodeLookup.get(getDirname(directory).toLowerCase()) ?? root.id, node.id, 'contains'));
    });

  for (const meta of metas) {
    const node = createFlowNode(meta.kind, nextPosition(getDepth(meta.relativePath) + 1), {
      title: getBasename(meta.relativePath),
      subtitle: meta.kind === 'code' ? meta.extension.replace('.', '').toUpperCase() || 'Code' : getDirname(meta.relativePath) || 'Root',
      body: meta.textLike ? await summarizeTextFile(meta.file, meta.kind === 'code' ? 'code' : 'document') : `Imported ${meta.kind} asset.`,
      fileName: meta.file.name,
      fileType: meta.file.type || 'application/octet-stream',
      fileSizeLabel: formatFileSize(meta.file.size),
      mediaSrc: meta.kind === 'image' || meta.kind === 'video' ? await fileToDataUrl(meta.file) : '',
      tags: [meta.kind, 'ingest'],
    });
    nodes.push(node);
    nodeLookup.set(meta.lowerPath, node.id);
    edges.push(createFlowEdge(nodeLookup.get(getDirname(meta.relativePath).toLowerCase()) ?? root.id, node.id, 'contains'));
  }

  const dependencyEdges: Edge[] = [];
  for (const meta of metas.filter((item) => item.kind === 'code').slice(0, 30)) {
    const content = await fileToText(meta.file);
    extractRelativeImports(content).forEach((specifier) => {
      const resolved = resolveImportPath(meta.relativePath, specifier, nodeLookup);
      const sourceId = nodeLookup.get(meta.lowerPath);
      const targetId = resolved ? nodeLookup.get(resolved.toLowerCase()) : undefined;
      if (!sourceId || !targetId || sourceId === targetId) return;
      dependencyEdges.push(createFlowEdge(sourceId, targetId, 'uses'));
    });
  }

  return {
    snapshot: {
      boardTitle,
      boardMode: 'codebase',
      nodes,
      edges: [...edges, ...dependencyEdges.slice(0, 32)],
      selectedNodeId: null,
      snapToGrid: currentSettings.snapToGrid,
      showMiniMap: currentSettings.showMiniMap,
      showGrid: currentSettings.showGrid,
    },
    message: `Ingested ${limitedFiles.length}${files.length > limitedFiles.length ? ` of ${files.length}` : ''} files into a codebase map.`,
  };
}

async function buildAssetBoard(
  files: RelativeFile[],
  currentSettings: Pick<ProjectFlowSnapshot, 'snapToGrid' | 'showMiniMap' | 'showGrid'>
): Promise<IngestResult> {
  const nodes: ProjectFlowNode[] = [];
  for (const [index, file] of files.entries()) {
    const relativePath = getRelativePath(file);
    const kind = getNodeKindFromPath(relativePath);
    nodes.push(
      createFlowNode(kind, { x: 120 + (index % 3) * 300, y: 120 + Math.floor(index / 3) * 220 }, {
        title: getBasename(relativePath),
        subtitle: 'Ingested asset',
        body: file.name,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSizeLabel: formatFileSize(file.size),
        mediaSrc: kind === 'image' || kind === 'video' ? await fileToDataUrl(file) : '',
        tags: ['asset', 'ingest'],
      })
    );
  }

  return {
    snapshot: {
      boardTitle: files.length === 1 ? files[0].name : 'Ingested assets',
      boardMode: 'project',
      nodes,
      edges: [],
      selectedNodeId: null,
      snapToGrid: currentSettings.snapToGrid,
      showMiniMap: currentSettings.showMiniMap,
      showGrid: currentSettings.showGrid,
    },
    message: `Ingested ${files.length} asset${files.length === 1 ? '' : 's'}.`,
  };
}

async function buildIngestResult(
  files: RelativeFile[],
  currentSettings: Pick<ProjectFlowSnapshot, 'snapToGrid' | 'showMiniMap' | 'showGrid'>
): Promise<IngestResult> {
  if (files.length === 0) {
    return {
      snapshot: {
        boardTitle: 'Untitled flow',
        boardMode: 'project',
        nodes: [],
        edges: [],
        selectedNodeId: null,
        snapToGrid: currentSettings.snapToGrid,
        showMiniMap: currentSettings.showMiniMap,
        showGrid: currentSettings.showGrid,
      },
      message: 'No files selected.',
    };
  }

  const hasTreePaths = files.some((file) => getRelativePath(file).includes('/'));
  const textLikeCount = files.filter((file) => isTextLikePath(getRelativePath(file))).length;

  if (files.length === 1 && !hasTreePaths) {
    return buildDocumentIngest(files, currentSettings);
  }

  if (hasTreePaths || textLikeCount >= 3) {
    return buildRepoIngest(files, currentSettings);
  }

  return buildAssetBoard(files, currentSettings);
}

function getPointFromEvent(event: React.PointerEvent<HTMLDivElement>, element: HTMLDivElement): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * DRAWING_VIEWBOX.width;
  const y = ((event.clientY - rect.top) / rect.height) * DRAWING_VIEWBOX.height;
  return {
    x: Math.max(0, Math.min(DRAWING_VIEWBOX.width, x)),
    y: Math.max(0, Math.min(DRAWING_VIEWBOX.height, y)),
  };
}

function createStroke(color: string, width: number, point: { x: number; y: number }): ProjectFlowDrawingStroke {
  return {
    id: makeId('stroke'),
    color,
    width,
    path: `M ${point.x} ${point.y}`,
  };
}

function ProjectFlowWorkspaceInner() {
  const boardTitle = useProjectFlowStore((state) => state.boardTitle);
  const nodes = useProjectFlowStore((state) => state.nodes);
  const edges = useProjectFlowStore((state) => state.edges);
  const selectedNodeId = useProjectFlowStore((state) => state.selectedNodeId);
  const snapToGrid = useProjectFlowStore((state) => state.snapToGrid);
  const showMiniMap = useProjectFlowStore((state) => state.showMiniMap);
  const showGrid = useProjectFlowStore((state) => state.showGrid);
  const setBoardTitle = useProjectFlowStore((state) => state.setBoardTitle);
  const setNodes = useProjectFlowStore((state) => state.setNodes);
  const setEdges = useProjectFlowStore((state) => state.setEdges);
  const setSelectedNode = useProjectFlowStore((state) => state.setSelectedNode);
  const updateNodeData = useProjectFlowStore((state) => state.updateNodeData);
  const addChecklistItem = useProjectFlowStore((state) => state.addChecklistItem);
  const updateChecklistItem = useProjectFlowStore((state) => state.updateChecklistItem);
  const removeChecklistItem = useProjectFlowStore((state) => state.removeChecklistItem);
  const addNode = useProjectFlowStore((state) => state.addNode);
  const duplicateNode = useProjectFlowStore((state) => state.duplicateNode);
  const deleteNodes = useProjectFlowStore((state) => state.deleteNodes);
  const deleteEdges = useProjectFlowStore((state) => state.deleteEdges);
  const setSnapToGrid = useProjectFlowStore((state) => state.setSnapToGrid);
  const setShowMiniMap = useProjectFlowStore((state) => state.setShowMiniMap);
  const setShowGrid = useProjectFlowStore((state) => state.setShowGrid);
  const loadTemplate = useProjectFlowStore((state) => state.loadTemplate);
  const clearBoard = useProjectFlowStore((state) => state.clearBoard);
  const importBoard = useProjectFlowStore((state) => state.importBoard);

  const { screenToFlowPosition } = useReactFlow();
  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);

  const [newChecklistLabel, setNewChecklistLabel] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [uploadKind, setUploadKind] = useState<UploadKind | null>(null);
  const [drawingNodeId, setDrawingNodeId] = useState<string | null>(null);
  const [drawingDraft, setDrawingDraft] = useState<ProjectFlowDrawingStroke[]>([]);
  const [drawingBackground, setDrawingBackground] = useState('#081018');
  const [brushColor, setBrushColor] = useState('#f8fafc');
  const [brushSize, setBrushSize] = useState(4);
  const [activeStroke, setActiveStroke] = useState<ProjectFlowDrawingStroke | null>(null);

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const ingestFilesInputRef = useRef<HTMLInputElement | null>(null);
  const ingestFolderInputRef = useRef<HTMLInputElement | null>(null);
  const drawingSurfaceRef = useRef<HTMLDivElement | null>(null);

  const drawingNode = useMemo(() => nodes.find((node) => node.id === drawingNodeId) ?? null, [drawingNodeId, nodes]);
  const visibleTemplates = useMemo(
    () => PROJECT_FLOW_TEMPLATES.filter((template) => VISIBLE_TEMPLATE_IDS.has(template.id)),
    []
  );
  const compactTemplates = useMemo(
    () => PROJECT_FLOW_TEMPLATES.filter((template) => !VISIBLE_TEMPLATE_IDS.has(template.id)),
    []
  );

  const exportSnapshot = useMemo<ProjectFlowSnapshot>(
    () => ({
      boardTitle,
      boardMode: inferBoardModeFromName(boardTitle),
      nodes,
      edges,
      selectedNodeId,
      snapToGrid,
      showMiniMap,
      showGrid,
    }),
    [boardTitle, edges, nodes, selectedNodeId, showGrid, showMiniMap, snapToGrid]
  );

  useEffect(() => {
    if (selectedNode) {
      setIsInspectorOpen(true);
    }
  }, [selectedNode]);

  useEffect(() => {
    if (!drawingNode) return;
    setDrawingDraft(drawingNode.data.drawingStrokes);
    setDrawingBackground(drawingNode.data.drawingBackground);
  }, [drawingNode]);

  useEffect(() => {
    const folderInput = ingestFolderInputRef.current;
    if (!folderInput) return;
    folderInput.setAttribute('webkitdirectory', '');
    folderInput.setAttribute('directory', '');
    folderInput.setAttribute('multiple', '');
  }, []);

  const handleNodesChange = useCallback(
    (changes: NodeChange<ProjectFlowNode>[]) => {
      setNodes(applyNodeChanges<ProjectFlowNode>(changes, nodes));
    },
    [nodes, setNodes]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      setEdges(applyEdgeChanges(changes, edges));
    },
    [edges, setEdges]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges(addEdge({ ...connection, type: 'smoothstep', animated: false }, edges));
    },
    [edges, setEdges]
  );

  const handleDragStart = useCallback((event: React.DragEvent<HTMLButtonElement>, kind: ProjectFlowNodeKind) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(DRAG_MIME, kind);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData(DRAG_MIME) as ProjectFlowNodeKind;
      if (!kind) return;
      addNode({ kind, position: screenToFlowPosition({ x: event.clientX, y: event.clientY }) });
      setStatusMessage('Node added.');
    },
    [addNode, screenToFlowPosition]
  );

  const handleQuickAdd = useCallback(
    (kind: ProjectFlowNodeKind) => {
      addNode({
        kind,
        position: {
          x: 180 + (nodes.length % 4) * 90,
          y: 140 + (nodes.length % 5) * 60,
        },
      });
      setStatusMessage(`${getPreset(kind).label} added.`);
    },
    [addNode, nodes.length]
  );

  const handleCanvasDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.react-flow__pane')) return;
      addNode({ kind: 'note', position: screenToFlowPosition({ x: event.clientX, y: event.clientY }) });
      setStatusMessage('Note dropped on canvas.');
    },
    [addNode, screenToFlowPosition]
  );

  const handleCopyBoard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportSnapshot, null, 2));
      setStatusMessage('Board JSON copied.');
    } catch {
      setStatusMessage('Clipboard copy failed.');
    }
  }, [exportSnapshot]);

  const handleImportFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text()) as Partial<ProjectFlowSnapshot>;
        importBoard(parsed);
        setStatusMessage(`${file.name} imported.`);
      } catch {
        setStatusMessage('Import failed. Use a valid Project Flow JSON export.');
      }
    },
    [importBoard]
  );

  const handleUploadFile = useCallback(
    async (file: File | null) => {
      if (!file || !selectedNode || !uploadKind) return;
      const common = {
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSizeLabel: formatFileSize(file.size),
      };

      try {
        if (uploadKind === 'document') {
          updateNodeData(selectedNode.id, { ...common, body: file.name });
        } else {
          updateNodeData(selectedNode.id, { ...common, body: file.name, mediaSrc: await fileToDataUrl(file) });
        }
        setStatusMessage(`${file.name} attached.`);
      } catch {
        setStatusMessage('Upload failed.');
      }
    },
    [selectedNode, updateNodeData, uploadKind]
  );

  const handleIngest = useCallback(
    async (fileList: FileList | null) => {
      const files = Array.from(fileList ?? []) as RelativeFile[];
      if (files.length === 0) return;
      const result = await buildIngestResult(files, { snapToGrid, showMiniMap, showGrid });
      importBoard(result.snapshot);
      setStatusMessage(result.message);
    },
    [importBoard, showGrid, showMiniMap, snapToGrid]
  );

  const openUploadPicker = useCallback((kind: UploadKind) => {
    setUploadKind(kind);
    uploadInputRef.current?.click();
  }, []);

  const openDrawingEditor = useCallback((nodeId: string) => {
    setDrawingNodeId(nodeId);
  }, []);

  const closeDrawingEditor = useCallback(() => {
    setDrawingNodeId(null);
    setActiveStroke(null);
  }, []);

  const saveDrawingEditor = useCallback(() => {
    if (!drawingNode) return;
    updateNodeData(drawingNode.id, { drawingStrokes: drawingDraft, drawingBackground });
    setDrawingNodeId(null);
    setActiveStroke(null);
    setStatusMessage('Sketch saved.');
  }, [drawingBackground, drawingDraft, drawingNode, updateNodeData]);

  const handleDrawingPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!drawingSurfaceRef.current) return;
      const point = getPointFromEvent(event, drawingSurfaceRef.current);
      setActiveStroke(createStroke(brushColor, brushSize, point));
      drawingSurfaceRef.current.setPointerCapture(event.pointerId);
    },
    [brushColor, brushSize]
  );

  const handleDrawingPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!drawingSurfaceRef.current || !activeStroke) return;
      const point = getPointFromEvent(event, drawingSurfaceRef.current);
      setActiveStroke((current) => (current ? { ...current, path: `${current.path} L ${point.x} ${point.y}` } : current));
    },
    [activeStroke]
  );

  const handleDrawingPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!drawingSurfaceRef.current || !activeStroke) return;
      drawingSurfaceRef.current.releasePointerCapture(event.pointerId);
      setDrawingDraft((current) => [...current, activeStroke]);
      setActiveStroke(null);
    },
    [activeStroke]
  );

  const handleNodeDoubleClick: NodeMouseHandler<ProjectFlowNode> = useCallback(
    (_event, node) => {
      if (node.data.kind === 'drawing') {
        openDrawingEditor(node.id);
        return;
      }
      if (node.data.kind === 'url' && node.data.url) {
        window.open(node.data.url, '_blank', 'noopener,noreferrer');
      }
    },
    [openDrawingEditor]
  );

  const handleTemplateLoad = useCallback(
    (templateId: (typeof PROJECT_FLOW_TEMPLATES)[number]['id'], templateTitle: string) => {
      loadTemplate(templateId);
      setStatusMessage(`${templateTitle} loaded.`);
    },
    [loadTemplate]
  );

  return (
    <div className="project-flow animate-rise">
      <div className="project-flow__topbar">
        <div className="project-flow__node-rail">
          {HEADER_NODE_KINDS.map((kind) => {
            const item = PROJECT_FLOW_NODE_LIBRARY.find((entry) => entry.kind === kind);
            if (!item) return null;
            return (
              <button
                key={kind}
                type="button"
                className="project-flow__header-node"
                draggable
                onDragStart={(event) => handleDragStart(event, kind)}
                onClick={() => handleQuickAdd(kind)}
                title={item.label}
              >
                <span className={`project-flow__library-icon project-flow__library-icon--${kind}`}>{item.icon}</span>
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
          <details className="project-flow__dropdown">
            <summary className="project-flow__header-node project-flow__dropdown-summary">
              <span className="project-flow__library-icon">•••</span>
              <span>More</span>
            </summary>
            <div className="project-flow__dropdown-menu" role="menu" aria-label="More node types">
              {HEADER_NODE_MENU_KINDS.map((kind) => {
                const item = PROJECT_FLOW_NODE_LIBRARY.find((entry) => entry.kind === kind);
                if (!item) return null;
                return (
                  <button
                    key={kind}
                    type="button"
                    className="project-flow__dropdown-item"
                    onClick={() => handleQuickAdd(kind)}
                    title={item.label}
                  >
                    <span className={`project-flow__library-icon project-flow__library-icon--${kind}`}>{item.icon}</span>
                    <span>{item.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </details>
        </div>

        <div className="project-flow__template-rail">
          {visibleTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              className="project-flow__template-pill"
              onClick={() => handleTemplateLoad(template.id, template.title)}
              title={template.description}
            >
              {template.shortLabel}
            </button>
          ))}
          <details className="project-flow__dropdown project-flow__dropdown--templates">
            <summary className="project-flow__template-pill project-flow__dropdown-summary">Boards</summary>
            <div className="project-flow__dropdown-menu project-flow__dropdown-menu--right" role="menu" aria-label="More board templates">
              {compactTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className="project-flow__dropdown-item"
                  onClick={() => handleTemplateLoad(template.id, template.title)}
                  title={template.description}
                >
                  <span>{template.shortLabel}</span>
                  <small>{template.title}</small>
                </button>
              ))}
            </div>
          </details>
          <button type="button" className="project-flow__ghost-button" onClick={() => ingestFilesInputRef.current?.click()}>
            Ingest files
          </button>
          <button type="button" className="project-flow__ghost-button" onClick={() => ingestFolderInputRef.current?.click()}>
            Ingest folder
          </button>
          <button type="button" className="project-flow__ghost-button" onClick={() => importInputRef.current?.click()}>
            Import JSON
          </button>
          <button type="button" className="project-flow__ghost-button" onClick={handleCopyBoard}>
            Export JSON
          </button>
          <button type="button" className="project-flow__ghost-button" onClick={() => setIsSettingsOpen((value) => !value)}>
            Settings
          </button>
        </div>

        <div className="project-flow__topbar-title">
          <input
            value={boardTitle}
            onChange={(event) => setBoardTitle(event.target.value)}
            className="project-flow__board-title"
            placeholder="Board title"
            title="Board title"
          />
        </div>
      </div>

      <div className="project-flow__canvas-shell" onDragOver={handleDragOver} onDrop={handleDrop} onDoubleClick={handleCanvasDoubleClick}>
        <div className="project-flow__status-toast">{statusMessage || `${nodes.length} nodes - ${edges.length} links`}</div>

        {isSettingsOpen ? (
          <aside className="project-flow__floating-panel project-flow__floating-panel--settings" role="dialog" aria-label="Canvas settings">
            <div className="project-flow__floating-head">
              <strong>Canvas</strong>
              <button type="button" className="project-flow__icon-button" onClick={() => setIsSettingsOpen(false)} aria-label="Close settings">
                x
              </button>
            </div>
            <label className="project-flow__toggle-row">
              <span>Snap</span>
              <input type="checkbox" checked={snapToGrid} title="Toggle snap to grid" onChange={(event) => setSnapToGrid(event.target.checked)} />
            </label>
            <label className="project-flow__toggle-row">
              <span>Mini map</span>
              <input type="checkbox" checked={showMiniMap} title="Toggle mini map" onChange={(event) => setShowMiniMap(event.target.checked)} />
            </label>
            <label className="project-flow__toggle-row">
              <span>Grid</span>
              <input type="checkbox" checked={showGrid} title="Toggle grid" onChange={(event) => setShowGrid(event.target.checked)} />
            </label>
            <button type="button" className="project-flow__danger-button" onClick={clearBoard}>
              Clear board
            </button>
          </aside>
        ) : null}

        {selectedNode && isInspectorOpen ? (
          <aside className="project-flow__floating-panel project-flow__floating-panel--inspector" role="dialog" aria-label="Selected node settings">
            <div className="project-flow__floating-head">
              <strong>{selectedNode.data.kind}</strong>
              <button type="button" className="project-flow__icon-button" onClick={() => setIsInspectorOpen(false)} aria-label="Close node inspector">
                x
              </button>
            </div>

            <div className="project-flow__inspector-stack">
              <input
                value={selectedNode.data.title}
                onChange={(event) => updateNodeData(selectedNode.id, { title: event.target.value })}
                className="project-flow__input"
                placeholder="Title"
                title="Node title"
              />
              <input
                value={selectedNode.data.subtitle}
                onChange={(event) => updateNodeData(selectedNode.id, { subtitle: event.target.value })}
                className="project-flow__input"
                placeholder="Subtitle"
                title="Node subtitle"
              />

              {selectedNode.data.kind === 'url' ? (
                <div className="project-flow__inspector-group">
                  <input
                    value={selectedNode.data.url}
                    onChange={(event) => updateNodeData(selectedNode.id, { url: event.target.value })}
                    className="project-flow__input"
                    placeholder="https://"
                    title="Node URL"
                  />
                  <button
                    type="button"
                    className="project-flow__ghost-button"
                    onClick={() => selectedNode.data.url && window.open(selectedNode.data.url, '_blank', 'noopener,noreferrer')}
                  >
                    Open link
                  </button>
                </div>
              ) : null}

              {selectedNode.data.kind === 'document' ? (
                <div className="project-flow__inspector-group">
                  <div className="project-flow__asset-meta">
                    <span>{selectedNode.data.fileName || 'No file'}</span>
                    <span>{selectedNode.data.fileSizeLabel || '0 KB'}</span>
                  </div>
                  <button type="button" className="project-flow__ghost-button" onClick={() => openUploadPicker('document')}>
                    Upload document
                  </button>
                </div>
              ) : null}

              {selectedNode.data.kind === 'image' ? (
                <div className="project-flow__inspector-group">
                  <button type="button" className="project-flow__ghost-button" onClick={() => openUploadPicker('image')}>
                    Upload image
                  </button>
                  <div className="project-flow__segmented-row">
                    <button
                      type="button"
                      className={`project-flow__segment ${selectedNode.data.previewMode === 'cover' ? 'is-active' : ''}`}
                      onClick={() => updateNodeData(selectedNode.id, { previewMode: 'cover' })}
                    >
                      Cover
                    </button>
                    <button
                      type="button"
                      className={`project-flow__segment ${selectedNode.data.previewMode === 'contain' ? 'is-active' : ''}`}
                      onClick={() => updateNodeData(selectedNode.id, { previewMode: 'contain' })}
                    >
                      Contain
                    </button>
                  </div>
                </div>
              ) : null}

              {selectedNode.data.kind === 'video' ? (
                <button type="button" className="project-flow__ghost-button" onClick={() => openUploadPicker('video')}>
                  Upload video
                </button>
              ) : null}

              {selectedNode.data.kind === 'drawing' ? (
                <button type="button" className="project-flow__ghost-button" onClick={() => openDrawingEditor(selectedNode.id)}>
                  Open sketch pad
                </button>
              ) : null}

              <textarea
                value={selectedNode.data.body}
                onChange={(event) => updateNodeData(selectedNode.id, { body: event.target.value })}
                className="project-flow__textarea"
                rows={4}
                placeholder="Notes"
                title="Node notes"
              />
              <input
                value={selectedNode.data.tags.join(', ')}
                onChange={(event) => updateNodeData(selectedNode.id, { tags: parseTags(event.target.value) })}
                className="project-flow__input"
                placeholder="Tags"
                title="Node tags"
              />
              <label className="project-flow__color-row">
                <span>Accent</span>
                <input
                  type="color"
                  value={selectedNode.data.accent}
                  title="Choose node accent color"
                  onChange={(event) => updateNodeData(selectedNode.id, { accent: event.target.value })}
                />
              </label>

              <div className="project-flow__checklist-editor">
                <div className="project-flow__checklist-header">
                  <strong>Checklist</strong>
                  <span>{selectedNode.data.checklist.length}</span>
                </div>
                <div className="project-flow__checklist-list">
                  {selectedNode.data.checklist.map((item) => (
                    <div key={item.id} className="project-flow__checklist-item">
                      <input
                        type="checkbox"
                        checked={item.done}
                        title="Toggle checklist item"
                        onChange={(event) => updateChecklistItem(selectedNode.id, item.id, { done: event.target.checked })}
                      />
                      <input
                        value={item.label}
                        onChange={(event) => updateChecklistItem(selectedNode.id, item.id, { label: event.target.value })}
                        className="project-flow__input project-flow__input--compact"
                        placeholder="Checklist item"
                        title="Checklist item label"
                      />
                      <button type="button" className="project-flow__icon-button" onClick={() => removeChecklistItem(selectedNode.id, item.id)}>
                        x
                      </button>
                    </div>
                  ))}
                </div>
                <div className="project-flow__checklist-add">
                  <input
                    value={newChecklistLabel}
                    onChange={(event) => setNewChecklistLabel(event.target.value)}
                    className="project-flow__input project-flow__input--compact"
                    placeholder="Add item"
                    title="New checklist item"
                  />
                  <button
                    type="button"
                    className="project-flow__ghost-button"
                    onClick={() => {
                      addChecklistItem(selectedNode.id, newChecklistLabel);
                      setNewChecklistLabel('');
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="project-flow__action-row">
                <button type="button" className="project-flow__ghost-button" onClick={() => duplicateNode(selectedNode.id)}>
                  Duplicate
                </button>
                <button type="button" className="project-flow__danger-button" onClick={() => deleteNodes([selectedNode.id])}>
                  Delete
                </button>
              </div>
            </div>
          </aside>
        ) : null}

        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          className="project-flow__hidden-input"
          title="Import Project Flow JSON"
          onChange={(event) => {
            void handleImportFile(event.target.files?.[0] ?? null);
            event.target.value = '';
          }}
        />
        <input
          ref={uploadInputRef}
          type="file"
          accept={getUploadAccept(uploadKind)}
          className="project-flow__hidden-input"
          title="Upload asset"
          onChange={(event) => {
            void handleUploadFile(event.target.files?.[0] ?? null);
            event.target.value = '';
          }}
        />
        <input
          ref={ingestFilesInputRef}
          type="file"
          multiple
          className="project-flow__hidden-input"
          title="Ingest files"
          onChange={(event) => {
            void handleIngest(event.target.files);
            event.target.value = '';
          }}
        />
        <input
          ref={ingestFolderInputRef}
          type="file"
          className="project-flow__hidden-input"
          title="Ingest folder"
          onChange={(event) => {
            void handleIngest(event.target.files);
            event.target.value = '';
          }}
        />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onNodeDoubleClick={handleNodeDoubleClick}
          onPaneClick={() => setSelectedNode(null)}
          onSelectionChange={({ nodes: selectedNodes }) => setSelectedNode(selectedNodes[0]?.id ?? null)}
          onNodesDelete={(deletedNodes) => deleteNodes(deletedNodes.map((node) => node.id))}
          onEdgesDelete={(deletedEdges) => deleteEdges(deletedEdges.map((edge) => edge.id))}
          fitView
          minZoom={0.25}
          maxZoom={1.8}
          snapToGrid={snapToGrid}
          snapGrid={[20, 20]}
          colorMode="dark"
          defaultEdgeOptions={{ type: 'smoothstep' }}
          attributionPosition="bottom-left"
        >
          <Controls className="project-flow__controls" showInteractive={false} />
          {showMiniMap ? (
            <MiniMap
              className="project-flow__minimap"
              nodeColor={(node) => (typeof node.data.accent === 'string' ? node.data.accent : '#2dd4bf')}
              pannable
              zoomable
            />
          ) : null}
          {showGrid ? <Background gap={20} size={1.2} variant={BackgroundVariant.Dots} /> : null}
        </ReactFlow>

        {drawingNode ? (
          <div className="project-flow__drawing-overlay" role="dialog" aria-label="Drawing editor">
            <button type="button" className="project-flow__drawing-backdrop" onClick={closeDrawingEditor} aria-label="Close drawing editor" />
            <div className="project-flow__drawing-modal">
              <div className="project-flow__floating-head">
                <strong>{drawingNode.data.title}</strong>
                <div className="project-flow__drawing-actions">
                  <button type="button" className="project-flow__ghost-button" onClick={() => setDrawingDraft([])}>
                    Clear
                  </button>
                  <button type="button" className="project-flow__ghost-button" onClick={closeDrawingEditor}>
                    Cancel
                  </button>
                  <button type="button" className="project-flow__ghost-button" onClick={saveDrawingEditor}>
                    Save
                  </button>
                </div>
              </div>

              <div className="project-flow__drawing-toolbar">
                <label className="project-flow__color-row">
                  <span>Ink</span>
                  <input type="color" value={brushColor} title="Drawing color" onChange={(event) => setBrushColor(event.target.value)} />
                </label>
                <label className="project-flow__color-row">
                  <span>Board</span>
                  <input type="color" value={drawingBackground} title="Drawing background" onChange={(event) => setDrawingBackground(event.target.value)} />
                </label>
                <label className="project-flow__range-row">
                  <span>Brush</span>
                  <input type="range" min="1" max="12" value={brushSize} title="Brush size" onChange={(event) => setBrushSize(Number(event.target.value))} />
                </label>
              </div>

              <div
                ref={drawingSurfaceRef}
                className="project-flow__drawing-surface"
                onPointerDown={handleDrawingPointerDown}
                onPointerMove={handleDrawingPointerMove}
                onPointerUp={handleDrawingPointerUp}
                onPointerLeave={handleDrawingPointerUp}
              >
                <svg viewBox={`0 0 ${DRAWING_VIEWBOX.width} ${DRAWING_VIEWBOX.height}`} className="project-flow__drawing-svg" preserveAspectRatio="none">
                  <rect width={DRAWING_VIEWBOX.width} height={DRAWING_VIEWBOX.height} fill={drawingBackground} />
                  {drawingDraft.map((stroke) => (
                    <path
                      key={stroke.id}
                      d={stroke.path}
                      fill="none"
                      stroke={stroke.color}
                      strokeWidth={stroke.width}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {activeStroke ? (
                    <path
                      d={activeStroke.path}
                      fill="none"
                      stroke={activeStroke.color}
                      strokeWidth={activeStroke.width}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                </svg>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ProjectFlowWorkspace(_props: ProjectFlowWorkspaceProps) {
  return (
    <ReactFlowProvider>
      <ProjectFlowWorkspaceInner />
    </ReactFlowProvider>
  );
}
