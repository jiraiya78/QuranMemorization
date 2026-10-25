import { useEffect } from 'react'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

type Direction = 'left' | 'right' | 'up' | 'down'

function candidates(): HTMLElement[] {
  const nodes = [...document.querySelectorAll<HTMLElement>(FOCUSABLE)]
  return nodes.filter((el) => {
    if (el.closest('[hidden], [aria-hidden="true"]')) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  })
}

/**
 * Pick the nearest control in the requested direction (TV D-pad navigation).
 * Uses the primary-axis distance plus a penalty for drifting off-axis so a grid
 * of buttons behaves the way a remote user expects.
 */
function findNext(current: HTMLElement, list: HTMLElement[], dir: Direction): HTMLElement | null {
  const from = current.getBoundingClientRect()
  const cx = from.left + from.width / 2
  const cy = from.top + from.height / 2

  let best: HTMLElement | null = null
  let bestScore = Infinity

  for (const el of list) {
    if (el === current || current.contains(el) || el.contains(current)) continue
    const r = el.getBoundingClientRect()
    const ex = r.left + r.width / 2
    const ey = r.top + r.height / 2
    const dx = ex - cx
    const dy = ey - cy

    const primary = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy
    if (primary <= 8) continue
    const perpendicular = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx)
    const score = primary + perpendicular * 1.6
    if (score < bestScore) {
      bestScore = score
      best = el
    }
  }

  return best
}

/**
 * TV / set-top-box remote navigation: arrow keys move focus between visible
 * controls and Enter/OK activates the focused one natively. Only enabled when
 * the app is in TV-navigation mode so car steering-wheel arrows keep stepping
 * ayat by default.
 */
export function useSpatialNav(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      const dir: Direction | null =
        event.key === 'ArrowLeft'
          ? 'left'
          : event.key === 'ArrowRight'
            ? 'right'
            : event.key === 'ArrowUp'
              ? 'up'
              : event.key === 'ArrowDown'
                ? 'down'
                : null

      if (!dir) {
        // Some remotes only report the keypad "OK" code.
        if (event.key === 'Enter' || event.key === 'Select' || event.code === 'NumpadEnter') {
          const active = document.activeElement as HTMLElement | null
          if (active && active !== document.body && active.tagName === 'BUTTON') {
            event.preventDefault()
            active.click()
          }
        }
        return
      }

      // Let open dialogs and text fields keep their native arrow behaviour.
      const active = document.activeElement as HTMLElement | null
      if (active && active.closest('[role="dialog"]')) {
        const list = candidates().filter((el) => active.closest('[role="dialog"]')!.contains(el))
        const next = findNext(active, list, dir)
        if (next) {
          event.preventDefault()
          next.focus()
        }
        return
      }
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT' ||
          active.isContentEditable)
      ) {
        return
      }

      const list = candidates()
      if (list.length === 0) return

      if (!active || active === document.body || !list.includes(active)) {
        event.preventDefault()
        const playButton = document.querySelector<HTMLElement>('.ctrl-main')
        ;(playButton ?? list[0]!).focus()
        return
      }

      const next = findNext(active, list, dir) ?? active
      event.preventDefault()
      if (next !== active) next.focus()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
