import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodoList } from '../components/TodoList';
import type { Tag, Todo } from '../types';

const allTags: Tag[] = [
  { id: 't1', name: 'Work', color: '#ef4444' },
  { id: 't2', name: 'Home', color: '#10b981' },
];

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    title: 'Sample',
    notes: null,
    completed: false,
    priority: 'medium',
    dueDate: null,
    position: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    tags: [],
    ...overrides,
  };
}

describe('TodoList', () => {
  it('shows an empty state when there are no todos', () => {
    render(
      <TodoList
        tags={allTags}
        todos={[]}
        canReorder
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('renders todos with their metadata', () => {
    render(
      <TodoList
        tags={allTags}
        todos={[
          makeTodo({
            title: 'Ship it',
            priority: 'high',
            dueDate: '2026-11-01',
            tags: [{ id: 't1', name: 'Work', color: '#ef4444' }],
          }),
        ]}
        canReorder
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    expect(screen.getByText('Ship it')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText(/Due/)).toBeInTheDocument();
  });

  it('toggles completion through the checkbox', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);

    render(
      <TodoList
        tags={allTags}
        todos={[makeTodo({ title: 'Toggle me' })]}
        canReorder
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('checkbox'));

    expect(onUpdate).toHaveBeenCalledWith('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', {
      completed: true,
    });
  });

  it('deletes a todo', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);

    render(
      <TodoList
        tags={allTags}
        todos={[makeTodo({ title: 'Remove me' })]}
        canReorder
        onUpdate={vi.fn()}
        onDelete={onDelete}
        onReorder={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete Remove me' }));

    expect(onDelete).toHaveBeenCalledWith('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  });

  it('hides the drag handle when reordering is disabled', () => {
    render(
      <TodoList
        tags={allTags}
        todos={[makeTodo({ title: 'Fixed' })]}
        canReorder={false}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Reorder Fixed' })).not.toBeInTheDocument();
  });

  it('edits a todo and can change its tags', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);

    render(
      <TodoList
        tags={allTags}
        todos={[
          makeTodo({
            title: 'Tag me',
            tags: [{ id: 't1', name: 'Work', color: '#ef4444' }],
          }),
        ]}
        canReorder
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit Tag me' }));

    const work = screen.getByRole('button', { name: 'Work' });
    const home = screen.getByRole('button', { name: 'Home' });
    expect(work).toHaveAttribute('aria-pressed', 'true');
    expect(home).toHaveAttribute('aria-pressed', 'false');

    await user.click(work);
    await user.click(home);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onUpdate).toHaveBeenCalledWith('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', {
      title: 'Tag me',
      notes: null,
      priority: 'medium',
      dueDate: null,
      tagIds: ['t2'],
    });
  });

  it('offers every tag in the edit form, not just the assigned ones', async () => {
    const user = userEvent.setup();

    render(
      <TodoList
        tags={allTags}
        todos={[makeTodo({ title: 'Untagged' })]}
        canReorder
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit Untagged' }));

    expect(screen.getByRole('button', { name: 'Work' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
  });
});
