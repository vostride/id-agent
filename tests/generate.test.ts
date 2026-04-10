import { describe, it, expect } from 'vitest'
import { idAgent } from '../src/generate'
import { WORDLIST } from '../src/wordlist'
import { parse, validate } from '../src/parse'

describe('random readable generation', () => {
  it('returns 8 hyphen-separated words by default', () => {
    const id = idAgent()
    const parts = id.split('-')
    expect(parts).toHaveLength(8)
  })

  it('matches expected pattern', () => {
    const id = idAgent()
    expect(id).toMatch(/^[a-z]+-[a-z]+-[a-z]+-[a-z]+-[a-z]+-[a-z]+-[a-z]+-[a-z]+$/)
  })

  it('every word exists in WORDLIST', () => {
    const id = idAgent()
    const words = id.split('-')
    for (const w of words) {
      expect(WORDLIST).toContain(w)
    }
  })

  it('two calls return different strings', () => {
    const a = idAgent()
    const b = idAgent()
    expect(a).not.toBe(b)
  })
})

describe('prefix handling', () => {
  it('prepends prefix with underscore separator', () => {
    const id = idAgent({ prefix: 'task' })
    expect(id).toMatch(/^task_[a-z]+(-[a-z]+){7}$/)
  })

  it('works with different prefix values', () => {
    const id = idAgent({ prefix: 'test' })
    expect(id.startsWith('test_')).toBe(true)
  })

  it('no prefix means no underscore', () => {
    const id = idAgent()
    expect(id).not.toContain('_')
  })
})

describe('words parameter', () => {
  it('generates 3 words when words: 3', () => {
    const id = idAgent({ words: 3 })
    expect(id.split('-')).toHaveLength(3)
  })

  it('generates 1 word when words: 1', () => {
    const id = idAgent({ words: 1 })
    expect(id).not.toContain('-')
    expect(WORDLIST).toContain(id)
  })

  it('generates 12 words when words: 12', () => {
    const id = idAgent({ words: 12 })
    expect(id.split('-')).toHaveLength(12)
  })
})

describe('input validation', () => {
  it('throws for words: 0', () => {
    expect(() => idAgent({ words: 0 })).toThrow()
  })

  it('throws for negative words', () => {
    expect(() => idAgent({ words: -5 })).toThrow()
  })

  it('throws for words exceeding 16', () => {
    expect(() => idAgent({ words: 17 })).toThrow()
  })

  it('throws for non-integer words', () => {
    expect(() => idAgent({ words: 3.5 })).toThrow()
  })

  it('throws for uppercase prefix', () => {
    expect(() => idAgent({ prefix: 'TASK' })).toThrow()
  })

  it('throws for prefix with special chars', () => {
    expect(() => idAgent({ prefix: 'my-task' })).toThrow()
  })

  it('throws when mode is passed (unknown key)', () => {
    expect(() => idAgent({ mode: 'short' } as any)).toThrow()
  })
})

describe('function shape', () => {
  it('idAgent.from exists as a function', () => {
    expect(typeof idAgent.from).toBe('function')
  })
})

describe('WORDLIST immutability', () => {
  it('WORDLIST is frozen', () => {
    expect(Object.isFrozen(WORDLIST)).toBe(true)
  })
})

describe('round-trip: generate -> parse -> validate', () => {
  it('round-trips for words 1 through 10', () => {
    for (const words of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const id = idAgent({ words })
      const parsed = parse(id)
      expect(parsed, `parse failed for words=${words}, id="${id}"`).not.toBeNull()
      expect(parsed!.wordCount).toBe(words)
      const valid = validate(id)
      expect(valid.valid, `validate failed for words=${words}, id="${id}"`).toBe(true)
    }
  })

  it('round-trips with prefix for words 1 through 10', () => {
    for (const words of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const id = idAgent({ prefix: 'task', words })
      const parsed = parse(id)
      expect(parsed, `parse failed for prefix+words=${words}, id="${id}"`).not.toBeNull()
      expect(parsed!.prefix).toBe('task')
      expect(parsed!.wordCount).toBe(words)
      const valid = validate(id)
      expect(valid.valid, `validate failed for prefix+words=${words}, id="${id}"`).toBe(true)
    }
  })

  it('round-trips deterministic IDs through parse and validate', async () => {
    const id = await idAgent.from('test-input')
    expect(parse(id)).not.toBeNull()
    expect(validate(id).valid).toBe(true)

    const prefixed = await idAgent.from('test-input', { prefix: 'task', words: 5 })
    const parsed = parse(prefixed)
    expect(parsed).not.toBeNull()
    expect(parsed!.prefix).toBe('task')
    expect(parsed!.wordCount).toBe(5)
    expect(validate(prefixed).valid).toBe(true)
  })
})
