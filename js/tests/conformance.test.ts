import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createAliasMap, detectDuplicates, idAgent, parse, validate, WORDLIST } from '../src/index'
import { readConformanceFixture } from './conformance-fixtures'

type DeterministicFixture = {
  schemaVersion: 1
  successCases: Array<{
    name: string
    input: string
    options: {
      namespace?: string
      words?: number
      prefix?: string
    }
    expected: string
  }>
  errorCases: Array<{
    name: string
    input: string
    options: {
      namespace?: string
      words?: number
      prefix?: string
    }
  }>
}

type ParseValidateFixture = {
  schemaVersion: 1
  parseCases: Array<{
    name: string
    id: string
    expected: null | {
      prefix: string | null
      words: string[]
      wordCount: number
      bits: number
      raw: string
      format: 'readable'
    }
  }>
  validateCases: Array<{
    name: string
    id: string
    expected: {
      valid: boolean
      prefix?: string | null
      wordCount?: number
      reason?: string
    }
  }>
}

type AliasMapFixture = {
  schemaVersion: 1
  cases: Array<{
    name: string
    words: number
    allowCollision?: boolean
    original?: string
    originals?: string[]
    text?: string
    pattern?: string
    expected: {
      aliasWordCount?: number
      aliasWordsInWordlist?: boolean
      sameAliasOnRepeatedSet?: boolean
      entryOriginals?: string[]
      registered?: number
      restoreRoundTrip?: boolean
      size: number
    }
  }>
}

type DuplicatesFixture = {
  schemaVersion: 1
  cases: Array<{
    name: string
    text: string | string[]
    pattern: string
    expected: Array<{
      id: string
      count: number
    }>
  }>
}

type WordlistFixture = {
  schemaVersion: 1
  expectedLength: number
  sha256: string
  samples: Record<string, string>
  wordPattern: string
  unique: boolean
  sorted: boolean
}

describe('conformance: deterministic generation', () => {
  const fixture = readConformanceFixture<DeterministicFixture>('deterministic.json')

  for (const testCase of fixture.successCases) {
    it(testCase.name, async () => {
      await expect(idAgent.from(testCase.input, testCase.options)).resolves.toBe(testCase.expected)
    })
  }

  for (const testCase of fixture.errorCases) {
    it(testCase.name, async () => {
      await expect(idAgent.from(testCase.input, testCase.options)).rejects.toThrow()
    })
  }
})

describe('conformance: parse and validate', () => {
  const fixture = readConformanceFixture<ParseValidateFixture>('parse-validate.json')

  for (const testCase of fixture.parseCases) {
    it(`parse ${testCase.name}`, () => {
      const result = parse(testCase.id)

      if (testCase.expected === null) {
        expect(result).toBeNull()
        return
      }

      expect(result).toEqual({
        ...testCase.expected,
        prefix: testCase.expected.prefix ?? undefined,
      })
    })
  }

  for (const testCase of fixture.validateCases) {
    it(`validate ${testCase.name}`, () => {
      const result = validate(testCase.id)

      expect(result.valid).toBe(testCase.expected.valid)
      if (testCase.expected.prefix !== undefined) {
        expect(result.prefix).toBe(testCase.expected.prefix ?? undefined)
      }
      if (testCase.expected.wordCount !== undefined) {
        expect(result.wordCount).toBe(testCase.expected.wordCount)
      }
      if (testCase.expected.reason !== undefined) {
        expect(result.reason).toBe(testCase.expected.reason)
      }
    })
  }
})

describe('conformance: alias maps', () => {
  const fixture = readConformanceFixture<AliasMapFixture>('alias-map.json')

  for (const testCase of fixture.cases) {
    it(testCase.name, () => {
      const map = createAliasMap({
        words: testCase.words,
        allowCollision: testCase.allowCollision,
      })

      if (testCase.name === 'set-shape') {
        const alias = map.set(testCase.original!)
        const parts = alias.split('-')
        expect(parts).toHaveLength(testCase.expected.aliasWordCount)
        expect(parts.every(word => WORDLIST.includes(word))).toBe(testCase.expected.aliasWordsInWordlist)
        expect(map.size).toBe(testCase.expected.size)
        expect(map.get(alias)).toBe(testCase.original)
      }

      if (testCase.name === 'idempotent-set') {
        const first = map.set(testCase.original!)
        const second = map.set(testCase.original!)
        expect(first === second).toBe(testCase.expected.sameAliasOnRepeatedSet)
        expect(map.size).toBe(testCase.expected.size)
      }

      if (testCase.name === 'entries-order') {
        for (const original of testCase.originals!) {
          map.set(original)
        }
        const entries = [...map.entries()]
        expect(entries.map(([original]) => original)).toEqual(testCase.expected.entryOriginals)
        expect(entries).toHaveLength(testCase.expected.size)
      }

      if (testCase.name === 'replace-restore') {
        const replaced = map.replace(testCase.text!, { pattern: new RegExp(testCase.pattern!, 'g') })
        expect(map.size).toBe(testCase.expected.registered)
        expect(replaced).not.toBe(testCase.text)
        expect(map.restore(replaced) === testCase.text).toBe(testCase.expected.restoreRoundTrip)
      }

      if (testCase.name === 'allow-collision-option') {
        const alias = map.set(testCase.original!)
        expect(alias.split('-')).toHaveLength(testCase.expected.aliasWordCount)
        expect(map.size).toBe(testCase.expected.size)
      }
    })
  }
})

describe('conformance: duplicate detection', () => {
  const fixture = readConformanceFixture<DuplicatesFixture>('duplicates.json')

  for (const testCase of fixture.cases) {
    it(testCase.name, () => {
      expect(detectDuplicates({ text: testCase.text, pattern: new RegExp(testCase.pattern) })).toEqual(
        testCase.expected,
      )
    })
  }
})

describe('conformance: wordlist', () => {
  const fixture = readConformanceFixture<WordlistFixture>('wordlist.json')

  it('matches identity fixtures and invariants', () => {
    expect(WORDLIST).toHaveLength(fixture.expectedLength)
    expect(createHash('sha256').update(WORDLIST.join(' ')).digest('hex')).toBe(fixture.sha256)

    for (const [index, word] of Object.entries(fixture.samples)) {
      expect(WORDLIST[Number(index)]).toBe(word)
    }

    const pattern = new RegExp(fixture.wordPattern)
    expect(WORDLIST.every(word => pattern.test(word))).toBe(true)
    expect(new Set(WORDLIST).size === WORDLIST.length).toBe(fixture.unique)
    expect(fixture.sorted).toBe(true)
    expect([...WORDLIST].sort()).toEqual(WORDLIST)
    expect(Object.isFrozen(WORDLIST)).toBe(true)
  })
})
