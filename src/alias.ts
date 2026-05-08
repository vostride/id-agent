import { selectRandomWords } from './crypto'
import { AliasOptionsSchema } from './schemas'
import type { AliasMap, AliasOptions } from './types'
import { WORDLIST } from './wordlist'

export function createAliasMap(opts: AliasOptions): AliasMap {
  const { words, allowCollision } = AliasOptionsSchema.parse(opts)
  const forward = new Map<string, string>()
  const reverse = new Map<string, string>()

  function buildReplacementRegex(keys: string[]): RegExp | null {
    if (keys.length === 0) return null
    const sorted = [...keys].sort((a, b) => b.length - a.length)
    const escaped = sorted.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    return new RegExp(escaped.join('|'), 'g')
  }

  return {
    set(original: string): string {
      const existing = forward.get(original)
      if (existing) return existing
      let alias: string
      do {
        alias = selectRandomWords(words, WORDLIST).join('-')
      } while (reverse.has(alias) && !allowCollision)
      forward.set(original, alias)
      reverse.set(alias, original)
      return alias
    },

    get(alias: string): string | undefined {
      return reverse.get(alias)
    },

    replace(text: string, replaceOpts?: { pattern?: RegExp }): string {
      if (replaceOpts?.pattern) {
        const matches = new Set<string>()
        for (const m of text.matchAll(replaceOpts.pattern)) {
          matches.add(m[0])
        }
        for (const match of matches) {
          this.set(match)
        }
      }
      const regex = buildReplacementRegex([...forward.keys()])
      if (!regex) return text
      return text.replace(regex, match => forward.get(match) ?? match)
    },

    restore(text: string): string {
      const regex = buildReplacementRegex([...reverse.keys()])
      if (!regex) return text
      return text.replace(regex, match => reverse.get(match) ?? match)
    },

    clear(): void {
      forward.clear()
      reverse.clear()
    },

    get size(): number {
      return forward.size
    },

    entries(): IterableIterator<[string, string]> {
      return forward.entries()
    },
  }
}
