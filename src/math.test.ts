import { describe, expect, it } from 'vitest'
import { explain, generateQuestions, levels, needsRegroup, score, type Level, type Question, type QuestionRecord } from './math'

function seeded(seed = 41): () => number {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}
function question(a: number, b: number, op: '+' | '-'): Question {
  return { id: `${a}${op}${b}`, a, b, op, answer: op === '+' ? a + b : a - b, choices: [] }
}

// Evaluate the deliberately small arithmetic grammar used by explanation equations.
function evaluate(expression: string): number {
  const tokens = expression.match(/\d+|[+-]/g)!
  let result = Number(tokens[0])
  for (let i = 1; i < tokens.length; i += 2) {
    result += (tokens[i] === '+' ? 1 : -1) * Number(tokens[i + 1])
    expect(result).toBeGreaterThanOrEqual(0)
  }
  return result
}

describe('question generation', () => {
  it('provides Chinese metadata for every level', () => {
    expect(levels.map((level) => level.id)).toEqual(['sprout', 'bloom', 'garden', 'star'])
    for (const level of levels) {
      expect(level.name).toMatch(/[\u4e00-\u9fff]/)
      expect(level.description).toMatch(/[\u4e00-\u9fff]/)
      expect(level.icon.length).toBeGreaterThan(0)
    }
  })

  it.each<Level>(['sprout', 'bloom', 'garden', 'star'])('%s respects bounds, regrouping, uniqueness and balance', (level) => {
    const questions = generateQuestions(level, 81, seeded())
    const limit = level === 'sprout' || level === 'bloom' ? 20 : 100
    expect(questions).toHaveLength(81)
    expect(new Set(questions.map((q) => q.id)).size).toBe(81)
    expect(new Set(questions.map((q) => `${q.a}${q.op}${q.b}`)).size).toBe(81)
    expect(Math.abs(questions.filter((q) => q.op === '+').length - questions.filter((q) => q.op === '-').length)).toBe(1)
    for (const q of questions) {
      expect(q.a).toBeGreaterThanOrEqual(limit === 100 ? 10 : 1)
      expect(q.a).toBeLessThanOrEqual(limit)
      expect(q.b).toBeGreaterThanOrEqual(1)
      expect(q.b).toBeLessThanOrEqual(limit)
      expect(q.answer).toBe(q.op === '+' ? q.a + q.b : q.a - q.b)
      expect(q.answer).toBeGreaterThanOrEqual(0)
      expect(q.answer).toBeLessThanOrEqual(limit)
      expect(needsRegroup(q.a, q.b, q.op)).toBe(level === 'bloom' || level === 'star')
      expect(q.choices).toHaveLength(4)
      expect(new Set(q.choices).size).toBe(4)
      expect(q.choices).toContain(q.answer)
      expect(q.choices.every((n) => Number.isInteger(n) && n >= 0 && n <= limit)).toBe(true)
    }
  })

  it('balances even batches and handles constant random sources without retry loops', () => {
    for (const rng of [() => 0, () => 0.999999]) {
      const questions = generateQuestions('bloom', 100, rng)
      expect(questions.filter((q) => q.op === '+')).toHaveLength(50)
      expect(questions.filter((q) => q.op === '-')).toHaveLength(50)
      expect(new Set(questions.map((q) => q.id)).size).toBe(100)
    }
    expect(generateQuestions('star', 20, seeded())).toEqual(generateQuestions('star', 20, seeded()))
  })

  it.each<Level>(['sprout', 'bloom', 'garden', 'star'])('%s avoids reversed additions in ordinary sessions and offers plausible mistakes', (level) => {
    for (const rng of [seeded(), () => 0, () => 0.999999]) {
      for (const count of [15, 20]) {
        const questions = generateQuestions(level, count, rng)
        const additions = questions.filter((q) => q.op === '+')
        const sums = additions.map((q) => `${Math.min(q.a, q.b)}+${Math.max(q.a, q.b)}`)
        expect(new Set(sums).size).toBe(additions.length)
        for (const q of questions) {
          const plausible = [q.answer - 1, q.answer + 1, q.answer - 10, q.answer + 10,
            q.answer - 2, q.answer + 2, q.op === '-' ? q.a + q.b : Math.abs(q.a - q.b)]
          expect(q.choices.filter((n) => n !== q.answer).every((n) => plausible.includes(n))).toBe(true)
        }
      }
    }
  })

  it('serves the complete balanced pool and rejects its first impossible count', () => {
    // Bloom has exactly 63 carrying additions and 63 borrowing subtractions.
    const questions = generateQuestions('bloom', 126, () => 0)
    expect(new Set(questions.map((q) => q.id)).size).toBe(126)
    expect(questions.filter((q) => q.op === '+')).toHaveLength(63)
    expect(() => generateQuestions('bloom', 127, () => 0)).toThrow(RangeError)
  })

  it('rejects impossible or invalid requests and accepts zero', () => {
    expect(generateQuestions('sprout', 0)).toEqual([])
    for (const count of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, 100_000]) {
      expect(() => generateQuestions('bloom', count)).toThrow(RangeError)
    }
    for (const rng of [() => -0.1, () => 1, () => NaN, () => Infinity]) {
      expect(() => generateQuestions('sprout', 1, rng)).toThrow(RangeError)
    }
  })
})

