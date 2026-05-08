export function selectRandomWords(count: number, wordlist: readonly string[]): string[] {
  const buf = new Uint16Array(count)
  globalThis.crypto.getRandomValues(buf)
  const words: string[] = new Array(count)
  for (let i = 0; i < count; i++) {
    words[i] = wordlist[buf[i] % wordlist.length]
  }
  return words
}
