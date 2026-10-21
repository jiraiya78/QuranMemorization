import { useMemo, useState } from 'react'
import { filterSurahsByJuz, JUZ_COUNT, SURAH_LIST } from '../data/quran'
import type { DownloadStatus, RepeatMode, ThemeId } from '../types'

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'emerald', label: 'Emerald' },
  { id: 'indigo', label: 'Indigo' },
  { id: 'mushaf', label: 'Mushaf' },
]

interface Props {
  surahId: number
  mode: RepeatMode
  rangeFrom: number
  rangeTo: number
  versesCount: number
  theme: ThemeId
  downloadStatus: DownloadStatus
  downloadProgress: string
  collapsed: boolean
  onToggleCollapsed: () => void
  onSurahChange: (id: number) => void
  onModeChange: (mode: RepeatMode) => void
  onRangeFromChange: (n: number) => void
  onRangeToChange: (n: number) => void
  onThemeChange: (theme: ThemeId) => void
  onDownload: () => void
  onRemoveDownload: () => void
  onPlay: () => void
  onOpenSettings: () => void
  isPlaying: boolean
}

export function SetupPanel({
  surahId,
  mode,
  rangeFrom,
  rangeTo,
  versesCount,
  theme,
  downloadStatus,
  downloadProgress,
  collapsed,
  onToggleCollapsed,
  onSurahChange,
  onModeChange,
  onRangeFromChange,
  onRangeToChange,
  onThemeChange,
  onDownload,
  onRemoveDownload,
  onPlay,
  onOpenSettings,
  isPlaying,
}: Props) {
  const [juzFilter, setJuzFilter] = useState<number | 'all'>('all')
  const surah = SURAH_LIST.find((s) => s.id === surahId)
  const modeLabel =
    mode === 'ayah'
      ? 'Ayah'
      : mode === 'range'
        ? `${rangeFrom}–${rangeTo}`
        : mode === 'page'
          ? 'Page'
          : 'Surah'
  const summary = `${surah?.nameSimple ?? 'Surah'} · ${modeLabel}`
  const ayahOptions = Array.from({ length: versesCount }, (_, i) => i + 1)
  const visibleSurahs = useMemo(() => filterSurahsByJuz(juzFilter), [juzFilter])

  const handleJuzChange = (value: string) => {
    const next = value === 'all' ? 'all' : Number(value)
    setJuzFilter(next)
    const list = filterSurahsByJuz(next)
    if (!list.some((s) => s.id === surahId) && list[0]) {
      onSurahChange(list[0].id)
    }
  }

  return (
    <aside className={`setup-panel${collapsed ? ' is-collapsed' : ''}`}>
      <div className="setup-toolbar">
        <button
          type="button"
          className="collapse-toggle"
          aria-expanded={!collapsed}
          aria-controls="setup-body"
          onClick={onToggleCollapsed}
        >
          <span className="collapse-toggle-icon" aria-hidden="true">
            {collapsed ? '▾' : '▴'}
          </span>
          <span className="collapse-toggle-label">{collapsed ? 'Settings' : 'Hide'}</span>
        </button>

        {collapsed ? (
          <>
            <p className="setup-summary">{summary}</p>
            <button type="button" className="btn btn-primary btn-compact" onClick={onPlay}>
              {isPlaying ? 'Restart' : 'Play'}
            </button>
          </>
        ) : (
          <div className="setup-toolbar-brand">
            <div className="brand">ReciteHelper</div>
            <p className="brand-sub">Full Quran · Memorize</p>
          </div>
        )}
      </div>

      <div id="setup-body" className="setup-body">
        <label className="field">
          <span className="field-label">Theme</span>
          <div className="theme-swatches" role="radiogroup" aria-label="Theme">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`theme-swatch theme-${t.id}${theme === t.id ? ' active' : ''}`}
                aria-label={t.label}
                aria-checked={theme === t.id}
                role="radio"
                onClick={() => onThemeChange(t.id)}
              />
            ))}
          </div>
        </label>

        <label className="field">
          <span className="field-label">Juz</span>
          <select
            value={juzFilter === 'all' ? 'all' : String(juzFilter)}
            onChange={(e) => handleJuzChange(e.target.value)}
          >
            <option value="all">All 30 juz</option>
            {Array.from({ length: JUZ_COUNT }, (_, i) => i + 1).map((juz) => (
              <option key={juz} value={juz}>
                Juz {juz}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Surah</span>
          <select value={surahId} onChange={(e) => onSurahChange(Number(e.target.value))}>
            {visibleSurahs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}. {s.nameSimple} · {s.nameArabic}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span className="field-label">Mode</span>
          <div className="segmented segmented-2x2">
            <button
              type="button"
              className={mode === 'surah' ? 'active' : ''}
              onClick={() => onModeChange('surah')}
            >
              Surah ×N
            </button>
            <button
              type="button"
              className={mode === 'ayah' ? 'active' : ''}
              onClick={() => onModeChange('ayah')}
            >
              Ayah ×N
            </button>
            <button
              type="button"
              className={mode === 'range' ? 'active' : ''}
              onClick={() => onModeChange('range')}
            >
              A → B
            </button>
            <button
              type="button"
              className={mode === 'page' ? 'active' : ''}
              onClick={() => onModeChange('page')}
            >
              Repeat Page
            </button>
          </div>
        </div>

        {mode === 'range' ? (
          <div className="field field-row">
            <label className="field field-half">
              <span className="field-label">From ayah</span>
              <select value={rangeFrom} onChange={(e) => onRangeFromChange(Number(e.target.value))}>
                {ayahOptions.map((n) => (
                  <option key={`from-${n}`} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-half">
              <span className="field-label">To ayah</span>
              <select value={rangeTo} onChange={(e) => onRangeToChange(Number(e.target.value))}>
                {ayahOptions.map((n) => (
                  <option key={`to-${n}`} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <div className="setup-actions">
          <button type="button" className="btn btn-ghost" onClick={onOpenSettings}>
            ⚙ Settings
          </button>
          {downloadStatus === 'ready' ? (
            <button type="button" className="btn btn-ghost" onClick={onRemoveDownload}>
              Offline ready · Remove
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onDownload}
              disabled={downloadStatus === 'downloading'}
            >
              {downloadStatus === 'downloading'
                ? downloadProgress || 'Downloading…'
                : '⬇ Download for offline'}
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onPlay}>
            {isPlaying ? '▶ Restart' : '▶ Play'}
          </button>
        </div>
      </div>
    </aside>
  )
}
