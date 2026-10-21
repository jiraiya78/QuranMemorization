import { useMemo, useRef, type MouseEvent, type PointerEvent } from 'react'

const LONG_PRESS_MS = 480
const MOVE_TOLERANCE_PX = 12

export type AyahRef = { surahId: number; ayah: number }

/**
 * Touch/pen: long-press the ayah text to select.
 * Mouse: click the ayah-number mark only.
 */
export function useAyahSelectHandlers(
  surahId: number,
  ayah: number,
  onSelect: ((ref: AyahRef) => void) | undefined,
) {
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const pressRef = useRef({
    timer: null as number | null,
    startX: 0,
    startY: 0,
    armed: false,
    didLongPress: false,
  })

  return useMemo(() => {
    if (!onSelect) return {}

    const clear = () => {
      const p = pressRef.current
      if (p.timer != null) {
        window.clearTimeout(p.timer)
        p.timer = null
      }
      p.armed = false
    }

    const select = () => {
      onSelectRef.current?.({ surahId, ayah })
    }

    return {
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
          const p = pressRef.current
          p.didLongPress = false
          p.armed = true
          p.startX = e.clientX
          p.startY = e.clientY
          clear()
          p.armed = true
          p.timer = window.setTimeout(() => {
            p.timer = null
            if (!p.armed) return
            p.didLongPress = true
            select()
            try {
              navigator.vibrate?.(15)
            } catch {
              /* ignore */
            }
          }, LONG_PRESS_MS)
        }
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        const p = pressRef.current
        if (!p.armed) return
        const dx = e.clientX - p.startX
        const dy = e.clientY - p.startY
        if (dx * dx + dy * dy > MOVE_TOLERANCE_PX * MOVE_TOLERANCE_PX) clear()
      },
      onPointerUp: () => clear(),
      onPointerCancel: () => clear(),
      onContextMenu: (e: MouseEvent<HTMLElement>) => {
        e.preventDefault()
      },
      onClick: (e: MouseEvent<HTMLElement>) => {
        const p = pressRef.current
        if (p.didLongPress) {
          e.preventDefault()
          e.stopPropagation()
          p.didLongPress = false
          return
        }
        const t = e.target as HTMLElement | null
        if (t?.closest('.mushaf-ayah-mark, .ayah-number-hit')) {
          e.preventDefault()
          select()
        }
      },
    }
  }, [surahId, ayah, onSelect])
}
