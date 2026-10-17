// Expression-based calculator state shared by the Standard and Scientific modes.
import { evaluate, prepare, isTrivial, formatNumber, CalcError } from './engine.js';

const OP_CHARS = '+\u2212\u00D7\u00F7^';
const FN_DISPLAY = {
  sin: 'sin(', cos: 'cos(', tan: 'tan(', asin: 'sin\u207B\u00B9(', acos: 'cos\u207B\u00B9(', atan: 'tan\u207B\u00B9(',
  sinh: 'sinh(', cosh: 'cosh(', tanh: 'tanh(', asinh: 'sinh\u207B\u00B9(', acosh: 'cosh\u207B\u00B9(', atanh: 'tanh\u207B\u00B9(',
  ln: 'ln(', log: 'log(', log2: 'log\u2082(', abs: 'abs(', floor: 'floor(', ceil: 'ceil(',
  sqrt: '\u221A(', cbrt: '\u221B(', exp10: '10^(', exp2: '2^(', expe: 'e^(', inv: '1\u00F7(',
};
const FN_TAIL = /(?:sinh\u207B\u00B9|cosh\u207B\u00B9|tanh\u207B\u00B9|sin\u207B\u00B9|cos\u207B\u00B9|tan\u207B\u00B9|sinh|cosh|tanh|sin|cos|tan|log\u2082|log|ln|abs|floor|ceil|\u221A|\u221B)\($/;
const FN_BEFORE_PAREN = /(?:sinh\u207B\u00B9|cosh\u207B\u00B9|tanh\u207B\u00B9|sin\u207B\u00B9|cos\u207B\u00B9|tan\u207B\u00B9|sinh|cosh|tanh|sin|cos|tan|log\u2082|log|ln|abs|floor|ceil|\u221A|\u221B)$/;
const NUM_TAIL = /(?:\d+\.?\d*|\.\d+)(?:e[+\-\u2212]?\d+)?$/;

const isOpChar = (c) => c !== '' && OP_CHARS.includes(c);
const endsOperand = (e) => /[\d.)!%\u03C0e]$/.test(e) || e.endsWith('Ans');
const countOpen = (e) => { let n = 0; for (const c of e) { if (c === '(') n++; else if (c === ')') n--; } return n; };

/** Index where the last operand (number, constant, group or function call) starts, or -1. */
function operandStart(e) {
  let i = e.length;
  while (i > 0 && (e[i - 1] === '!' || e[i - 1] === '%')) i--;
  if (!i) return -1;
  const c = e[i - 1];
  if (c === ')') {
    let depth = 0;
    for (let j = i - 1; j >= 0; j--) {
      if (e[j] === ')') depth++;
      else if (e[j] === '(') {
        depth--;
        if (depth === 0) {
          const m = FN_BEFORE_PAREN.exec(e.slice(0, j));
          return m ? j - m[0].length : j;
        }
      }
    }
    return -1;
  }
  if (e.slice(0, i).endsWith('Ans')) return i - 3;
  if (c === '\u03C0') return i - 1;
  if (c === 'e' && !/\d/.test(e[i - 2] || '')) return i - 1;
  const m = NUM_TAIL.exec(e.slice(0, i));
  return m ? i - m[0].length : -1;
}

export class Calc {
  expr = '';
  final = false;       // true right after "="
  value = null;        // numeric value of the last result
  resultText = '';
  error = null;
  ans = 0;
  angle = 'deg';

