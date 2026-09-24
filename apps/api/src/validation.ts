import type { RequestHandler } from 'express';
import { z, type ZodTypeAny } from 'zod';

export const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(80).optional()
}).strict();

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) return response.status(400).json({ error: 'Invalid request body', code: 'INVALID_INPUT', details: result.error.flatten().fieldErrors });
    request.body = result.data;
    return next();
  };
}

export function validateParam(name: string, schema: ZodTypeAny): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request.params[name]);
    if (!result.success) return response.status(400).json({ error: `Invalid ${name}`, code: 'INVALID_INPUT' });
    return next();
  };
}