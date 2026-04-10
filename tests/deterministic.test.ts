import { describe, it, expect } from 'vitest'
import { deterministicId } from '../src/deterministic'
import { idAgent } from '../src/generate'
import { idAgent as publicIdAgent } from '../src/index'
import { WORDLIST } from '../src/wordlist'

describe('determinism', () => {
  it('same input produces same output', async () => {
    const a = await deterministicId('hello')
    const b = await deterministicId('hello')
    expect(a).toBe(b)
  })

  it('returns 8 hyphen-separated words by default', async () => {
    const id = await deterministicId('hello')
    expect(id.split('-')).toHaveLength(8)
  })
})

describe('input variation', () => {
  it('different inputs produce different outputs', async () => {
    const a = await deterministicId('hello')
    const b = await deterministicId('world')
    expect(a).not.toBe(b)
  })
})

describe('namespace isolation', () => {
  it('same input + different namespace = different output', async () => {
    const a = await deterministicId('hello')
    const b = await deterministicId('hello', { namespace: 'acme' })
    expect(a).not.toBe(b)
  })

  it('same input + same namespace = same output', async () => {
    const a = await deterministicId('hello', { namespace: 'acme' })
    const b = await deterministicId('hello', { namespace: 'acme' })
    expect(a).toBe(b)
  })
})

describe('default namespace', () => {
  it('no namespace behaves identically to explicit undefined', async () => {
    const a = await deterministicId('hello')
    const b = await deterministicId('hello', { namespace: undefined })
    expect(a).toBe(b)
  })
})

describe('prefix', () => {
  it('prefix applied with underscore', async () => {
    const id = await deterministicId('hello', { prefix: 'task' })
    expect(id.startsWith('task_')).toBe(true)
  })

  it('prefix does not affect word count', async () => {
    const id = await deterministicId('hello', { prefix: 'task' })
    const body = id.slice(id.indexOf('_') + 1)
    expect(body.split('-')).toHaveLength(8)
  })
})

describe('words parameter', () => {
  it('words: 3 produces 3 words', async () => {
    const id = await deterministicId('hello', { words: 3 })
    expect(id.split('-')).toHaveLength(3)
  })

  it('words: 8 produces 8 words (default)', async () => {
    const id = await deterministicId('hello', { words: 8 })
    expect(id.split('-')).toHaveLength(8)
  })

  it('words: 12 produces 12 words', async () => {
    const id = await deterministicId('hello', { words: 12 })
    expect(id.split('-')).toHaveLength(12)
  })
})

describe('word membership', () => {
  it('every word in output exists in WORDLIST', async () => {
    const id = await deterministicId('hello')
    const words = id.split('-')
    for (const w of words) {
      expect(WORDLIST).toContain(w)
    }
  })
})

describe('word limit', () => {
  it('words > 16 throws error', async () => {
    await expect(deterministicId('hello', { words: 17 }))
      .rejects.toThrow()
  })

  it('words: 16 works (max)', async () => {
    const id = await deterministicId('hello', { words: 16 })
    expect(id.split('-')).toHaveLength(16)
  })
})

describe('async', () => {
  it('return value is a Promise', () => {
    const result = deterministicId('hello')
    expect(result).toBeInstanceOf(Promise)
  })
})

describe('from() input validation', () => {
  it('throws on empty string', async () => {
    await expect(idAgent.from('')).rejects.toThrow('non-empty string')
  })

  it('throws on undefined', async () => {
    await expect(idAgent.from(undefined as any)).rejects.toThrow('non-empty string')
  })

  it('throws on null', async () => {
    await expect(idAgent.from(null as any)).rejects.toThrow('non-empty string')
  })

  it('throws on number', async () => {
    await expect(idAgent.from(123 as any)).rejects.toThrow('non-empty string')
  })
})

describe('idAgent.from() integration', () => {
  it('returns a string of 8 words', async () => {
    const id = await idAgent.from('test')
    expect(typeof id).toBe('string')
    expect(id.split('-')).toHaveLength(8)
  })

  it('is deterministic (same input = same output)', async () => {
    const a = await idAgent.from('test')
    const b = await idAgent.from('test')
    expect(a).toBe(b)
  })

  it('applies prefix with underscore', async () => {
    const id = await idAgent.from('test', { prefix: 'job' })
    expect(id.startsWith('job_')).toBe(true)
  })

  it('namespace produces different output', async () => {
    const a = await idAgent.from('test')
    const b = await idAgent.from('test', { namespace: 'ns1' })
    expect(a).not.toBe(b)
  })

  it('words parameter controls word count', async () => {
    const id = await idAgent.from('test', { words: 5 })
    expect(id.split('-')).toHaveLength(5)
  })

  it('public export has working .from()', async () => {
    const id = await publicIdAgent.from('test')
    expect(typeof id).toBe('string')
    expect(id.split('-')).toHaveLength(8)
  })
})
