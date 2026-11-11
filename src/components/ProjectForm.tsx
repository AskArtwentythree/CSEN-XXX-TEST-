import { useState, type FormEvent } from 'react';
import { PROJECT_COLORS, type Project, type ProjectInput } from '../types';

interface ProjectFormProps {
  initial?: Project;
  onSubmit: (input: ProjectInput) => void;
  onCancel: () => void;
}

export function ProjectForm({ initial, onSubmit, onCancel }: ProjectFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [color, setColor] = useState(initial?.color ?? PROJECT_COLORS[0].value);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    onSubmit({ name: name.trim(), description: description.trim(), color });
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span>Name</span>
        <input
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="e.g. Q3 Launch"
          aria-invalid={error !== null}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <label className="field">
        <span>Description</span>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project about?"
        />
      </label>

      <fieldset className="field">
        <legend>Color</legend>
        <div className="swatches">
          {PROJECT_COLORS.map((c) => (
            <label key={c.value} className="swatch" style={{ background: c.value }} title={c.name}>
              <input
                type="radio"
                name="color"
                value={c.value}
                checked={color === c.value}
                onChange={() => setColor(c.value)}
                aria-label={c.name}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <footer className="form-actions">
        <span className="spacer" />
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {initial ? 'Save changes' : 'Create project'}
        </button>
      </footer>
    </form>
  );
}
