import { Tiktoken } from 'js-tiktoken/lite'
import o200k_base from 'js-tiktoken/ranks/o200k_base'
import { describe, expect, it } from 'vitest'
import { WORDLIST } from '../src/wordlist'

describe('wordlist token validation', () => {
  const enc = new Tiktoken(o200k_base)

  it('every word is a single BPE token on o200k_base', () => {
    const failures: string[] = []
    for (const word of WORDLIST) {
      if (enc.encode(word).length !== 1) failures.push(word)
    }
    expect(failures, `These words are not single tokens: ${failures.join(', ')}`).toHaveLength(0)
  })

  it('every word passes hyphen-prefix test (-word <= 2 tokens)', () => {
    const failures: string[] = []
    for (const word of WORDLIST) {
      if (enc.encode(`-${word}`).length > 2) failures.push(word)
    }
    expect(failures, `These words fail hyphen test: ${failures.join(', ')}`).toHaveLength(0)
  })

  it('every word passes composite context test (alpha-WORD-beta)', () => {
    const failures: string[] = []
    for (const word of WORDLIST) {
      const hyphenWord = enc.encode(`-${word}`)
      if (hyphenWord.length > 2) failures.push(word)
    }
    expect(failures).toHaveLength(0)
  })
})
