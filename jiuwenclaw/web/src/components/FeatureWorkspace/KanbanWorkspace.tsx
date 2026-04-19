import { DragEvent, useMemo, useState } from 'react';
import {
  useKanbanStore,
  type KanbanCard,
} from '../../stores/kanbanStore';
import './KanbanWorkspace.css';

type DragPayload =
  | { type: 'entry'; entryId: string }
  | { type: 'subtask'; entryId: string; subtaskId: string }
  | { type: 'card'; cardId: string };

function setDragPayload(event: DragEvent<HTMLElement>, payload: DragPayload) {
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('application/deep-canvas-feature', JSON.stringify(payload));
}

function getDragPayload(event: DragEvent<HTMLElement>): DragPayload | null {
  const raw = event.dataTransfer.getData('application/deep-canvas-feature');
  if (!raw) return null;

  try {
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

function formatCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function KanbanWorkspace({ onExit }: { onExit: () => void }) {
  const entries = useKanbanStore((state) => state.entries);
  const columns = useKanbanStore((state) => state.columns);
  const cards = useKanbanStore((state) => state.cards);
  const addEntry = useKanbanStore((state) => state.addEntry);
  const updateEntry = useKanbanStore((state) => state.updateEntry);
  const deleteEntry = useKanbanStore((state) => state.deleteEntry);
  const addEntrySubtask = useKanbanStore((state) => state.addEntrySubtask);
  const updateEntrySubtask = useKanbanStore((state) => state.updateEntrySubtask);
  const deleteEntrySubtask = useKanbanStore((state) => state.deleteEntrySubtask);
  const addColumn = useKanbanStore((state) => state.addColumn);
  const updateColumn = useKanbanStore((state) => state.updateColumn);
  const deleteColumn = useKanbanStore((state) => state.deleteColumn);
  const addManualCard = useKanbanStore((state) => state.addManualCard);
  const addCardFromEntry = useKanbanStore((state) => state.addCardFromEntry);
  const addCardFromSubtask = useKanbanStore((state) => state.addCardFromSubtask);
  const updateCard = useKanbanStore((state) => state.updateCard);
  const updateCardSubtask = useKanbanStore((state) => state.updateCardSubtask);
  const addCardSubtask = useKanbanStore((state) => state.addCardSubtask);
  const deleteCardSubtask = useKanbanStore((state) => state.deleteCardSubtask);
  const moveCard = useKanbanStore((state) => state.moveCard);
  const deleteCard = useKanbanStore((state) => state.deleteCard);

  const [entryTitle, setEntryTitle] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [subtaskDraft, setSubtaskDraft] = useState('');
  const [draftSubtasks, setDraftSubtasks] = useState<string[]>([]);
  const [columnDraft, setColumnDraft] = useState('');
  const [entrySubtaskDrafts, setEntrySubtaskDrafts] = useState<Record<string, string>>({});
  const [cardSubtaskDrafts, setCardSubtaskDrafts] = useState<Record<string, string>>({});
  const [dropColumnId, setDropColumnId] = useState<string | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const columnCards = useMemo(() => {
    return columns.reduce<Record<string, KanbanCard[]>>((accumulator, column) => {
      accumulator[column.id] = cards.filter((card) => card.columnId === column.id);
      return accumulator;
    }, {});
  }, [cards, columns]);

  const boardCardCount = cards.length;
  const intakeCount = entries.length;
  const totalSubentryCount = entries.reduce((total, entry) => total + entry.subtasks.length, 0);

  const handleCreateEntry = () => {
    if (!entryTitle.trim()) return;
    addEntry({ title: entryTitle, notes: entryNotes, subtasks: draftSubtasks });
    setEntryTitle('');
    setEntryNotes('');
    setSubtaskDraft('');
    setDraftSubtasks([]);
    setComposerOpen(false);
  };

  const handleAddDraftSubtask = () => {
    const clean = subtaskDraft.trim();
    if (!clean) return;
    setDraftSubtasks((current) => [...current, clean]);
    setSubtaskDraft('');
  };

  const handleColumnDrop = (columnId: string, event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDropColumnId(null);
    const payload = getDragPayload(event);
    if (!payload) return;

    if (payload.type === 'card') {
      moveCard(payload.cardId, columnId);
      return;
    }

    if (payload.type === 'entry') {
      addCardFromEntry(payload.entryId, columnId);
      return;
    }

    addCardFromSubtask(payload.entryId, payload.subtaskId, columnId);
  };

  return (
    <div className="feature-kanban animate-rise">
      <section className="feature-kanban__intake">
        <div className="feature-kanban__panel">
          <div className="feature-kanban__panel-header">
            <div>
              <div className="feature-kanban__eyebrow">Task Intake</div>
              <h2 className="feature-kanban__panel-title">Build Tasks</h2>
            </div>
            <div className="feature-kanban__stat-pill">{formatCountLabel(intakeCount, 'entry', 'entries')}</div>
          </div>

          <div className="feature-kanban__composer-shell">
            <button
              type="button"
              className="feature-kanban__primary-button feature-kanban__primary-button--full"
              onClick={() => setComposerOpen((current) => !current)}
            >
              {composerOpen ? 'Hide task form' : 'Create task'}
            </button>

            {composerOpen && (
              <div className="feature-kanban__composer">
                <input
                  value={entryTitle}
                  onChange={(event) => setEntryTitle(event.target.value)}
                  className="feature-kanban__input feature-kanban__input--title"
                  placeholder="Main task title"
                />
                <textarea
                  value={entryNotes}
                  onChange={(event) => setEntryNotes(event.target.value)}
                  className="feature-kanban__textarea"
                  placeholder="Notes, context, or acceptance details"
                  rows={3}
                />

                <div className="feature-kanban__subtask-composer">
                  <input
                    value={subtaskDraft}
                    onChange={(event) => setSubtaskDraft(event.target.value)}
                    className="feature-kanban__input"
                    placeholder="Sub-task"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAddDraftSubtask();
                      }
                    }}
                  />
                  <button type="button" className="feature-kanban__ghost-button" onClick={handleAddDraftSubtask}>
                    Add sub-task
                  </button>
                </div>

                {draftSubtasks.length > 0 && (
                  <div className="feature-kanban__chip-row">
                    {draftSubtasks.map((item, index) => (
                      <button
                        key={`${item}-${index}`}
                        type="button"
                        className="feature-kanban__chip"
                        onClick={() => setDraftSubtasks((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                        title="Remove sub-task"
                      >
                        <span>{item}</span>
                        <span aria-hidden="true">×</span>
                      </button>
                    ))}
                  </div>
                )}

                <button type="button" className="feature-kanban__primary-button feature-kanban__primary-button--full" onClick={handleCreateEntry}>
                  Save task
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="feature-kanban__panel feature-kanban__panel--scrollable">
          <div className="feature-kanban__panel-header">
            <div>
              <div className="feature-kanban__eyebrow">Queue</div>
              <h3 className="feature-kanban__panel-title">Ready for Board</h3>
            </div>
            <div className="feature-kanban__stat-pill">{formatCountLabel(totalSubentryCount, 'sub-entry', 'sub-entries')}</div>
          </div>

          <div className="feature-kanban__entry-list">
            {entries.length === 0 ? (
              <div className="feature-kanban__empty-state">Create a task on the left, then drag it or add it to the board.</div>
            ) : (
              entries.map((entry) => (
                <article
                  key={entry.id}
                  className={`feature-kanban__entry-card ${expandedEntryId === entry.id ? 'is-expanded' : ''}`}
                >
                  <div
                    className="feature-kanban__entry-summary"
                    draggable
                    onDragStart={(event) => setDragPayload(event, { type: 'entry', entryId: entry.id })}
                  >
                    <button
                      type="button"
                      className="feature-kanban__entry-toggle"
                      onClick={() => setExpandedEntryId((current) => (current === entry.id ? null : entry.id))}
                      aria-label={expandedEntryId === entry.id ? 'Collapse task' : 'Expand task'}
                      title={expandedEntryId === entry.id ? 'Collapse task' : 'Expand task'}
                    >
                      {expandedEntryId === entry.id ? '−' : '+'}
                    </button>
                    <input
                      value={entry.title}
                      onChange={(event) => updateEntry(entry.id, { title: event.target.value })}
                      className="feature-kanban__entry-title feature-kanban__entry-title--compact"
                      placeholder="Main task title"
                    />
                    <div className="feature-kanban__entry-meta">
                      <span className="feature-kanban__entry-count">
                        {entry.subtasks.length} sub
                      </span>
                      <button type="button" className="feature-kanban__mini-button" onClick={() => addCardFromEntry(entry.id)}>
                        Add
                      </button>
                      <button type="button" className="feature-kanban__mini-button feature-kanban__mini-button--danger" onClick={() => deleteEntry(entry.id)}>
                        ×
                      </button>
                    </div>
                  </div>

                  {expandedEntryId === entry.id && (
                    <>
                      <textarea
                        value={entry.notes}
                        onChange={(event) => updateEntry(entry.id, { notes: event.target.value })}
                        className="feature-kanban__entry-notes feature-kanban__entry-notes--compact"
                        placeholder="Task notes"
                        rows={2}
                      />

                      <div className="feature-kanban__subentry-list feature-kanban__subentry-list--compact">
                        {entry.subtasks.map((subtask) => (
                          <div
                            key={subtask.id}
                            className="feature-kanban__subentry-row feature-kanban__subentry-row--compact"
                            draggable
                            onDragStart={(event) => setDragPayload(event, { type: 'subtask', entryId: entry.id, subtaskId: subtask.id })}
                          >
                            <input
                              value={subtask.title}
                              onChange={(event) => updateEntrySubtask(entry.id, subtask.id, event.target.value)}
                              className="feature-kanban__subentry-input feature-kanban__subentry-input--bare"
                              placeholder="Sub-task"
                            />
                            <button
                              type="button"
                              className="feature-kanban__mini-button"
                              onClick={() => addCardFromSubtask(entry.id, subtask.id)}
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              className="feature-kanban__mini-button feature-kanban__mini-button--danger"
                              onClick={() => deleteEntrySubtask(entry.id, subtask.id)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="feature-kanban__subtask-composer feature-kanban__subtask-composer--compact">
                        <input
                          value={entrySubtaskDrafts[entry.id] ?? ''}
                          onChange={(event) =>
                            setEntrySubtaskDrafts((current) => ({ ...current, [entry.id]: event.target.value }))
                          }
                          className="feature-kanban__input feature-kanban__input--compact-row"
                          placeholder="Add another sub-entry"
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              const draft = entrySubtaskDrafts[entry.id] ?? '';
                              addEntrySubtask(entry.id, draft);
                              setEntrySubtaskDrafts((current) => ({ ...current, [entry.id]: '' }));
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="feature-kanban__ghost-button"
                          onClick={() => {
                            const draft = entrySubtaskDrafts[entry.id] ?? '';
                            addEntrySubtask(entry.id, draft);
                            setEntrySubtaskDrafts((current) => ({ ...current, [entry.id]: '' }));
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="feature-kanban__board-shell">
        <div className="feature-kanban__board-toolbar">
          <div className="feature-kanban__board-heading">
            <div className="feature-kanban__eyebrow">Kanban Board</div>
            <h2 className="feature-kanban__panel-title feature-kanban__panel-title--board">Delivery Flow</h2>
          </div>
          <div className="feature-kanban__board-stats">
            <div className="feature-kanban__stat-pill">{formatCountLabel(boardCardCount, 'card', 'cards')}</div>
            <input
              value={columnDraft}
              onChange={(event) => setColumnDraft(event.target.value)}
              className="feature-kanban__input feature-kanban__input--compact feature-kanban__input--toolbar"
              placeholder="New column"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addColumn(columnDraft);
                  setColumnDraft('');
                }
              }}
            />
            <button
              type="button"
              className="feature-kanban__primary-button feature-kanban__primary-button--toolbar"
              onClick={() => {
                addColumn(columnDraft);
                setColumnDraft('');
              }}
            >
              Add column
            </button>
            <button
              type="button"
              className="feature-workspace__back feature-workspace__back--inline"
              onClick={onExit}
            >
              Back to chat
            </button>
          </div>
        </div>

        <div className="feature-kanban__board-grid">
          {columns.map((column) => (
            <section
              key={column.id}
              className={`feature-kanban__column ${dropColumnId === column.id ? 'is-drop-target' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDropColumnId(column.id);
              }}
              onDragLeave={() => {
                setDropColumnId((current) => (current === column.id ? null : current));
              }}
              onDrop={(event) => handleColumnDrop(column.id, event)}
            >
              <div className="feature-kanban__column-header">
                <input
                  value={column.title}
                  onChange={(event) => updateColumn(column.id, event.target.value)}
                  className="feature-kanban__column-title"
                  aria-label="Column title"
                  title="Column title"
                  placeholder="Column title"
                />
                <div className="feature-kanban__column-actions">
                  <span className="feature-kanban__column-count">{columnCards[column.id]?.length ?? 0}</span>
                  <button type="button" className="feature-kanban__mini-button" onClick={() => addManualCard(column.id)}>
                    +
                  </button>
                  <button
                    type="button"
                    className="feature-kanban__mini-button feature-kanban__mini-button--danger"
                    onClick={() => deleteColumn(column.id)}
                    disabled={columns.length <= 1}
                    title={columns.length <= 1 ? 'Keep at least one column' : 'Delete column'}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="feature-kanban__card-list">
                {(columnCards[column.id] ?? []).map((card) => (
                  <article
                    key={card.id}
                    className="feature-kanban__board-card"
                    draggable
                    onDragStart={(event) => setDragPayload(event, { type: 'card', cardId: card.id })}
                  >
                    <div className="feature-kanban__drag-hint">Drag to move between columns</div>
                    {card.parentTitle && <div className="feature-kanban__card-parent">From {card.parentTitle}</div>}
                    <input
                      value={card.title}
                      onChange={(event) => updateCard(card.id, { title: event.target.value })}
                      className="feature-kanban__entry-title"
                      placeholder="Card title"
                    />
                    <textarea
                      value={card.notes}
                      onChange={(event) => updateCard(card.id, { notes: event.target.value })}
                      className="feature-kanban__entry-notes"
                      placeholder="Card notes"
                      rows={2}
                    />

                    {card.subtasks.length > 0 && (
                      <div className="feature-kanban__subentry-list">
                        {card.subtasks.map((subtask) => (
                          <div key={subtask.id} className="feature-kanban__subentry-row feature-kanban__subentry-row--board">
                            <span className="feature-kanban__subentry-bullet" aria-hidden="true" />
                            <input
                              value={subtask.title}
                              onChange={(event) => updateCardSubtask(card.id, subtask.id, event.target.value)}
                              className="feature-kanban__subentry-input"
                              placeholder="Checklist item"
                            />
                            <button
                              type="button"
                              className="feature-kanban__mini-button feature-kanban__mini-button--danger"
                              onClick={() => deleteCardSubtask(card.id, subtask.id)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="feature-kanban__subtask-composer">
                      <input
                        value={cardSubtaskDrafts[card.id] ?? ''}
                        onChange={(event) =>
                          setCardSubtaskDrafts((current) => ({ ...current, [card.id]: event.target.value }))
                        }
                        className="feature-kanban__input"
                        placeholder="Add checklist item"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            const draft = cardSubtaskDrafts[card.id] ?? '';
                            addCardSubtask(card.id, draft);
                            setCardSubtaskDrafts((current) => ({ ...current, [card.id]: '' }));
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="feature-kanban__ghost-button"
                        onClick={() => {
                          const draft = cardSubtaskDrafts[card.id] ?? '';
                          addCardSubtask(card.id, draft);
                          setCardSubtaskDrafts((current) => ({ ...current, [card.id]: '' }));
                        }}
                      >
                        Add item
                      </button>
                    </div>

                    <div className="feature-kanban__entry-actions">
                      <button type="button" className="feature-kanban__danger-button" onClick={() => deleteCard(card.id)}>
                        Delete card
                      </button>
                    </div>
                  </article>
                ))}

                {(columnCards[column.id] ?? []).length === 0 && (
                  <div className="feature-kanban__drop-zone">Drop tasks here or create a new card.</div>
                )}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}