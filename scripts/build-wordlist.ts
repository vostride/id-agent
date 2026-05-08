import { Tiktoken } from 'js-tiktoken/lite'
import o200k_base from 'js-tiktoken/ranks/o200k_base'
import { readFileSync, writeFileSync } from 'node:fs'
import { englishDataset, englishRecommendedTransformers, RegExpMatcher } from 'obscenity'

const MANUAL_BLOCKLIST = [
  'ass',
  'crap',
  'damn',
  'hell',
  'slut',
  'rape',
  'kill',
  'die',
  'fag',
  'gay',
  'drug',
  'dumb',
  'lame',
  'nazi',
  'pimp',
  'porn',
  'poop',
  'puke',
  'sexy',
  'sick',
  'anus',
  'cunt',
  'dick',
  'tit',
  'tits',
  'boob',
  'piss',
  'shit',
  'cock',
  'whore',
  'bitch',
  'bastard',
  'bloody',
  'bugger',
  'tosser',
  'wank',
  'twat',
  'arse',
  'shag',
  'meth',
  'heroin',
  'crack',
  'coke',
  'weed',
]

const HOMOPHONE_GROUPS = [
  ['air', 'heir'],
  ['ate', 'eight'],
  ['bare', 'bear'],
  ['be', 'bee'],
  ['blue', 'blew'],
  ['buy', 'by', 'bye'],
  ['cell', 'sell'],
  ['cent', 'sent', 'scent'],
  ['dear', 'deer'],
  ['dew', 'due'],
  ['die', 'dye'],
  ['eye', 'I'],
  ['fair', 'fare'],
  ['feat', 'feet'],
  ['fir', 'fur'],
  ['flea', 'flee'],
  ['flour', 'flower'],
  ['for', 'four', 'fore'],
  ['hair', 'hare'],
  ['hall', 'haul'],
  ['heal', 'heel'],
  ['hear', 'here'],
  ['him', 'hymn'],
  ['hole', 'whole'],
  ['hour', 'our'],
  ['knead', 'need'],
  ['knew', 'new'],
  ['knight', 'night'],
  ['knot', 'not'],
  ['know', 'no'],
  ['made', 'maid'],
  ['mail', 'male'],
  ['main', 'mane'],
  ['meat', 'meet'],
  ['mist', 'missed'],
  ['moose', 'mousse'],
  ['one', 'won'],
  ['pail', 'pale'],
  ['pain', 'pane'],
  ['pair', 'pare', 'pear'],
  ['peace', 'piece'],
  ['peak', 'peek'],
  ['plain', 'plane'],
  ['pole', 'poll'],
  ['poor', 'pour'],
  ['pray', 'prey'],
  ['read', 'reed'],
  ['right', 'write'],
  ['road', 'rode'],
  ['role', 'roll'],
  ['rose', 'rows'],
  ['sail', 'sale'],
  ['sea', 'see'],
  ['seam', 'seem'],
  ['sight', 'site', 'cite'],
  ['sole', 'soul'],
  ['some', 'sum'],
  ['son', 'sun'],
  ['stair', 'stare'],
  ['stake', 'steak'],
  ['steal', 'steel'],
  ['tail', 'tale'],
  ['their', 'there'],
  ['threw', 'through'],
  ['tide', 'tied'],
  ['toe', 'tow'],
  ['vain', 'vane', 'vein'],
  ['wade', 'weighed'],
  ['wait', 'weight'],
  ['war', 'wore'],
  ['waste', 'waist'],
  ['way', 'weigh'],
  ['weak', 'week'],
  ['wear', 'where'],
  ['wood', 'would'],
]

// Step 1: Extract candidates from o200k_base vocabulary
console.log('Step 1: Extracting candidates from o200k_base vocabulary...')
const parts = o200k_base.bpe_ranks.split(' ')
const candidateSet = new Set<string>()

