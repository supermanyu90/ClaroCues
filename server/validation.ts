import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

const shortText = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => shortText(max).optional();

export const MAX_AUDIO_BASE64_CHARS = 14 * 1024 * 1024; // ~10 MB of audio
export const MAX_IMAGE_BASE64_CHARS = 3 * 1024 * 1024; // ~2.2 MB frame

export const mapsSearchSchema = z.object({
  query: optionalText(500),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
});

export const searchIntelligenceSchema = z.object({
  topic: optionalText(500),
  eventType: optionalText(60),
});

export const transcribeSchema = z.object({
  audioBase64: z.string().min(1).max(MAX_AUDIO_BASE64_CHARS).regex(BASE64, 'audioBase64 must be base64'),
  mimeType: z
    .enum(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/aac'])
    .default('audio/webm'),
});

export const planEventSchema = z.object({
  eventType: optionalText(120),
  guestCount: z.coerce.number().int().min(1).max(5000).default(100),
  budget: z.coerce.number().min(0).max(10_000_000).default(25000),
  venueType: optionalText(200),
  theme: optionalText(200),
  dhhRatio: z.coerce.number().min(0).max(100).optional(),
  specialRequests: optionalText(1500),
});

export const eventContextSchema = z
  .object({
    title: optionalText(200),
    eventType: optionalText(60),
    guestCount: z.number().int().min(0).max(5000).optional(),
    totalBudget: z.number().min(0).max(10_000_000).optional(),
    venueName: optionalText(200),
    theme: optionalText(200),
    dhhPercentage: z.number().min(0).max(100).optional(),
  })
  .optional();

export const assistantChatSchema = z.object({
  messages: z
    .array(
      z.object({
        sender: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      })
    )
    .min(1)
    .max(40),
  eventContext: eventContextSchema,
});

export const ideasSchema = z.object({
  eventType: optionalText(60),
  vibe: optionalText(300),
  guestCount: z.coerce.number().int().min(1).max(5000).default(100),
  budget: z.coerce.number().min(0).max(10_000_000).default(25000),
});

export const aslGlossSchema = z.object({
  text: z.string().trim().min(1, 'Text is required for ASL Gloss').max(1500),
  context: optionalText(200),
});

export const recognizeSignSchema = z.object({
  imageBase64: z.string().min(1).max(MAX_IMAGE_BASE64_CHARS).regex(BASE64, 'imageBase64 must be base64'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
});

export const liveTokenSchema = z.object({
  context: z.object({
    title: shortText(200).default(''),
    eventType: shortText(60).default(''),
    guestCount: z.number().int().min(0).max(5000).default(0),
    totalBudget: z.number().min(0).max(10_000_000).default(0),
    venueName: shortText(200).default(''),
  }),
});

declare module 'express-serve-static-core' {
  interface Request {
    valid?: unknown;
  }
}

/** Validates req.body against a schema, storing the parsed value on req.valid or replying 400. */
export function validateBody(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue?.path.join('.') || 'body';
      res.status(400).json({ error: `Invalid ${field}: ${issue?.message ?? 'bad request'}` });
      return;
    }
    req.valid = result.data;
    next();
  };
}