  #clearError() { this.error = null; }
  #resultExpr() { return this.resultText.replace('-', '\u2212'); }
  /** Prepare to append to an existing result (operators) or start fresh (new operand). */
  #continue(fresh) {
    if (!this.final) return;
    this.final = false;
    this.expr = fresh ? '' : this.#resultExpr();
  }

  get isEmpty() { return this.expr === ''; }

  press(key) {
    this.#clearError();
    if (/^\d$/.test(key)) return this.#digit(key);
    switch (key) {
      case '.': return this.#dot();
      case '+': case '-': case '*': case '/': case '^':
        return this.#op({ '+': '+', '-': '\u2212', '*': '\u00D7', '/': '\u00F7', '^': '^' }[key]);
      case 'mod': return this.#mod();
      case '(': return this.#openParen();
      case ')': return this.#closeParen();
      case 'paren': return this.#smartParen();
      case '=': return this.#equals();
      case 'bs': return this.#backspace();
      case 'ac': this.expr = ''; this.final = false; return;
      case 'pi': return this.#insertOperand('\u03C0');
      case 'e': return this.#insertOperand('e');
      case 'ans': return this.#insertOperand('Ans');
      case 'rand': return this.#insertOperand(formatNumber(Math.round(Math.random() * 1e6) / 1e6));
      case 'neg': return this.#negate();
      case 'pct': return this.#postfix('%');
      case 'fact': return this.#postfix('!');
      case 'sq': return this.#postfix('^2');
      case 'cube': return this.#postfix('^3');
      case 'exp': return this.#exponent();
      default:
        if (FN_DISPLAY[key]) return this.#fn(key);
    }
  }

  #digit(d) {
    this.#continue(true);
    const m = NUM_TAIL.exec(this.expr);
    if (m) { if (m[0] === '0') this.expr = this.expr.slice(0, -1); }
    else if (this.expr && endsOperand(this.expr)) this.expr += '\u00D7';
    this.expr += d;
  }
  #dot() {
    this.#continue(true);
    const m = NUM_TAIL.exec(this.expr);
    if (m) { if (m[0].includes('.') || /e/.test(m[0])) return; this.expr += '.'; return; }
    if (this.expr && endsOperand(this.expr)) this.expr += '\u00D7';
    this.expr += '0.';
  }
  #insertOperand(text) {
    this.#continue(true);
    if (this.expr && endsOperand(this.expr)) this.expr += '\u00D7';
    this.expr += text;
  }
  /** Insert a number typed elsewhere (memory recall, history, paste). */
  insertNumber(n) {
    const text = (typeof n === 'number' ? formatNumber(n) : String(n)).replace('-', '\u2212');
    this.error = null;
    this.#continue(true);
    if (this.expr && endsOperand(this.expr)) this.expr += '\u00D7';
    this.expr += text.startsWith('\u2212') ? `(${text})` : text;
  }
  load(expr) { this.error = null; this.final = false; this.expr = expr; }

  #op(sym) {
    this.#continue(false);
    const e = this.expr;
    if (e === '') { this.expr = sym === '\u2212' ? '\u2212' : sym === '+' ? '' : '0' + sym; return; }
    if (e.endsWith(' mod ')) { if (sym !== '\u2212') this.expr = e.slice(0, -5) + sym; return; }
    const last = e.slice(-1);
    if (last === '(') { if (sym === '\u2212') this.expr += '\u2212'; return; }
    if (isOpChar(last)) {
      let before = e.slice(0, -1);
      if (before === '' || before.endsWith('(')) return;            // lone unary minus
      if (isOpChar(before.slice(-1))) before = before.slice(0, -1);  // e.g. "5\u00D7\u2212" + op
      this.expr = before + sym;
      return;
    }
    this.expr += sym;
  }
  #mod() {
    this.#continue(false);
    if (!this.expr || !endsOperand(this.expr)) return;
    this.expr += ' mod ';
  }
  #openParen() {
    this.#continue(true);
    if (this.expr && endsOperand(this.expr)) this.expr += '\u00D7';
    this.expr += '(';
  }
  #closeParen() {
    this.#continue(false);
    const e = this.expr;
    if (countOpen(e) > 0 && endsOperand(e)) this.expr += ')';
  }
  #smartParen() {
    this.#continue(false);
    const e = this.expr;
    if (countOpen(e) > 0 && endsOperand(e)) this.expr += ')';
    else this.#openParen();
  }

  #fn(key) {
    this.#continue(false);
    const open = FN_DISPLAY[key];
    const s = operandStart(this.expr);
    if (s >= 0) {
      this.expr = this.expr.slice(0, s) + open + this.expr.slice(s) + ')';
    } else {
      if (this.expr && endsOperand(this.expr)) this.expr += '\u00D7';
      this.expr += open;
    }
  }
  #postfix(sym) {
    this.#continue(false);
    if (operandStart(this.expr) < 0) return;
    this.expr += sym;
  }
  #exponent() {
    this.#continue(false);
    if (this.expr && endsOperand(this.expr)) this.expr += '\u00D710^(';
  }
  #negate() {
    this.#continue(false);
    const e = this.expr;
    const s = operandStart(e);
    if (s < 0) {
      if (e === '' || isOpChar(e.slice(-1)) || e.endsWith('(')) this.expr += '(\u2212';
      return;
    }
    const operand = e.slice(s);
    if (operand.startsWith('(\u2212') && operand.endsWith(')') && countOpen(operand) === 0) {
      this.expr = e.slice(0, s) + operand.slice(2, -1);
    } else {
      this.expr = e.slice(0, s) + '(\u2212' + operand + ')';
    }
  }
  #backspace() {
    if (this.final) { this.final = false; this.expr = this.#resultExpr(); }
    let e = this.expr;
    if (e.endsWith(' mod ')) e = e.slice(0, -5);
    else if (e.endsWith('Ans')) e = e.slice(0, -3);
    else if (e.includes('(')) {
      const m = FN_TAIL.exec(e);
      e = m ? e.slice(0, -m[0].length) : e.slice(0, -1);
    } else e = e.slice(0, -1);
    this.expr = e;
  }

  #equals() {
    if (!this.expr || this.final) return;
    try {
      const src = prepare(this.expr);
      if (!src) return;
      const v = evaluate(src, { angle: this.angle, ans: this.ans });
      this.expr = src;
      this.value = v;
      this.resultText = formatNumber(v);
      this.ans = v;
      this.final = true;
      return { expr: src, result: this.resultText };
    } catch (err) {
      this.error = err instanceof CalcError ? err.code : 'SYNTAX';
    }
  }

  /** Live preview of the unfinished expression, or null. */
  preview() {
    if (this.final || !this.expr) return null;
    try {
      const src = prepare(this.expr);
      if (!src || isTrivial(src)) return null;
      return formatNumber(evaluate(src, { angle: this.angle, ans: this.ans }));
    } catch { return null; }
  }
  /** Numeric value currently on display (for memory operations / copy). */
  currentValue() {
    if (this.final) return this.value;
    if (!this.expr) return null;
    try {
      const src = prepare(this.expr);
      return src ? evaluate(src, { angle: this.angle, ans: this.ans }) : null;
    } catch { return null; }
  }
}
