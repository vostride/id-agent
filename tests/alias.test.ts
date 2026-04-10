import { describe, it, expect } from 'vitest'
import { createAliasMap } from '../src/alias'
import { WORDLIST } from '../src/wordlist'

describe('createAliasMap', () => {
  it('requires words parameter', () => {
    expect(() => (createAliasMap as any)()).toThrow()
    expect(() => (createAliasMap as any)({})).toThrow()
  })

  it('generates word-based aliases from WORDLIST', () => {
    const map = createAliasMap({ words: 3 })
    const alias = map.set('some-uuid')
    const parts = alias.split('-')
    expect(parts).toHaveLength(3)
    for (const word of parts) {
      expect(WORDLIST).toContain(word)
    }
  })

  it('is idempotent - same original returns same alias', () => {
    const map = createAliasMap({ words: 3 })
    const a1 = map.set('uuid-abc')
    const a2 = map.set('uuid-abc')
    expect(a1).toBe(a2)
    expect(map.size).toBe(1)
  })

  it('get() returns original by alias', () => {
    const map = createAliasMap({ words: 3 })
    const alias = map.set('uuid-abc-123')
    expect(map.get(alias)).toBe('uuid-abc-123')
  })

  it('get() returns undefined for unknown alias', () => {
    const map = createAliasMap({ words: 3 })
    expect(map.get('unknown')).toBeUndefined()
  })

  it('size returns count of mappings', () => {
    const map = createAliasMap({ words: 3 })
    expect(map.size).toBe(0)
    map.set('a')
    map.set('b')
    expect(map.size).toBe(2)
  })

  it('entries() returns [original, alias] pairs', () => {
    const map = createAliasMap({ words: 2 })
    map.set('orig-1')
    map.set('orig-2')
    const entries = [...map.entries()]
    expect(entries).toHaveLength(2)
    expect(entries[0][0]).toBe('orig-1')
    expect(entries[1][0]).toBe('orig-2')
  })

  it('clear() resets all mappings', () => {
    const map = createAliasMap({ words: 3 })
    map.set('a')
    map.set('b')
    map.clear()
    expect(map.size).toBe(0)
  })

  it('all aliases within a session are unique', () => {
    const map = createAliasMap({ words: 3 })
    const aliases = new Set<string>()
    for (let i = 0; i < 50; i++) {
      aliases.add(map.set(`id-${i}`))
    }
    expect(aliases.size).toBe(50)
  })
})

describe('collision detection', () => {
  it('default: regenerates alias on collision (no silent overwrite)', () => {
    const map = createAliasMap({ words: 2 })
    const aliases = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const alias = map.set(`id-${i}`)
      expect(aliases.has(alias)).toBe(false)
      aliases.add(alias)
    }
  })

  it('allowCollision: true is accepted without error', () => {
    const map = createAliasMap({ words: 2, allowCollision: true })
    const alias = map.set('test-id')
    expect(alias).toBeTruthy()
  })
})

describe('replace()', () => {
  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g

  it('auto-registers pattern matches and replaces them', () => {
    const map = createAliasMap({ words: 2 })
    const text = 'User dc193952-186a-4645-a2c4-ebdadbc9a411 created order 6ba7b810-9dad-11d1-80b4-00c04fd430c8'
    const replaced = map.replace(text, { pattern: UUID_RE })
    expect(replaced).not.toContain('dc193952')
    expect(replaced).not.toContain('6ba7b810')
    expect(map.size).toBe(2)
  })

  it('without pattern replaces only already-registered originals', () => {
    const map = createAliasMap({ words: 2 })
    const alias = map.set('abc-123')
    const text = 'ID is abc-123 and also def-456'
    const replaced = map.replace(text)
    expect(replaced).toContain(alias)
    expect(replaced).toContain('def-456')
  })

  it('returns text unchanged when no matches', () => {
    const map = createAliasMap({ words: 2 })
    const text = 'no ids here'
    expect(map.replace(text, { pattern: UUID_RE })).toBe(text)
  })

  it('deduplicates pattern matches', () => {
    const map = createAliasMap({ words: 2 })
    const uuid = 'dc193952-186a-4645-a2c4-ebdadbc9a411'
    const text = `${uuid} appears twice: ${uuid}`
    const replaced = map.replace(text, { pattern: UUID_RE })
    expect(map.size).toBe(1)
  })
})

describe('restore()', () => {
  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g

  it('round-trip: restore(replace(text)) returns original', () => {
    const map = createAliasMap({ words: 3 })
    const original = 'Process dc193952-186a-4645-a2c4-ebdadbc9a411 sent to 6ba7b810-9dad-11d1-80b4-00c04fd430c8'
    const replaced = map.replace(original, { pattern: UUID_RE })
    expect(map.restore(replaced)).toBe(original)
  })

  it('returns text unchanged when map is empty', () => {
    const map = createAliasMap({ words: 2 })
    expect(map.restore('hello')).toBe('hello')
  })
})
