import type { Request, Response } from 'express';
import type { z } from 'zod';

/** Typed access to the body parsed by validateBody(schema). */
export const validated = <S extends z.ZodType>(req: Request, _schema: S) => req.valid as z.infer<S>;

export const sendUnavailable = (res: Response, feature: string) =>
  res.status(503).json({ error: `${feature} needs the Gemini API. Set GEMINI_API_KEY on the server to enable it.` });
