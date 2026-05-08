import { Tiktoken } from 'js-tiktoken/lite'
import o200k_base from 'js-tiktoken/ranks/o200k_base'
import { WORDLIST } from '../src/wordlist'

const enc = new Tiktoken(o200k_base)
let failures = 0

function check(name: string, condition: boolean) {
  if (condition) {
    console.log(`PASS: ${name}`)
  } else {
    console.error(`FAIL: ${name}`)
    failures++
  }
}

check('Word count is 4096', WORDLIST.length === 4096)
check('All words match /^[a-z]{3,6}$/', WORDLIST.every(w => /^[a-z]{3,6}$/.test(w)))
check('No duplicates', new Set(WORDLIST).size === WORDLIST.length)
check('Sorted alphabetically', JSON.stringify(WORDLIST) === JSON.stringify([...WORDLIST].sort()))

const singleTokenFails: string[] = []
const hyphenFails: string[] = []
for (const word of WORDLIST) {
  if (enc.encode(word).length !== 1) singleTokenFails.push(word)
  if (enc.encode('-' + word).length > 2) hyphenFails.push(word)
}
check(`All words are single BPE tokens (failures: ${singleTokenFails.length})`, singleTokenFails.length === 0)
check(`All words pass hyphen-prefix test (failures: ${hyphenFails.length})`, hyphenFails.length === 0)

if (singleTokenFails.length > 0) console.error('Single-token failures:', singleTokenFails)
if (hyphenFails.length > 0) console.error('Hyphen-prefix failures:', hyphenFails)

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECKS FAILED`}`)
process.exit(failures === 0 ? 0 : 1)
