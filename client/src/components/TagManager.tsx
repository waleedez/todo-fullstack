import { useState } from 'react';
import type { Tag } from '../types';

interface TagManagerProps {
  tags: Tag[];
  activeTagIds: string[];
  onToggle: (id: string) => void;
  onCreate: (name: string, color: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

const PALETTE = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#0ea5e9', '#a855f7'];

export function TagManager({ tags, activeTagIds, onToggle, onCreate, onDelete }: TagManagerProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await onCreate(name.trim(), color);
      setName('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the tag');
    }
  }

  return (
    <section className="panel">
      <h2 className="panel__title">Tags</h2>

      <form className="tag-form" onSubmit={handleCreate}>
        <input
          className="field__input"
          type="text"
          placeholder="New tag"
          aria-label="New tag name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="tag-form__colors" role="radiogroup" aria-label="Tag color">
          {PALETTE.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={color === option}
              aria-label={`Color ${option}`}
              className={`swatch${color === option ? ' swatch--active' : ''}`}
              style={{ background: option }}
              onClick={() => setColor(option)}
            />
          ))}
        </div>
        <button className="button button--primary button--small" type="submit">
          Add tag
        </button>
      </form>

      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}

      {tags.length === 0 ? (
        <p className="muted">No tags yet.</p>
      ) : (
        <ul className="tag-list">
          {tags.map((tag) => (
            <li key={tag.id} className="tag-list__item">
              <button
                type="button"
                className={`tag-chip${activeTagIds.includes(tag.id) ? ' tag-chip--selected' : ''}`}
                style={{ '--tag-color': tag.color } as React.CSSProperties}
                aria-pressed={activeTagIds.includes(tag.id)}
                onClick={() => onToggle(tag.id)}
              >
                {tag.name}
              </button>
              <button
                type="button"
                className="button button--icon button--danger"
                aria-label={`Delete tag ${tag.name}`}
                onClick={() => void onDelete(tag.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
