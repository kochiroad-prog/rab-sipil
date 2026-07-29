// Parser & evaluator ekspresi aritmatika AMAN untuk formula job_template_items.
// Sengaja TIDAK memakai eval()/new Function() — tokenisasi + recursive-descent parser manual.
// Mendukung: + - * / ( ) unary minus, angka desimal, dan variabel (job_template_questions.key).

export type FormulaVars = Record<string, number>

export class FormulaError extends Error {}

type Token = { type: 'num'; value: number } | { type: 'ident'; value: string } | { type: 'op'; value: string }

function tokenize(expr: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < expr.length) {
    const ch = expr[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (/[0-9.]/.test(ch)) {
      let j = i
      while (j < expr.length && /[0-9.]/.test(expr[j])) j++
      const numStr = expr.slice(i, j)
      const value = Number(numStr)
      if (!Number.isFinite(value)) throw new FormulaError(`Angka tidak valid: "${numStr}"`)
      tokens.push({ type: 'num', value })
      i = j
      continue
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i
      while (j < expr.length && /[a-zA-Z0-9_]/.test(expr[j])) j++
      tokens.push({ type: 'ident', value: expr.slice(i, j) })
      i = j
      continue
    }
    if ('+-*/()'.includes(ch)) {
      tokens.push({ type: 'op', value: ch })
      i++
      continue
    }
    throw new FormulaError(`Karakter tidak dikenal dalam formula: "${ch}"`)
  }
  return tokens
}

function parseTokens(tokens: Token[], vars: FormulaVars): number {
  let pos = 0
  const peek = () => tokens[pos]
  const next = () => tokens[pos++]

  function parseFactor(): number {
    const t = peek()
    if (!t) throw new FormulaError('Formula tidak lengkap.')
    if (t.type === 'num') {
      next()
      return t.value
    }
    if (t.type === 'ident') {
      next()
      const v = vars[t.value]
      if (v === undefined) throw new FormulaError(`Variabel tidak dikenal: "${t.value}"`)
      return v
    }
    if (t.type === 'op' && t.value === '(') {
      next()
      const v = parseExpr()
      const close = next()
      if (!close || close.type !== 'op' || close.value !== ')') throw new FormulaError('Kurung tidak seimbang.')
      return v
    }
    if (t.type === 'op' && t.value === '-') {
      next()
      return -parseFactor()
    }
    if (t.type === 'op' && t.value === '+') {
      next()
      return parseFactor()
    }
    throw new FormulaError(`Token tak terduga: "${t.value}"`)
  }

  function parseTerm(): number {
    let v = parseFactor()
    let t = peek()
    while (t && t.type === 'op' && (t.value === '*' || t.value === '/')) {
      next()
      const rhs = parseFactor()
      v = t.value === '*' ? v * rhs : v / rhs
      t = peek()
    }
    return v
  }

  function parseExpr(): number {
    let v = parseTerm()
    let t = peek()
    while (t && t.type === 'op' && (t.value === '+' || t.value === '-')) {
      next()
      const rhs = parseTerm()
      v = t.value === '+' ? v + rhs : v - rhs
      t = peek()
    }
    return v
  }

  const result = parseExpr()
  if (pos !== tokens.length) throw new FormulaError('Formula tidak valid (ada token tersisa).')
  return result
}

export function evalFormula(formula: string, vars: FormulaVars): number {
  const trimmed = (formula ?? '').trim()
  if (!trimmed) return 0
  return parseTokens(tokenize(trimmed), vars)
}

/** Versi aman untuk live preview di UI — tidak melempar, mengembalikan error sebagai string. */
export function tryEvalFormula(formula: string | null, vars: FormulaVars): { value: number; error: string | null } {
  if (!formula || !formula.trim()) return { value: 0, error: null }
  try {
    return { value: evalFormula(formula, vars), error: null }
  } catch (err) {
    return { value: 0, error: err instanceof Error ? err.message : 'Formula tidak valid' }
  }
}

/** Hitung volume 1 item template: formula(answers) x coefficient. Formula kosong -> volume = coefficient (qty tetap). */
export function computeItemVolume(formula: string | null, coefficient: number, vars: FormulaVars): { value: number; error: string | null } {
  if (!formula || !formula.trim()) return { value: coefficient, error: null }
  const { value, error } = tryEvalFormula(formula, vars)
  return { value: value * coefficient, error }
}