describe('regrouping and explanations', () => {
  it('detects carries and borrows at boundaries', () => {
    expect(needsRegroup(8, 2, '+')).toBe(true)
    expect(needsRegroup(8, 1, '+')).toBe(false)
    expect(needsRegroup(10, 1, '-')).toBe(true)
    expect(needsRegroup(20, 10, '-')).toBe(false)
    expect(needsRegroup(100, 99, '-')).toBe(true)
    expect(needsRegroup(46, 23, '-')).toBe(false)
  })

  it.each([
    question(8, 7, '+'), question(9, 11, '+'), question(58, 27, '+'), question(99, 1, '+'),
    question(6, 3, '+'), question(10, 10, '+'), question(42, 35, '+'),
    question(10, 9, '-'), question(20, 13, '-'), question(52, 28, '-'),
    question(100, 99, '-'), question(100, 1, '-'), question(10, 10, '-'),
    question(9, 9, '-'), question(46, 23, '-'), question(100, 10, '-'),
  ])('explains $id with valid intermediate equations', (q) => {
    const explanation = explain(q)
    expect(explanation.title).toMatch(/[\u4e00-\u9fff]/)
    expect(explanation.steps.length).toBeGreaterThanOrEqual(2)
    expect(explanation.steps.length).toBeLessThanOrEqual(3)
    for (const step of explanation.steps) {
      const [left, right] = step.equation.split(' = ')
      expect(evaluate(left)).toBe(evaluate(right))
      expect(step.caption).toMatch(/[\u4e00-\u9fff]/)
    }
    expect(evaluate(explanation.steps.at(-1)!.equation.split(' = ')[1])).toBe(q.answer)
  })

  it('uses split-to-ten and borrowing with the expected quantities', () => {
    expect(explain(question(58, 27, '+')).steps.map((step) => step.equation)).toEqual([
      '27 = 2 + 25', '58 + 2 = 60', '60 + 25 = 85',
    ])
    expect(explain(question(52, 28, '-')).steps.map((step) => step.equation)).toEqual([
      '52 = 40 + 12', '12 - 8 = 4', '40 - 20 + 4 = 24',
    ])
  })
})

describe('scoring', () => {
  it('counts first tries, retries, hints, unfinished questions, and operation accuracy', () => {
    const add = question(8, 7, '+')
    const subtract = question(20, 13, '-')
    const records: QuestionRecord[] = [
      { question: add, attempts: [15], hintUsed: false },
      { question: add, attempts: [14, 15], hintUsed: false },
      { question: add, attempts: [15], hintUsed: true },
      { question: subtract, attempts: [6, 7], hintUsed: true },
      { question: subtract, attempts: [7, 6], hintUsed: false },
      { question: subtract, attempts: [], hintUsed: false },
      { question: subtract, attempts: [6], hintUsed: false },
    ]
    expect(score(records)).toEqual({
      firstTry: 1, retried: 1, helped: 5,
      addition: { correct: 3, total: 3 }, subtraction: { correct: 1, total: 4 },
    })
  })

  it('returns zeroes for no records', () => {
    expect(score([])).toEqual({ firstTry: 0, retried: 0, helped: 0, addition: { correct: 0, total: 0 }, subtraction: { correct: 0, total: 0 } })
  })
})
