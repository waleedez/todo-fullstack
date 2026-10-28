import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodoForm } from '../components/TodoForm';
import type { Tag } from '../types';

const tags: Tag[] = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Work', color: '#ef4444' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Home', color: '#10b981' },
];

describe('TodoForm', () => {
  it('submits the entered values', async () => {
    const user = userEvent.setup();
    const submitted: unknown[] = [];

    render(
      <TodoForm
        tags={tags}
        onSubmit={async (values) => {
          submitted.push(values);
        }}
      />,
    );

    await user.type(screen.getByLabelText('Todo title'), 'Write the docs');
    await user.type(screen.getByLabelText('Todo notes'), 'Cover the API');
    await user.selectOptions(screen.getByRole('combobox'), 'high');
    await user.click(screen.getByRole('button', { name: 'Work' }));
    await user.click(screen.getByRole('button', { name: 'Add todo' }));

    expect(submitted).toEqual([
      {
        title: 'Write the docs',
        notes: 'Cover the API',
        priority: 'high',
        dueDate: null,
        tagIds: [tags[0].id],
      },
    ]);
  });

  it('blocks submission when the title is blank', async () => {
    const user = userEvent.setup();
    let called = false;

    render(
      <TodoForm
        tags={[]}
        onSubmit={async () => {
          called = true;
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add todo' }));

    expect(called).toBe(false);
    expect(await screen.findByRole('alert')).toHaveTextContent('Title is required');
  });

  it('clears the form after a successful create', async () => {
    const user = userEvent.setup();

    render(<TodoForm tags={[]} onSubmit={async () => {}} />);

    const title = screen.getByLabelText('Todo title');
    await user.type(title, 'Temporary');
    await user.click(screen.getByRole('button', { name: 'Add todo' }));

    expect(title).toHaveValue('');
  });
});
