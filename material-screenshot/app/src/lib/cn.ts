export type ClassValue = string | false | null | undefined | 0
export const cn = (...v: ClassValue[]) => v.filter(Boolean).join(' ')
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
