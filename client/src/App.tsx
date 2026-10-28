import { useAuth } from './auth';
import { AuthScreen } from './components/AuthScreen';
import { TagManager } from './components/TagManager';
import { TodoForm } from './components/TodoForm';
import { TodoList } from './components/TodoList';
import { useTheme } from './theme';
import { useTodos } from './useTodos';
import type { Filter, SortBy } from './types';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

const SORTS: { value: SortBy; label: string }[] = [
  { value: 'manual', label: 'Manual order' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Newest first' },
];

export default function App() {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (loading) {
    return (
      <div className="centered">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return <TodoApp email={user.email} onLogout={logout} theme={theme} onToggleTheme={toggleTheme} />;
}

interface TodoAppProps {
  email: string;
  onLogout: () => Promise<void>;
  theme: string;
  onToggleTheme: () => void;
}

function TodoApp({ email, onLogout, theme, onToggleTheme }: TodoAppProps) {
  const {
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
    clearTagFilters,
    createTodo,
    updateTodo,
    deleteTodo,
    reorderTodos,
    createTag,
    deleteTag,
  } = useTodos(true);

  const canReorder = sortBy === 'manual' && search.trim() === '' && activeTagIds.length === 0;

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">todo26</h1>
          <p className="muted">
            {stats.active} active · {stats.completed} completed · {stats.total} total
          </p>
        </div>
        <div className="app__header-actions">
          <span className="muted app__email">{email}</span>
          <button
            className="button button--ghost button--small"
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? '☀ Light' : '☾ Dark'}
          </button>
          <button
            className="button button--ghost button--small"
            type="button"
            onClick={() => void onLogout()}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="app__main">
        <div className="app__content">
          <section className="panel">
            <h2 className="panel__title">Add a todo</h2>
            <TodoForm tags={tags} onSubmit={async (values) => void (await createTodo(values))} />
          </section>

          <section className="panel">
            <div className="toolbar">
              <div className="toolbar__group" role="tablist" aria-label="Filter todos">
                {FILTERS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={filter === option.value}
                    className={`button button--tab${filter === option.value ? ' is-active' : ''}`}
                    onClick={() => setFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <input
                className="field__input toolbar__search"
                type="search"
                placeholder="Search todos…"
                aria-label="Search todos"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <label className="field field--inline">
                <span className="field__label">Sort</span>
                <select
                  className="field__input"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortBy)}
                >
                  {SORTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {activeTagIds.length > 0 && (
              <div className="toolbar__filters">
                <span className="muted">Filtered by tags</span>
                <button className="button button--link" type="button" onClick={clearTagFilters}>
                  Clear
                </button>
              </div>
            )}

            {error && (
              <p className="alert alert--error" role="alert">
                {error}
              </p>
            )}

            {loading ? (
              <p className="muted">Loading todos…</p>
            ) : (
              <TodoList
                todos={visibleTodos}
                tags={tags}
                canReorder={canReorder}
                onUpdate={updateTodo}
                onDelete={deleteTodo}
                onReorder={reorderTodos}
              />
            )}

            {!canReorder && visibleTodos.length > 1 && (
              <p className="muted hint">
                Switch to “Manual order” and clear filters to drag and reorder.
              </p>
            )}
          </section>
        </div>

        <aside className="app__sidebar">
          <TagManager
            tags={tags}
            activeTagIds={activeTagIds}
            onToggle={toggleTagFilter}
            onCreate={createTag}
            onDelete={deleteTag}
          />
        </aside>
      </main>
    </div>
  );
}
