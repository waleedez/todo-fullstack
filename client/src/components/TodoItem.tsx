import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import type { Tag, Todo, TodoPatch } from '../types';
import { TodoForm, type TodoFormValues } from './TodoForm';

interface TodoItemProps {
  todo: Todo;
  tags: Tag[];
  draggable: boolean;
  onUpdate: (id: string, patch: TodoPatch) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

function formatDueDate(dueDate: string): { label: string; state: 'overdue' | 'today' | 'future' } {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`;

  const label = new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  if (dueDate < todayKey) return { label, state: 'overdue' };
  if (dueDate === todayKey) return { label: 'Today', state: 'today' };
  return { label, state: 'future' };
}

export function TodoItem({ todo, tags, draggable, onUpdate, onDelete }: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: !draggable || editing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  async function handleToggle() {
    setBusy(true);
    try {
      await onUpdate(todo.id, { completed: !todo.completed });
    } finally {
      setBusy(false);
    }
  }

  async function handleEdit(values: TodoFormValues) {
    await onUpdate(todo.id, values);
    setEditing(false);
  }

  const due = todo.dueDate ? formatDueDate(todo.dueDate) : null;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`todo${todo.completed ? ' todo--completed' : ''}`}
      data-testid="todo-item"
    >
      {draggable && !editing && (
        <button
          className="todo__handle"
          type="button"
          aria-label={`Reorder ${todo.title}`}
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
      )}

      <input
        className="todo__checkbox"
        type="checkbox"
        checked={todo.completed}
        disabled={busy}
        aria-label={`Mark ${todo.title} as ${todo.completed ? 'active' : 'completed'}`}
        onChange={handleToggle}
      />

      {editing ? (
        <div className="todo__edit">
          <TodoForm
            tags={tags}
            compact
            initial={{
              title: todo.title,
              notes: todo.notes,
              priority: todo.priority,
              dueDate: todo.dueDate,
              tagIds: todo.tags.map((tag) => tag.id),
            }}
            submitLabel="Save"
            onSubmit={handleEdit}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          <div className="todo__body">
            <span className="todo__title">{todo.title}</span>
            {todo.notes && <p className="todo__notes">{todo.notes}</p>}
            <div className="todo__meta">
              <span className={`badge badge--${todo.priority}`}>{todo.priority}</span>
              {due && <span className={`badge badge--due-${due.state}`}>Due {due.label}</span>}
              {todo.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="tag-chip tag-chip--static"
                  style={{ '--tag-color': tag.color } as React.CSSProperties}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>

          <div className="todo__actions">
            <button
              className="button button--icon"
              type="button"
              aria-label={`Edit ${todo.title}`}
              onClick={() => setEditing(true)}
            >
              ✎
            </button>
            <button
              className="button button--icon button--danger"
              type="button"
              aria-label={`Delete ${todo.title}`}
              onClick={() => void onDelete(todo.id)}
            >
              ✕
            </button>
          </div>
        </>
      )}
    </li>
  );
}
