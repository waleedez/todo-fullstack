import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import type { Filter, SortBy, Tag, Todo, TodoInput, TodoPatch } from './types';

const PRIORITY_WEIGHT: Record<Todo['priority'], number> = { high: 0, medium: 1, low: 2 };

export function useTodos(enabled: boolean) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<Filter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('manual');
  const [search, setSearch] = useState('');
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [todoData, tagData] = await Promise.all([
        api.get<{ todos: Todo[] }>('/todos'),
        api.get<{ tags: Tag[] }>('/tags'),
      ]);
      setTodos(todoData.todos);
      setTags(tagData.tags);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load todos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  const createTodo = useCallback(async (input: TodoInput) => {
    const data = await api.post<{ todo: Todo }>('/todos', input);
    setTodos((current) => [...current, data.todo]);
    return data.todo;
  }, []);

  const updateTodo = useCallback(async (id: string, patch: TodoPatch) => {
    const data = await api.patch<{ todo: Todo }>(`/todos/${id}`, patch);
    setTodos((current) => current.map((todo) => (todo.id === id ? data.todo : todo)));
    return data.todo;
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    await api.delete(`/todos/${id}`);
    setTodos((current) => current.filter((todo) => todo.id !== id));
  }, []);

  const reorderTodos = useCallback(async (orderedIds: string[]) => {
    const data = await api.patch<{ todos: Todo[] }>('/todos/reorder', { orderedIds });
    setTodos(data.todos);
  }, []);

  const createTag = useCallback(async (name: string, color: string) => {
    const data = await api.post<{ tag: Tag }>('/tags', { name, color });
    setTags((current) => [...current, data.tag].sort((a, b) => a.name.localeCompare(b.name)));
    return data.tag;
  }, []);

  const deleteTag = useCallback(async (id: string) => {
    await api.delete(`/tags/${id}`);
    setTags((current) => current.filter((tag) => tag.id !== id));
    setTodos((current) =>
      current.map((todo) => ({ ...todo, tags: todo.tags.filter((tag) => tag.id !== id) })),
    );
    setActiveTagIds((current) => current.filter((tagId) => tagId !== id));
  }, []);

  const toggleTagFilter = useCallback((id: string) => {
    setActiveTagIds((current) =>
      current.includes(id) ? current.filter((tagId) => tagId !== id) : [...current, id],
    );
  }, []);

  const visibleTodos = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = todos.filter((todo) => {
      if (filter === 'active' && todo.completed) return false;
      if (filter === 'completed' && !todo.completed) return false;

      if (activeTagIds.length > 0) {
        const todoTagIds = todo.tags.map((tag) => tag.id);
        if (!activeTagIds.every((tagId) => todoTagIds.includes(tagId))) return false;
      }

      if (term) {
        const haystack = `${todo.title} ${todo.notes ?? ''} ${todo.tags
          .map((tag) => tag.name)
          .join(' ')}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      return true;
    });

    if (sortBy === 'manual') {
      return [...filtered].sort((a, b) => a.position - b.position);
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return a.position - b.position;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortBy === 'priority') {
        const diff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
        return diff !== 0 ? diff : a.position - b.position;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [todos, filter, activeTagIds, search, sortBy]);

  const stats = useMemo(() => {
    const completed = todos.filter((todo) => todo.completed).length;
    return { total: todos.length, completed, active: todos.length - completed };
  }, [todos]);

  return {
    todos,
    visibleTodos,
    tags,
    loading,
    error,
    stats,
    filter,
    setFilter,
    sortBy,
    setSortBy,
    search,
    setSearch,
    activeTagIds,
    toggleTagFilter,
    clearTagFilters: () => setActiveTagIds([]),
    refresh,
    createTodo,
    updateTodo,
    deleteTodo,
    reorderTodos,
    createTag,
    deleteTag,
  };
}
