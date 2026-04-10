import type { IdAgent, IdAgentFromOptions, IdAgentOptions } from './types'
import { IdAgentOptionsSchema } from './schemas'
import { selectRandomWords } from './crypto'
import { deterministicId } from './deterministic'
import { formatId } from './format'
import { WORDLIST } from './wordlist'

function createIdAgent(): IdAgent {
  const fn = ((opts?: IdAgentOptions): string => {
    const validated = IdAgentOptionsSchema.parse(opts ?? {})
    const words = validated.words ?? 8
    const selected = selectRandomWords(words, WORDLIST)
    return formatId(validated.prefix, selected.join('-'))
  }) as IdAgent

  fn.from = (input: string, opts?: IdAgentFromOptions) => deterministicId(input, opts)

  return fn
}

export const idAgent = createIdAgent()
