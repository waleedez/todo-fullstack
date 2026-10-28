import { useState } from 'react';
import type { Priority, Tag } from '../types';

export interface TodoFormValues {
  title: string;
  notes: string | null;
  priority: Priority;
  dueDate: string | null;
  tagIds: string[];
}

interface TodoFormProps {
  tags: Tag[];
  onSubmit: (input: TodoFormValues) => Promise<void>;
  onCancel?: () => void;
  initial?: TodoFormValues;
  submitLabel?: string;
}

export function TodoForm({
  tags,
  onSubmit,
  onCancel,
  initial,
  submitLabel = 'Add todo',
}: TodoFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [tagIds, setTagIds] = useState<string[]>(initial?.tagIds ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(id: string) {
    setTagIds((current) =>
      current.includes(id) ? current.filter((tagId) => tagId !== id) : [...current, id],
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        notes: notes.trim() ? notes.trim() : null,
        priority,
        dueDate: dueDate || null,
        tagIds,
      });
      if (!initial) {
        setTitle('');
        setNotes('');
        setPriority('medium');
        setDueDate('');
        setTagIds([]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the todo');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="todo-form" onSubmit={handleSubmit}>
      <input
        className="field__input todo-form__title"
        type="text"
        placeholder="What needs to be done?"
        aria-label="Todo title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />

      <textarea
        className="field__input todo-form__notes"
        placeholder="Notes (optional)"
        aria-label="Todo notes"
        rows={2}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />

      <div className="todo-form__row">
        <label className="field field--inline">
          <span className="field__label">Priority</span>
          <select
            className="field__input"
            value={priority}
            onChange={(event) => setPriority(event.target.value as Priority)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className="field field--inline">
          <span className="field__label">Due date</span>
          <input
            className="field__input"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>
      </div>

      {tags.length > 0 && (
        <fieldset className="todo-form__tags">
          <legend className="field__label">Tags</legend>
          <div className="tag-picker">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`tag-chip${tagIds.includes(tag.id) ? ' tag-chip--selected' : ''}`}
                style={{ '--tag-color': tag.color } as React.CSSProperties}
                aria-pressed={tagIds.includes(tag.id)}
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}

      <div className="todo-form__actions">
        <button className="button button--primary" type="submit" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button className="button button--ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
