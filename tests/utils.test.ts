import { describe, expect, it } from 'vitest'
import { selectRandomWords } from '../src/crypto'
import { formatId } from '../src/format'

import { WORDLIST } from '../src/wordlist'

describe('selectRandomWords', () => {
  it('returns array of requested length (4)', () => {
    const words = selectRandomWords(4, WORDLIST)
    expect(words).toHaveLength(4)
  })

  it('returns array of requested length (8)', () => {
    const words = selectRandomWords(8, WORDLIST)
    expect(words).toHaveLength(8)
  })

  it('returns array of requested length (1)', () => {
    const words = selectRandomWords(1, WORDLIST)
    expect(words).toHaveLength(1)
  })

  it('every element exists in the wordlist', () => {
    const words = selectRandomWords(8, WORDLIST)
    for (const w of words) {
      expect(WORDLIST).toContain(w)
    }
  })

  it('returns strings', () => {
    const words = selectRandomWords(4, WORDLIST)
    for (const w of words) {
      expect(typeof w).toBe('string')
    }
  })
})

describe('formatId', () => {
  it('returns prefix_body when prefix provided', () => {
    expect(formatId('task', 'red-fox-big')).toBe('task_red-fox-big')
  })

  it('returns body only when prefix is undefined', () => {
    expect(formatId(undefined, 'red-fox-big')).toBe('red-fox-big')
  })

  it('works with short strings', () => {
    expect(formatId('x', 'a')).toBe('x_a')
  })
})
