export type IdAgentOptions = {
  prefix?: string
  words?: number
}

export type IdAgentFromOptions = {
  prefix?: string
  words?: number
  namespace?: string
}

export type IdAgent = {
  (opts?: IdAgentOptions): string
  from(input: string, opts?: IdAgentFromOptions): Promise<string>
}

export type ParsedId = {
  prefix: string | undefined
  words: string[]
  wordCount: number
  bits: number
  raw: string
  format: 'readable'
}

export type ValidateResult = {
  valid: boolean
  prefix?: string
  wordCount?: number
  reason?: string
}

export type AliasOptions = {
  words: number
  allowCollision?: boolean
}

export type AliasMap = {
  set(original: string): string
  get(alias: string): string | undefined
  replace(text: string, opts?: { pattern?: RegExp }): string
  restore(text: string): string
  clear(): void
  readonly size: number
  entries(): IterableIterator<[string, string]>
}

export type Duplicate = {
  id: string
  count: number
}

export type DetectOptions = {
  pattern: RegExp
  text: string | string[]
}
