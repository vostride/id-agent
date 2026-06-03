import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

describe('build output', () => {
  const distDir = resolve(import.meta.dirname, '..', 'dist')

  it('dist/index.js exists (ESM)', () => {
    expect(existsSync(resolve(distDir, 'index.js'))).toBe(true)
  })

  it('dist/index.cjs exists (CJS)', () => {
    expect(existsSync(resolve(distDir, 'index.cjs'))).toBe(true)
  })

  it('dist/index.d.ts exists (declarations)', () => {
    expect(existsSync(resolve(distDir, 'index.d.ts'))).toBe(true)
  })

  it('ESM output exports WORDLIST', () => {
    const content = readFileSync(resolve(distDir, 'index.js'), 'utf-8')
    expect(content).toContain('WORDLIST')
  })

  it('CJS output exports WORDLIST', () => {
    const content = readFileSync(resolve(distDir, 'index.cjs'), 'utf-8')
    expect(content).toContain('WORDLIST')
  })

  it('declaration file exports WORDLIST', () => {
    const content = readFileSync(resolve(distDir, 'index.d.ts'), 'utf-8')
    expect(content).toContain('WORDLIST')
  })
})
