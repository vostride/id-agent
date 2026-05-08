import type { ParsedId, ValidateResult } from './types'
import { WORDLIST } from './wordlist'

const READABLE_BODY = /^[a-z]{2,}(?:[-_][a-z]{2,})*$/
const BITS_PER_WORD = Math.log2(WORDLIST.length)

const wordSet = new Set(WORDLIST)

export function parse(id: string): ParsedId | null {
  if (!id || typeof id !== 'string') return null

  let prefix: string | undefined
  let body = id

  const us = id.indexOf('_')
  if (us > 0) {
    prefix = id.slice(0, us)
    body = id.slice(us + 1)
  }

  if (!body) return null

  if (READABLE_BODY.test(body)) {
    const words = body.split(/[-_]/)
    return { prefix, words, wordCount: words.length, bits: words.length * BITS_PER_WORD, raw: id, format: 'readable' }
  }

  return null
}

export function validate(id: string): ValidateResult {
  if (!id || typeof id !== 'string') return { valid: false, reason: 'empty string' }
  if (/[A-Z]/.test(id)) return { valid: false, reason: 'contains uppercase characters' }
  if (/[^a-z0-9_-]/.test(id)) return { valid: false, reason: 'contains invalid characters' }

  const parsed = parse(id)
  if (!parsed) return { valid: false, reason: 'unrecognized format' }

  if (parsed.words.length > 0) {
    const invalid = parsed.words.filter(w => !wordSet.has(w))
    if (invalid.length > 0) {
      return { valid: false, reason: `unknown words: ${invalid.join(', ')}` }
    }
  }

  return { valid: true, prefix: parsed.prefix, wordCount: parsed.wordCount }
}
