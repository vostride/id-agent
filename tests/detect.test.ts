import { describe, it, expect } from 'vitest'
import { detectDuplicates } from '../src/detect'

describe('detectDuplicates', () => {
  it('finds duplicates in a single text string', () => {
    const text = 'ID task_red-fox appears here and task_red-fox appears again'
    const dupes = detectDuplicates({
      pattern: /task_[a-z]+-[a-z]+/,
      text,
    })
    expect(dupes).toHaveLength(1)
    expect(dupes[0].id).toBe('task_red-fox')
    expect(dupes[0].count).toBe(2)
  })

  it('finds duplicates across multiple text strings', () => {
    const texts = [
      'const id = "task_red-fox"',
      'const other = "task_red-fox"',
      'const unique = "task_big-cat"',
    ]
    const dupes = detectDuplicates({
      pattern: /task_[a-z]+-[a-z]+/,
      text: texts,
    })
    const redFox = dupes.find(d => d.id === 'task_red-fox')
    expect(redFox).toBeDefined()
    expect(redFox!.count).toBe(2)
  })

  it('returns empty array when no duplicates exist', () => {
    const dupes = detectDuplicates({
      pattern: /task_[a-z]+/,
      text: 'task_one and task_two are unique',
    })
    expect(dupes).toEqual([])
  })

  it('auto-adds global flag to pattern', () => {
    const text = 'task_red-fox and task_red-fox again'
    const dupes = detectDuplicates({
      pattern: /task_[a-z]+-[a-z]+/,
      text,
    })
    expect(dupes).toHaveLength(1)
  })

  it('handles pattern that already has global flag', () => {
    const text = 'task_red-fox and task_red-fox again'
    const dupes = detectDuplicates({
      pattern: /task_[a-z]+-[a-z]+/g,
      text,
    })
    expect(dupes).toHaveLength(1)
  })

  it('returns empty array for empty text', () => {
    const dupes = detectDuplicates({
      pattern: /task_\w+/,
      text: '',
    })
    expect(dupes).toEqual([])
  })

  it('returns empty array for empty text array', () => {
    const dupes = detectDuplicates({
      pattern: /task_\w+/,
      text: [],
    })
    expect(dupes).toEqual([])
  })

  it('is synchronous (returns array, not Promise)', () => {
    const result = detectDuplicates({
      pattern: /test/,
      text: 'test test',
    })
    expect(Array.isArray(result)).toBe(true)
    expect(result).not.toBeInstanceOf(Promise)
  })

  it('counts occurrences correctly', () => {
    const text = 'id-a id-b id-a id-a id-b'
    const dupes = detectDuplicates({
      pattern: /id-[a-z]/,
      text,
    })
    const a = dupes.find(d => d.id === 'id-a')
    const b = dupes.find(d => d.id === 'id-b')
    expect(a!.count).toBe(3)
    expect(b!.count).toBe(2)
  })
})
