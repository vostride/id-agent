import type { IdAgentFromOptions } from './types'
import { IdAgentFromOptionsSchema } from './schemas'
import { WORDLIST } from './wordlist'
import { formatId } from './format'

export async function deterministicId(input: string, opts?: IdAgentFromOptions): Promise<string> {
  if (!input || typeof input !== 'string') {
    throw new Error('input must be a non-empty string')
  }
  const validated = IdAgentFromOptionsSchema.parse(opts ?? {})
  const words = validated.words ?? 8

  if (!globalThis.crypto?.subtle) {
    throw new Error('idAgent.from() requires Web Crypto API (crypto.subtle). Use HTTPS in browsers.')
  }

  const enc = new TextEncoder()
  const keyData = enc.encode(validated.namespace ?? 'id-agent')
  const key = await globalThis.crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(input))
  const view = new DataView(sig)

  const selected: string[] = new Array(words)
  for (let i = 0; i < words; i++) {
    selected[i] = WORDLIST[view.getUint16(i * 2) % 4096]
  }

  return formatId(validated.prefix, selected.join('-'))
}
