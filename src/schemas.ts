import * as z from 'zod/mini'

export const PrefixSchema = z.string().check(
  z.regex(/^[a-z0-9]+$/, { error: 'prefix must be lowercase alphanumeric' }),
)

export const WordsSchema = z.number().check(
  z.int({ error: 'words must be an integer' }),
  z.minimum(1, { error: 'words must be at least 1' }),
  z.maximum(16, { error: 'words must be at most 16' }),
)

export const IdAgentOptionsSchema = z.strictObject({
  prefix: z.optional(PrefixSchema),
  words: z.optional(WordsSchema),
})

export const IdAgentFromOptionsSchema = z.strictObject({
  prefix: z.optional(PrefixSchema),
  words: z.optional(WordsSchema),
  namespace: z.optional(z.string()),
})

export const AliasOptionsSchema = z.strictObject({
  words: WordsSchema,
  allowCollision: z.optional(z.boolean()),
})
