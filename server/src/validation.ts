import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .min(3, 'Email is required')
  .max(254, 'Email is too long')
  .email('Enter a valid email address')
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(200, 'Password is too long');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(200),
});

export const prioritySchema = z.enum(['low', 'medium', 'high']);

const hexColor = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a hex value like #6366f1');

export const tagNameSchema = z.string().trim().min(1, 'Tag name is required').max(40);

export const createTagSchema = z.object({
  name: tagNameSchema,
  color: hexColor.optional(),
});

export const updateTagSchema = z
  .object({
    name: tagNameSchema.optional(),
    color: hexColor.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must use the YYYY-MM-DD format');

export const createTodoSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
  notes: z.string().trim().max(2000, 'Notes are too long').nullish(),
  priority: prioritySchema.default('medium'),
  dueDate: isoDate.nullish(),
  tagIds: z.array(z.string().uuid('Invalid tag id')).max(20).optional(),
});

export const updateTodoSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200).optional(),
    notes: z.string().trim().max(2000).nullish(),
    completed: z.boolean().optional(),
    priority: prioritySchema.optional(),
    dueDate: isoDate.nullish(),
    tagIds: z.array(z.string().uuid('Invalid tag id')).max(20).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid('Invalid todo id')).min(1, 'Provide at least one todo id'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
