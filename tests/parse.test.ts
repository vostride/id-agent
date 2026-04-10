import { describe, it, expect } from 'vitest'
import { parse, validate } from '../src/parse'

describe('parse readable IDs', () => {
  it('parses 8-word ID', () => {
    const result = parse('red-fox-run-big-cat-low-set-arm')
    expect(result).toEqual({
      prefix: undefined,
      words: ['red', 'fox', 'run', 'big', 'cat', 'low', 'set', 'arm'],
      wordCount: 8,
      bits: 96,
      raw: 'red-fox-run-big-cat-low-set-arm',
      format: 'readable',
    })
  })

  it('parses 4-word ID', () => {
    const result = parse('red-fox-run-big')
    expect(result).not.toBeNull()
    expect(result!.words).toEqual(['red', 'fox', 'run', 'big'])
    expect(result!.wordCount).toBe(4)
    expect(result!.format).toBe('readable')
  })

  it('parses 3-word ID', () => {
    const result = parse('red-fox-run')
    expect(result).not.toBeNull()
    expect(result!.wordCount).toBe(3)
    expect(result!.format).toBe('readable')
  })

  it('parses 2-word ID', () => {
    const result = parse('red-fox')
    expect(result).not.toBeNull()
    expect(result!.wordCount).toBe(2)
    expect(result!.format).toBe('readable')
  })

  it('parses readable with prefix', () => {
    const result = parse('task_red-fox-run-big')
    expect(result).not.toBeNull()
    expect(result!.prefix).toBe('task')
    expect(result!.words).toEqual(['red', 'fox', 'run', 'big'])
    expect(result!.wordCount).toBe(4)
    expect(result!.bits).toBe(48)
    expect(result!.raw).toBe('task_red-fox-run-big')
    expect(result!.format).toBe('readable')
  })
})

describe('parse underscore-separated IDs', () => {
  it('parses prefix with underscore-separated words', () => {
    const result = parse('task_storm_delta_stone')
    expect(result).not.toBeNull()
    expect(result!.prefix).toBe('task')
    expect(result!.words).toEqual(['storm', 'delta', 'stone'])
    expect(result!.wordCount).toBe(3)
    expect(result!.bits).toBe(36)
    expect(result!.format).toBe('readable')
  })

  it('parses mixed hyphen and underscore in body', () => {
    const result = parse('task_storm-delta_stone')
    expect(result).not.toBeNull()
    expect(result!.prefix).toBe('task')
    expect(result!.words).toEqual(['storm', 'delta', 'stone'])
  })

  it('still parses hyphen-separated body after prefix', () => {
    const result = parse('task_storm-delta-stone')
    expect(result).not.toBeNull()
    expect(result!.prefix).toBe('task')
    expect(result!.words).toEqual(['storm', 'delta', 'stone'])
  })
})

describe('parse prefix extraction', () => {
  it('extracts prefix before underscore', () => {
    const result = parse('task_red-fox')
    expect(result).not.toBeNull()
    expect(result!.prefix).toBe('task')
  })

  it('returns undefined prefix when no underscore', () => {
    const result = parse('red-fox-run')
    expect(result).not.toBeNull()
    expect(result!.prefix).toBeUndefined()
  })

  it('handles prefix with readable body', () => {
    const result = parse('msg_big-cat-run')
    expect(result).not.toBeNull()
    expect(result!.prefix).toBe('msg')
    expect(result!.format).toBe('readable')
  })
})

describe('parse edge cases', () => {
  it('returns null for empty string', () => {
    expect(parse('')).toBeNull()
  })

  it('returns null for non-string input', () => {
    expect(parse(undefined as any)).toBeNull()
    expect(parse(null as any)).toBeNull()
    expect(parse(123 as any)).toBeNull()
  })

  it('returns null for uppercase', () => {
    expect(parse('UPPERCASE')).toBeNull()
  })

  it('returns null for mixed case', () => {
    expect(parse('Red-Fox')).toBeNull()
  })

  it('returns null for special characters', () => {
    expect(parse('!!!invalid!!!')).toBeNull()
  })

  it('returns null for spaces', () => {
    expect(parse('has spaces')).toBeNull()
  })

  it('returns null when body is empty after prefix', () => {
    expect(parse('prefix_')).toBeNull()
  })

  it('parses single-word body (words: 1)', () => {
    const result = parse('storm')
    expect(result).not.toBeNull()
    expect(result!.wordCount).toBe(1)
    expect(result!.words).toEqual(['storm'])
    expect(result!.bits).toBe(12)
    expect(result!.format).toBe('readable')
    expect(result!.prefix).toBeUndefined()
  })

  it('parses single-word body with prefix', () => {
    const result = parse('task_storm')
    expect(result).not.toBeNull()
    expect(result!.prefix).toBe('task')
    expect(result!.words).toEqual(['storm'])
    expect(result!.wordCount).toBe(1)
  })

  it('handles underscore at start (no prefix)', () => {
    expect(parse('_body')).toBeNull()
  })
})

describe('parse bits calculation', () => {
  it('readable: bits = wordCount * 12', () => {
    const r4 = parse('red-fox-run-big')
    expect(r4!.bits).toBe(48)

    const r8 = parse('red-fox-run-big-cat-low-set-arm')
    expect(r8!.bits).toBe(96)
  })
})

describe('validate single-word', () => {
  it('validates single-word ID when word is in WORDLIST', () => {
    const result = validate('ace')
    expect(result.valid).toBe(true)
    expect(result.wordCount).toBe(1)
  })
})

describe('validate wordlist checking', () => {
  it('rejects IDs with words not in WORDLIST', () => {
    const result = validate('task_jump-jun-pandey')
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('unknown words')
  })

  it('accepts IDs where all words are in WORDLIST', () => {
    const result = validate('ace-age-aim')
    expect(result.valid).toBe(true)
  })

  it('reports specific unknown words', () => {
    const result = validate('ace-zzzznotaword')
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('zzzznotaword')
  })
})

describe('validate valid IDs', () => {
  it('validates readable ID', () => {
    const result = validate('ace-age-aim-arm')
    expect(result).toEqual({
      valid: true,
      prefix: undefined,
      wordCount: 4,
    })
  })

  it('validates readable with prefix', () => {
    const result = validate('task_red-fox')
    expect(result.valid).toBe(true)
    expect(result.prefix).toBe('task')
    expect(result.wordCount).toBe(2)
  })
})

describe('validate invalid IDs', () => {
  it('rejects empty string', () => {
    const result = validate('')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('empty string')
  })

  it('rejects non-string input', () => {
    const result = validate(undefined as any)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('empty string')
  })

  it('rejects uppercase', () => {
    const result = validate('HAS-UPPER')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/uppercase|invalid/i)
  })

  it('rejects special characters', () => {
    const result = validate('!!!')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/invalid/i)
  })

  it('rejects spaces', () => {
    const result = validate('has spaces')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/invalid/i)
  })
})

describe('validate return shape', () => {
  it('valid result has prefix and wordCount, no reason', () => {
    const result = validate('ace-age-aim')
    expect(result.valid).toBe(true)
    expect(result).toHaveProperty('prefix')
    expect(result).toHaveProperty('wordCount')
    expect(result.reason).toBeUndefined()
  })

  it('invalid result has reason, no prefix/wordCount', () => {
    const result = validate('')
    expect(result.valid).toBe(false)
    expect(result).toHaveProperty('reason')
    expect(result.prefix).toBeUndefined()
    expect(result.wordCount).toBeUndefined()
  })
})
