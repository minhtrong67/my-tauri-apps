import { memo, useEffect, useRef } from 'react'
import { DEF } from '../lib/presets'
import { draw, layout, makeSample } from '../lib/render'
import type { Params, RenderState } from '../lib/types'

let sample: HTMLCanvasElement | null = null

/** Renders a real miniature of a style with the same renderer used for the output. */
export const LookThumb = memo(function LookThumb({ params, font }: { params: Partial<Params>; font: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    sample ??= makeSample(font)
    const P: Params = { ...DEF, ...params, ratio: '8:5', cap: '', wm: '', bdW: 0 }
    const crop = { x: 0, y: 0, w: sample.width, h: sample.height }
    const L = layout(P, crop), q = (184 * 2) / L.W
    cv.width = Math.round(L.W * q); cv.height = Math.round(L.H * q)
    const st: RenderState = { P, src: sample, k: 1, crop, ann: [], cur: null, bgImg: null, wmImg: null, font, selId: null, ui: false, dpr: 1 }
    draw(cv.getContext('2d')!, cv.width / L.W, L, st)
  }, [params, font])
  return <canvas ref={ref} className="block h-auto w-full" />
})
