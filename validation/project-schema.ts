import { z } from "zod";

export const projectSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(2000).optional(),
});

export type ProjectSchema = z.infer<typeof projectSchema>;
