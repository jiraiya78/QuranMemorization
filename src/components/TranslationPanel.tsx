import { useEffect, useRef, useState } from 'react'

interface Props {
  /** Translated text of the playing ayah. */
  text: string
  /** Edition label shown in the panel head (e.g. Clear Quran). */
  credit: string
  /** `rail` = docked on the right, allowed to use the full column height. */
  variant?: 'bottom' | 'rail'
  /** Changing this collapses the panel and rewinds its scroll. */
  resetKey?: string | number
}

/**
 * Translation panel shared by the bottom slot and the landscape/TV side rail.
 * The bottom fade only appears while text is actually clipped below.
 */
export function TranslationPanel({ text, credit, variant = 'bottom', resetKey }: Props) {
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setExpanded(false)
    bodyRef.current?.scrollTo({ top: 0 })
  }, [resetKey])

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return

    const sync = () => {
      const overflowing = body.scrollHeight - body.clientHeight > 2
      const atEnd = body.scrollTop + body.clientHeight >= body.scrollHeight - 2
      body.classList.toggle('is-scrollable', overflowing)
      body.classList.toggle('is-at-end', atEnd)
    }

    sync()
    body.addEventListener('scroll', sync, { passive: true })
    const ro = new ResizeObserver(sync)
    ro.observe(body)
    if (body.firstElementChild) ro.observe(body.firstElementChild)
    return () => {
      body.removeEventListener('scroll', sync)
      ro.disconnect()
    }
  }, [text, expanded])

  return (
    <aside
      className={`floating-translation is-${variant}${expanded ? ' is-expanded' : ''}`}
      dir="ltr"
      aria-live="polite"
    >
      <div className="floating-translation-head">
        <span className="floating-translation-label">Translation</span>
        <div className="floating-translation-tools">
          <span className="floating-translation-credit">{credit}</span>
          <button
            type="button"
            className="floating-translation-toggle"
            aria-expanded={expanded}
            aria-label={expanded ? 'Shrink translation' : 'Expand translation'}
            title={expanded ? 'Shrink' : 'Expand'}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? '▾' : '▴'}
          </button>
        </div>
      </div>
      <div className="floating-translation-body" ref={bodyRef}>
        <p>{text}</p>
      </div>
    </aside>
  )
}
