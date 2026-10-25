import { useEffect, useState } from 'react'
import { MUSHAF_PAGE_COUNT, clampPage } from '../data/mushaf'
import { toArabicIndic } from '../lib/arabicNumerals'

interface Props {
  current: number
  onClose: () => void
  onSubmit: (page: number) => void
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * Big numpad for "jump to page" — sized for a finger on a phone or a D-pad on
 * a TV. Arrow keys + Enter work through normal focus, digits type directly.
 */
export function PageJumpDialog({ current, onClose, onSubmit }: Props) {
  const [value, setValue] = useState('')

  const page = value === '' ? 0 : clampPage(Number(value))
  const canSubmit = page > 0

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        setValue((v) => (v.length >= 3 ? v : v + e.key))
        return
      }
      if (e.key === 'Backspace') {
        e.preventDefault()
        setValue((v) => v.slice(0, -1))
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'Enter' || e.key === 'OK' || e.key === 'Select') {
        e.preventDefault()
        const target = value === '' ? 0 : clampPage(Number(value))
        if (target > 0) onSubmit(target)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [value, onClose, onSubmit])

  const press = (digit: string) =>
    setValue((v) => (v.length >= 3 ? v : v + digit))

  return (
    <div className="page-jump-backdrop" role="presentation" onClick={onClose}>
      <div
        className="page-jump"
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-jump-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="page-jump-head">
          <h2 id="page-jump-title">Jump to page</h2>
          <button
            type="button"
            className="page-jump-close"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <output className="page-jump-display" aria-live="polite">
          <span className="page-jump-value">{value || '—'}</span>
          <span className="page-jump-of">/ {MUSHAF_PAGE_COUNT}</span>
        </output>
        <p className="page-jump-arabic" aria-hidden>
          {value ? toArabicIndic(page) : ''}
        </p>

        <div className="page-jump-pad">
          {DIGITS.map((d) => (
            <button
              key={d}
              type="button"
              className="page-jump-key"
              onClick={() => press(d)}
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            className="page-jump-key is-aux"
            aria-label="Delete last digit"
            onClick={() => setValue((v) => v.slice(0, -1))}
          >
            ⌫
          </button>
          <button type="button" className="page-jump-key" onClick={() => press('0')}>
            0
          </button>
          <button
            type="button"
            className="page-jump-key is-aux"
            aria-label="Clear"
            onClick={() => setValue('')}
          >
            C
          </button>
        </div>

        <div className="page-jump-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canSubmit}
            onClick={() => {
              if (page > 0) onSubmit(page)
            }}
          >
            OK
          </button>
        </div>
        <p className="page-jump-hint">Current page {current}</p>
      </div>
    </div>
  )
}
