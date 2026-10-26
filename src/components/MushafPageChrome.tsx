import { useState } from 'react'
import { MUSHAF_PAGE_COUNT, clampPage } from '../data/mushaf'
import { PageJumpDialog } from './PageJumpDialog'

interface Props {
  page: number
  rangeLabel: string
  surahNames: string
  onPageChange: (page: number) => void
  compact?: boolean
}

export function MushafPageChrome({
  page,
  rangeLabel,
  surahNames,
  onPageChange,
  compact = false,
}: Props) {
  const [jumpOpen, setJumpOpen] = useState(false)

  return (
    <div className={`mushaf-page-chrome${compact ? ' is-compact' : ''}`}>
      {/*
       * RTL: the mushaf runs right to left, so "further in" (a higher page
       * number) lives to the left. The left arrow is therefore Next.
       */}
      <button
        type="button"
        className="mushaf-page-nav"
        disabled={page >= MUSHAF_PAGE_COUNT}
        aria-label="Next page"
        title="Next page"
        onClick={() => onPageChange(clampPage(page + 1))}
      >
        ‹
      </button>
      <div className="mushaf-page-meta">
        <button
          type="button"
          className="mushaf-page-number is-button"
          aria-haspopup="dialog"
          aria-label={`Page ${page} of ${MUSHAF_PAGE_COUNT} — jump to page`}
          title="Jump to page"
          onClick={() => setJumpOpen(true)}
        >
          Page {page} / {MUSHAF_PAGE_COUNT}
        </button>
        {rangeLabel ? (
          <span className="mushaf-page-limits" title={surahNames}>
            {rangeLabel}
            {surahNames ? ` · ${surahNames}` : ''}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        className="mushaf-page-nav"
        disabled={page <= 1}
        aria-label="Previous page"
        title="Previous page"
        onClick={() => onPageChange(clampPage(page - 1))}
      >
        ›
      </button>

      {jumpOpen ? (
        <PageJumpDialog
          current={page}
          onClose={() => setJumpOpen(false)}
          onSubmit={(target) => {
            setJumpOpen(false)
            onPageChange(target)
          }}
        />
      ) : null}
    </div>
  )
}
