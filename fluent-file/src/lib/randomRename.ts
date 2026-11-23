/** "Random rename": a style is a pattern with tokens. Built-in styles plus the user's own (Settings > Context menu).
 *    {l:8} lowercase letters   {u:8} UPPERCASE   {d:6} digits   {a:10} lowercase letters + digits   {A:10} mixed-case letters + digits
 *    {guid} UUID v4   {date} yyyyMMdd   {time} HHmmss   {ts} unix seconds   {n} / {n:3} running number   {name} original name   {word} random word */
export interface RandomStyle { id: string; label: string; pattern: string }
export const BUILTIN_STYLES: { id: string; key: string; pattern: string }[] = [
  { id: 'letters', key: 'rr.letters', pattern: '{l:8}' },
  { id: 'alnum', key: 'rr.alnum', pattern: '{a:10}' },
  { id: 'digits', key: 'rr.digits', pattern: '{d:8}' },
  { id: 'guid', key: 'rr.guid', pattern: '{guid}' },
  { id: 'datetime', key: 'rr.datetime', pattern: '{date}_{time}_{a:4}' },
  { id: 'words', key: 'rr.words', pattern: '{word}-{word}-{d:2}' },
  { id: 'keep', key: 'rr.keep', pattern: '{name}_{a:5}' }
];

const WORDS_A = ['brave', 'calm', 'clever', 'cosmic', 'crisp', 'eager', 'fancy', 'gentle', 'happy', 'jolly', 'keen', 'lucky', 'mellow', 'noble', 'quiet', 'rapid', 'shiny', 'sunny', 'swift', 'witty'];
const WORDS_B = ['badger', 'comet', 'falcon', 'fox', 'garden', 'harbor', 'island', 'koala', 'lantern', 'maple', 'meadow', 'otter', 'panda', 'pebble', 'river', 'robin', 'sparrow', 'tiger', 'willow', 'zebra'];
const rnd = (n: number) => { const b = new Uint32Array(1); crypto.getRandomValues(b); return b[0] % n; };
const pick = (chars: string, len: number) => Array.from({ length: Math.max(1, Math.min(64, len)) }, () => chars[rnd(chars.length)]).join('');
const LOWER = 'abcdefghijklmnopqrstuvwxyz', UPPER = LOWER.toUpperCase(), DIGITS = '0123456789';
const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export function expandPattern(pattern: string, ctx: { index: number; name: string }): string {
  const d = new Date(); let words = 0; // 1st {word} is an adjective, 2nd a noun, then alternating
  return pattern.replace(/\{(\w+)(?::(\d+))?\}/g, (m, tok: string, arg?: string) => {
    const n = arg ? Number(arg) : 8;
    switch (tok) {
      case 'l': return pick(LOWER, n);
      case 'u': return pick(UPPER, n);
      case 'd': return pick(DIGITS, n);
      case 'a': return pick(LOWER + DIGITS, n);
      case 'A': return pick(LOWER + UPPER + DIGITS, n);
      case 'guid': return crypto.randomUUID();
      case 'date': return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
      case 'time': return `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
      case 'ts': return String(Math.floor(Date.now() / 1000));
      case 'n': return arg ? pad(ctx.index, Number(arg)) : String(ctx.index);
      case 'name': return ctx.name;
      case 'word': return (words++ % 2 === 0 ? WORDS_A : WORDS_B)[rnd(20)];
      default: return m;
    }
  });
}
/** a valid Windows file name stem */
export const safeName = (s: string) => s.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').replace(/[. ]+$/g, '').trim().slice(0, 120);
