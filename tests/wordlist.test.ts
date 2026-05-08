import { describe, expect, it } from 'vitest'
import { WORDLIST } from '../src/wordlist'

describe('wordlist', () => {
  it('has exactly 4096 words', () => {
    expect(WORDLIST).toHaveLength(4096)
  })

  it('all words are 3-6 lowercase chars', () => {
    for (const word of WORDLIST) {
      expect(word).toMatch(/^[a-z]{3,6}$/)
    }
  })

  it('is sorted alphabetically', () => {
    const sorted = [...WORDLIST].sort()
    expect(WORDLIST).toEqual(sorted)
  })

  it('has no duplicates', () => {
    expect(new Set(WORDLIST).size).toBe(WORDLIST.length)
  })

  it('word count is a power of 2', () => {
    expect(Math.log2(WORDLIST.length) % 1).toBe(0)
  })
})
