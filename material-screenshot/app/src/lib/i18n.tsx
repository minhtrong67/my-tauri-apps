import { createContext, useContext } from 'react'
import { en, type K } from './dict'

export type Lang = 'vi' | 'en'
export type TFn = (k: K, v?: Record<string, string | number>) => string
export const LangCtx = createContext<{ lang: Lang; t: TFn }>({ lang: 'en', t: (k) => en[k] })
export const useT = () => useContext(LangCtx).t
export const useLang = () => useContext(LangCtx).lang
