import { MUSHAF_PAGE_COUNT, clampPage } from '../data/mushaf'

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
  return (
    <div className={`mushaf-page-chrome${compact ? ' is-compact' : ''}`}>
      <button
        type="button"
        className="mushaf-page-nav"
        disabled={page <= 1}
        aria-label="Previous page"
        onClick={() => onPageChange(clampPage(page - 1))}
      >
        ‹
      </button>
      <div className="mushaf-page-meta">
        <span className="mushaf-page-number">
          Page {page} / {MUSHAF_PAGE_COUNT}
        </span>
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
        disabled={page >= MUSHAF_PAGE_COUNT}
        aria-label="Next page"
        onClick={() => onPageChange(clampPage(page + 1))}
      >
        ›
      </button>
    </div>
  )
}
