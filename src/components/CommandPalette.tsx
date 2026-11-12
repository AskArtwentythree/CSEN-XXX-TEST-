import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { actions } from '../store/actions';
import { useStore } from '../store/useStore';
import { STATUS_LABELS, THEMES, type Task } from '../types';
import { fuzzyFilter } from '../utils/fuzzy';
import { shortcutLabel } from '../utils/keys';

const MAX_RESULTS = 40;

type Section = 'Actions' | 'Navigate' | 'Projects' | 'Tasks';
const SECTION_ORDER: Section[] = ['Actions', 'Navigate', 'Projects', 'Tasks'];

interface Command {
  id: string;
  label: string;
  section: Section;
  hint?: string;
  color?: string;
  run: () => void;
}

interface CommandPaletteProps {
  onClose: () => void;
  onOpenTask: (task?: Task) => void;
  onNewProject: () => void;
}

function Highlight({ text, indices }: { text: string; indices: number[] }): ReactNode {
  if (indices.length === 0) return text;
  const marked = new Set(indices);
  // Group runs so assistive tech reads whole words, not one letter per node.
  const runs: Array<{ text: string; marked: boolean }> = [];
  for (let i = 0; i < text.length; i++) {
    const last = runs[runs.length - 1];
    if (last && last.marked === marked.has(i)) last.text += text[i];
    else runs.push({ text: text[i], marked: marked.has(i) });
  }
  return runs.map((run, i) => (run.marked ? <mark key={i}>{run.text}</mark> : run.text));
}

export function CommandPalette({ onClose, onOpenTask, onNewProject }: CommandPaletteProps) {
  const { state, dispatch, canUndo, canRedo } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  const commands = useMemo(() => {
    const go = (path: string) => () => navigate(path);
    const list: Command[] = [];
    if (state.projects.length > 0) {
      list.push({ id: 'new-task', label: 'New task', section: 'Actions', run: () => onOpenTask() });
    }
    list.push({ id: 'new-project', label: 'New project', section: 'Actions', run: onNewProject });
    if (canUndo) {
      list.push({ id: 'undo', label: 'Undo', section: 'Actions', hint: shortcutLabel('Z'), run: () => dispatch(actions.undo()) });
    }
    if (canRedo) {
      list.push({ id: 'redo', label: 'Redo', section: 'Actions', hint: shortcutLabel('Z', { shift: true }), run: () => dispatch(actions.redo()) });
    }
    for (const theme of THEMES) {
      if (theme === state.theme) continue;
      list.push({
        id: `theme-${theme}`,
        label: `Switch to ${theme} theme`,
        section: 'Actions',
        run: () => dispatch(actions.setTheme(theme)),
      });
    }
    list.push(
      { id: 'nav-dashboard', label: 'Go to Dashboard', section: 'Navigate', run: go('/') },
      { id: 'nav-projects', label: 'Go to Projects', section: 'Navigate', run: go('/projects') },
      { id: 'nav-tasks', label: 'Go to All tasks', section: 'Navigate', run: go('/tasks') },
      { id: 'nav-calendar', label: 'Go to Calendar', section: 'Navigate', run: go('/calendar') },
      { id: 'nav-settings', label: 'Go to Settings', section: 'Navigate', run: go('/settings') },
      { id: 'nav-overdue', label: 'Show overdue tasks', section: 'Navigate', run: go('/tasks?q=is%3Aoverdue') },
      { id: 'nav-blocked', label: 'Show blocked tasks', section: 'Navigate', run: go('/tasks?q=is%3Ablocked') },
    );
    const projectById = new Map(state.projects.map((p) => [p.id, p]));
    for (const project of state.projects) {
      list.push({
        id: `project-${project.id}`,
        label: project.name,
        section: 'Projects',
        color: project.color,
        run: go(`/projects/${project.id}`),
      });
    }
    for (const task of state.tasks) {
      const project = projectById.get(task.projectId);
      list.push({
        id: `task-${task.id}`,
        label: task.title,
        section: 'Tasks',
        hint: `${project?.name ?? 'Unknown'} · ${STATUS_LABELS[task.status]}`,
        color: project?.color,
        run: () => onOpenTask(task),
      });
    }
    return list;
  }, [state, canUndo, canRedo, dispatch, navigate, onOpenTask, onNewProject]);

  const results = useMemo(() => {
    if (!query.trim()) {
      // Without a query, show everything except the (potentially long) task list.
      return commands
        .filter((c) => c.section !== 'Tasks')
        .map((command) => ({ command, indices: [] as number[] }));
    }
    const ranked = fuzzyFilter(commands, query, (c) => c.label).slice(0, MAX_RESULTS);
    // Group by section while keeping each section's best-first order.
    return SECTION_ORDER.flatMap((section) =>
      ranked
        .filter((r) => r.item.section === section)
        .map((r) => ({ command: r.item, indices: r.match.indices })),
    );
  }, [commands, query]);

  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex]);

  function execute(index: number) {
    const result = results[index];
    if (!result) return;
    onClose();
    result.command.run();
  }

  function handleKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActive(results.length ? (activeIndex + 1) % results.length : 0);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive(results.length ? (activeIndex - 1 + results.length) % results.length : 0);
        break;
      case 'Enter':
        event.preventDefault();
        execute(activeIndex);
        break;
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
    }
  }

  const optionId = (index: number) => `${listId}-option-${index}`;

  return createPortal(
    <div
      className="modal-backdrop palette-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          autoFocus
          className="palette-input"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results.length ? optionId(activeIndex) : undefined}
          aria-autocomplete="list"
          placeholder="Search tasks, projects and commands…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={handleKeyDown}
        />
        <ul className="palette-results" id={listId} role="listbox" ref={listRef} aria-label="Results">
          {results.length === 0 && <li className="palette-empty">No results for “{query}”</li>}
          {results.map(({ command, indices }, index) => {
            const heading =
              index === 0 || results[index - 1].command.section !== command.section
                ? command.section
                : null;
            return (
              <li key={command.id} role="presentation">
                {heading && (
                  <div className="palette-section" aria-hidden="true">
                    {heading}
                  </div>
                )}
                <div
                  id={optionId(index)}
                  data-index={index}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`palette-option ${index === activeIndex ? 'active' : ''}`}
                  onMouseMove={() => index !== activeIndex && setActive(index)}
                  onClick={() => execute(index)}
                >
                  {command.color && <span className="dot" style={{ background: command.color }} />}
                  <span className="palette-label truncate">
                    <Highlight text={command.label} indices={indices} />
                  </span>
                  {command.hint && <span className="palette-hint">{command.hint}</span>}
                </div>
              </li>
            );
          })}
        </ul>
        <footer className="palette-footer muted small">
          <span>↑↓ to navigate</span>
          <span>↵ to select</span>
          <span>esc to close</span>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
