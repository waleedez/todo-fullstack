export interface Tag {
  id: string;
  name: string;
  color: string;
}

export type Priority = 'low' | 'medium' | 'high';

export interface Todo {
  id: string;
  title: string;
  notes: string | null;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
}

export interface User {
  id: string;
  email: string;
}

export interface TodoInput {
  title: string;
  notes?: string | null;
  priority?: Priority;
  dueDate?: string | null;
  tagIds?: string[];
}

export type TodoPatch = Partial<{
  title: string;
  notes: string | null;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;
  tagIds: string[];
}>;

export type Filter = 'all' | 'active' | 'completed';
export type SortBy = 'manual' | 'dueDate' | 'priority' | 'created';
