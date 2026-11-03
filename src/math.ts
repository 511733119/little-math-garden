export type Level = 'sprout' | 'bloom' | 'garden' | 'star'
export type Mode = 'keypad' | 'choice'
export interface Question {
  id: string
  a: number
  b: number
  op: '+' | '-'
  answer: number
  choices: number[]
}
export interface QuestionRecord {
  question: Question
  attempts: number[]
  hintUsed: boolean
}

export const levels: { id: Level; name: string; description: string; icon: string }[] = [
  { id: 'sprout', name: '小芽启蒙', description: '20 以内，不进位、不退位', icon: '🌱' },
  { id: 'bloom', name: '花朵进阶', description: '20 以内，练习进位和退位', icon: '🌷' },
  { id: 'garden', name: '花园探索', description: '100 以内，不进位、不退位', icon: '🌳' },
  { id: 'star', name: '星光挑战', description: '100 以内，练习进位和退位', icon: '⭐' },
]

/** Whether the ones column needs carrying (addition) or borrowing (subtraction). */
export function needsRegroup(a: number, b: number, op: '+' | '-'): boolean {
  return op === '+' ? a % 10 + b % 10 >= 10 : a % 10 < b % 10
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const sample = rng()
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
      throw new RangeError('rng must return a finite number in [0, 1)')
    }
    const j = Math.floor(sample * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

type Candidate = Pick<Question, 'a' | 'b' | 'op' | 'answer'>

/** Finite pools ensure uniqueness and termination, even with a constant RNG. */
export function generateQuestions(level: Level, count: number, rng: () => number = Math.random): Question[] {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('count must be a nonnegative safe integer')
  if (!levels.some((entry) => entry.id === level)) throw new RangeError('Unknown level')
  if (count === 0) return []
  const limit = level === 'sprout' || level === 'bloom' ? 20 : 100
  const regroup = level === 'bloom' || level === 'star'
  const minimumA = limit === 100 ? 10 : 1
  const pools: Record<'+' | '-', Candidate[]> = { '+': [], '-': [] }
  for (let a = minimumA; a <= limit; a++) {
    for (let b = 1; b <= limit; b++) {
      for (const op of ['+', '-'] as const) {
        const answer = op === '+' ? a + b : a - b
        if (answer < 0 || answer > limit || needsRegroup(a, b, op) !== regroup) continue
        pools[op].push({ a, b, op, answer })
      }
    }
  }
  const perOperation = Math.floor(count / 2)
  if (perOperation > Math.min(pools['+'].length, pools['-'].length)) {
    throw new RangeError('count exceeds the balanced unique question pool')
  }
  const oddOperations = (['+', '-'] as const).filter((op) => pools[op].length > perOperation)
  if (count % 2 && oddOperations.length === 0) throw new RangeError('count exceeds the balanced unique question pool')
  const extra = count % 2 ? shuffle(oddOperations, rng)[0] : undefined
  const selected = (['+', '-'] as const).flatMap((op) => {
    const shuffled = shuffle(pools[op], rng)
    if (op === '-') return shuffled.slice(0, perOperation + Number(extra === op))
    // Prefer one randomly selected orientation of each sum before its reversal.
    // Keeping the reversals as a fallback preserves the full finite capacity.
    const seen = new Set<string>()
    const preferred: Candidate[] = []
    const reversals: Candidate[] = []
    for (const q of shuffled) {
      const key = `${Math.min(q.a, q.b)}+${Math.max(q.a, q.b)}`
      if (seen.has(key)) reversals.push(q)
      else {
        seen.add(key)
        preferred.push(q)
      }
    }
    return [...preferred, ...reversals].slice(0, perOperation + Number(extra === op))
  })
  return shuffle(selected, rng).map((q) => {
    const plausible = [...new Set([
      q.answer - 1, q.answer + 1, q.answer - 10, q.answer + 10,
      q.answer - 2, q.answer + 2,
      q.op === '-' ? q.a + q.b : Math.abs(q.a - q.b),
    ])].filter((n) => n >= 0 && n <= limit && n !== q.answer)
    const alternatives = Array.from({ length: limit + 1 }, (_, n) => n)
      .filter((n) => n !== q.answer && !plausible.includes(n))
    const distractors = [...shuffle(plausible, rng), ...shuffle(alternatives, rng)].slice(0, 3)
    const choices = shuffle([q.answer, ...distractors], rng)
    return { ...q, id: `${level}-${q.a}${q.op}${q.b}`, choices }
  })
}

export function explain(q: Question): { title: string; steps: { equation: string; caption: string }[] } {
  const { a, b, op, answer } = q
  const aOnes = a % 10
  const bOnes = b % 10
  const aTens = a - aOnes
  const bTens = b - bOnes
  if (op === '+' && needsRegroup(a, b, op)) {
    const toTen = 10 - aOnes
    const rest = b - toTen
    return {
      title: '凑成整十，再加剩下的',
      steps: [
        { equation: `${b} = ${toTen} + ${rest}`, caption: `把 ${b} 分成两份。` },
        { equation: `${a} + ${toTen} = ${a + toTen}`, caption: '先凑成整十数。' },
        { equation: `${a + toTen} + ${rest} = ${answer}`, caption: '再加上剩下的一份。' },
      ],
    }
  }
  if (op === '+') {
    return {
      title: '十位和个位，分别相加',
      steps: [
        { equation: `${aTens} + ${bTens} = ${aTens + bTens}`, caption: '先把整十的部分相加。' },
        { equation: `${aOnes} + ${bOnes} = ${aOnes + bOnes}`, caption: '再把个位相加。' },
        { equation: `${aTens + bTens} + ${aOnes + bOnes} = ${answer}`, caption: '合起来，就是答案！' },
      ],
    }
  }
  if (needsRegroup(a, b, op)) {
    const remainingTens = aTens - 10
    const borrowedOnes = aOnes + 10
    return {
      title: '借一个十，变成十个一',
      steps: [
        { equation: `${a} = ${remainingTens} + ${borrowedOnes}`, caption: '从十位借一个十，放到个位。' },
        { equation: `${borrowedOnes} - ${bOnes} = ${borrowedOnes - bOnes}`, caption: '个位够减啦，先减个位。' },
        { equation: `${remainingTens} - ${bTens} + ${borrowedOnes - bOnes} = ${answer}`, caption: '再减整十的部分，把结果合起来。' },
      ],
    }
  }
  return {
    title: '先减个位，再看十位',
    steps: [
      { equation: `${aOnes} - ${bOnes} = ${aOnes - bOnes}`, caption: '先算个位还剩多少。' },
      { equation: `${aTens} - ${bTens} + ${aOnes - bOnes} = ${answer}`, caption: '再减整十的部分，把结果合起来。' },
    ],
  }
}

export function score(records: QuestionRecord[]): {
  firstTry: number
  retried: number
  helped: number
  addition: { correct: number; total: number }
  subtraction: { correct: number; total: number }
} {
  const result = { firstTry: 0, retried: 0, helped: 0, addition: { correct: 0, total: 0 }, subtraction: { correct: 0, total: 0 } }
  for (const { question, attempts, hintUsed } of records) {
    const correct = attempts.length > 0 && attempts[attempts.length - 1] === question.answer
    const operation = question.op === '+' ? result.addition : result.subtraction
    operation.total++
    if (correct) operation.correct++
    if (hintUsed || !correct) result.helped++
    else if (attempts.length === 1) result.firstTry++
    else result.retried++
  }
  return result
}
