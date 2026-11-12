import { useRef, useState, type ChangeEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { actions } from '../store/actions';
import { createSeedState } from '../store/seed';
import { parseAppState } from '../store/storage';
import { useStore } from '../store/useStore';
import { THEMES, type Theme } from '../types';
import { todayISO } from '../utils/date';

const THEME_LABELS: Record<Theme, string> = { light: 'Light', dark: 'Dark', system: 'System' };

type Notice = { tone: 'success' | 'error'; text: string } | null;

export function SettingsPage() {
  const { state, dispatch } = useStore();
  const [notice, setNotice] = useState<Notice>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function handleExport() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `taskflow-backup-${todayISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice({ tone: 'success', text: 'Backup downloaded.' });
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = parseAppState(JSON.parse(await file.text()));
      if (!parsed) throw new Error('invalid');
      if (!window.confirm('Replace all current data with this backup?')) return;
      dispatch(actions.replaceState(parsed));
      setNotice({
        tone: 'success',
        text: `Imported ${parsed.projects.length} projects and ${parsed.tasks.length} tasks.`,
      });
    } catch {
      setNotice({ tone: 'error', text: 'That file is not a valid Taskflow backup.' });
    }
  }

  function handleReset() {
    if (!window.confirm('Replace all data with the sample projects?')) return;
    dispatch(actions.replaceState({ ...createSeedState(todayISO()), theme: state.theme }));
    setNotice({ tone: 'success', text: 'Sample data restored.' });
  }

  function handleClear() {
    if (!window.confirm('Permanently delete all projects and tasks?')) return;
    dispatch(actions.replaceState({ projects: [], tasks: [], theme: state.theme }));
    setNotice({ tone: 'success', text: 'All data deleted.' });
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Appearance and data management" />

      {notice && (
        <div className={`notice notice-${notice.tone}`} role="status">
          {notice.text}
          <button className="icon-button" aria-label="Dismiss" onClick={() => setNotice(null)}>
            ✕
          </button>
        </div>
      )}

      <section className="panel settings-section">
        <h2>Appearance</h2>
        <p className="muted">Choose how Taskflow looks. System follows your OS setting.</p>
        <div className="segmented" role="radiogroup" aria-label="Theme">
          {THEMES.map((theme) => (
            <label key={theme} className={state.theme === theme ? 'active' : ''}>
              <input
                type="radio"
                name="theme"
                value={theme}
                checked={state.theme === theme}
                onChange={() => dispatch(actions.setTheme(theme))}
              />
              {THEME_LABELS[theme]}
            </label>
          ))}
        </div>
      </section>

      <section className="panel settings-section">
        <h2>Data</h2>
        <p className="muted">
          Your data is stored in this browser. Export a backup to move it to another device.
        </p>
        <div className="button-row">
          <button className="btn" onClick={handleExport}>
            Export backup
          </button>
          <button className="btn" onClick={() => fileInput.current?.click()}>
            Import backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={handleImport}
          />
        </div>
      </section>

      <section className="panel settings-section danger-zone">
        <h2>Danger zone</h2>
        <div className="button-row">
          <button className="btn" onClick={handleReset}>
            Restore sample data
          </button>
          <button className="btn btn-danger" onClick={handleClear}>
            Delete all data
          </button>
        </div>
      </section>
    </>
  );
}
