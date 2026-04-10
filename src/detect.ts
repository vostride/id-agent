import type { DetectOptions, Duplicate } from './types'

export function detectDuplicates(opts: DetectOptions): Duplicate[] {
  const texts = typeof opts.text === 'string' ? [opts.text] : opts.text
  const idMap = new Map<string, number>()
  const re = new RegExp(
    opts.pattern.source,
    opts.pattern.flags.includes('g') ? opts.pattern.flags : opts.pattern.flags + 'g',
  )

  for (const text of texts) {
    re.lastIndex = 0
    let match
    while ((match = re.exec(text)) !== null) {
      idMap.set(match[0], (idMap.get(match[0]) ?? 0) + 1)
    }
  }

  return [...idMap.entries()]
    .filter(([, count]) => count > 1)
    .map(([id, count]) => ({ id, count }))
}