for (const b64 of parts) {
  if (!b64.trim()) continue
  const bytes = Buffer.from(b64, 'base64')
  const text = bytes.toString('utf-8')
  const word = text.startsWith(' ') ? text.slice(1) : text
  if (/^[a-z]{3,6}$/.test(word)) candidateSet.add(word)
}

const candidates = [...candidateSet]
console.log(`  Candidates (3-6 char lowercase): ${candidates.length}`)

// Step 2: Dictionary filter
console.log('Step 2: Filtering against system dictionary...')
let dictWords: Set<string>
try {
  const dictRaw = readFileSync('/usr/share/dict/words', 'utf-8')
  dictWords = new Set(dictRaw.split('\n').map((w) => w.toLowerCase().trim()).filter(Boolean))
} catch {
  console.error('ERROR: /usr/share/dict/words not available. This script requires the system dictionary.')
  process.exit(1)
}

const dictFiltered = candidates.filter((w) => dictWords.has(w))
console.log(`  After dictionary filter: ${dictFiltered.length}`)

// Step 3: Single-token BPE validation
console.log('Step 3: Validating single-token encoding...')
const enc = new Tiktoken(o200k_base)
const singleToken = dictFiltered.filter((w) => enc.encode(w).length === 1)
console.log(`  After single-token filter: ${singleToken.length}`)

// Step 4: Hyphen-prefix BPE validation
console.log('Step 4: Validating hyphen-prefix encoding...')
const hyphenValid = singleToken.filter((w) => enc.encode('-' + w).length <= 2)
console.log(`  After hyphen-prefix filter: ${hyphenValid.length}`)

// Step 5: Offensive word filter
console.log('Step 5: Filtering offensive words...')
const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
})

const manualBlockSet = new Set(MANUAL_BLOCKLIST)
const cleanWords = hyphenValid.filter((w) => {
  if (manualBlockSet.has(w)) return false
  if (matcher.hasMatch(w)) return false
  return true
})
console.log(`  After offensive filter: ${cleanWords.length}`)

// Step 6: Homophone filter
console.log('Step 6: Filtering homophones...')
const pool = new Set(cleanWords)
const homophoneRemovals = new Set<string>()

for (const group of HOMOPHONE_GROUPS) {
  const inPool = group.filter((w) => pool.has(w))
  if (inPool.length <= 1) continue
  inPool.sort()
  // Keep first alphabetically, remove the rest
  for (let i = 1; i < inPool.length; i++) {
    homophoneRemovals.add(inPool[i])
  }
}

const afterHomophones = cleanWords.filter((w) => !homophoneRemovals.has(w))
console.log(`  Homophones removed: ${homophoneRemovals.size}`)
console.log(`  After homophone filter: ${afterHomophones.length}`)

// Step 7: Select exactly 4096 words
console.log('Step 7: Selecting final 4096 words...')
afterHomophones.sort()

if (afterHomophones.length < 4096) {
  console.error(`FATAL: Only ${afterHomophones.length} words survived filtering. Need at least 4096.`)
  process.exit(1)
}

const final = afterHomophones.slice(0, 4096)
console.log(`  Final wordlist: ${final.length} words`)

// Step 8: Write src/wordlist.ts
console.log('Step 8: Writing src/wordlist.ts...')
const output = `export const WORDLIST = '${final.join(' ')}'\n  .split(' ')\n`
writeFileSync('src/wordlist.ts', output)

const minLen = Math.min(...final.map((w) => w.length))
const maxLen = Math.max(...final.map((w) => w.length))
const rawSize = output.length

console.log('\n=== Summary ===')
console.log(`  Word count: ${final.length}`)
console.log(`  Min word length: ${minLen}`)
console.log(`  Max word length: ${maxLen}`)
console.log(`  Raw file size: ${(rawSize / 1024).toFixed(1)} KB`)
console.log(`  Words trimmed: ${afterHomophones.length - 4096} (had ${afterHomophones.length} candidates)`)
console.log('  Output: src/wordlist.ts')

// js-tiktoken (pure JS) does not require cleanup
