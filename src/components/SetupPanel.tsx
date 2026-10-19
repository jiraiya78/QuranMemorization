import { RECITERS } from '../data/reciters'
import { SURAH_LIST } from '../data/quran'
import { FONT_SCALE_MAX, FONT_SCALE_MIN, FONT_SCALE_STEP } from '../lib/prefs'
import type { DisplayMode, DownloadStatus, FontId, RepeatMode, ThemeId } from '../types'

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'emerald', label: 'Emerald' },
  { id: 'indigo', label: 'Indigo' },
  { id: 'mushaf', label: 'Mushaf' },
]

const FONTS: { id: FontId; label: string }[] = [
  { id: 'ibm', label: 'IBM Plex Sans' },
  { id: 'amiri', label: 'Amiri' },
  { id: 'noto', label: 'Noto Naskh' },
  { id: 'scheherazade', label: 'Scheherazade' },
]

interface Props {
  surahId: number
  mode: RepeatMode
  repeats: number
  reciterId: string
  theme: ThemeId
  font: FontId
  fontScale: number
  displayMode: DisplayMode
  downloadStatus: DownloadStatus
  downloadProgress: string
  collapsed: boolean
  onToggleCollapsed: () => void
  onSurahChange: (id: number) => void
  onModeChange: (mode: RepeatMode) => void
  onRepeatsChange: (n: number) => void
  onReciterChange: (id: string) => void
  onThemeChange: (theme: ThemeId) => void
  onFontChange: (font: FontId) => void
  onFontScaleChange: (scale: number) => void
  onDisplayModeChange: (mode: DisplayMode) => void
  onDownload: () => void
  onRemoveDownload: () => void
  onPlay: () => void
  isPlaying: boolean
}

export function SetupPanel({
  surahId,
  mode,
  repeats,
  reciterId,
  theme,
  font,
  fontScale,
  displayMode,
  downloadStatus,
  downloadProgress,
  collapsed,
  onToggleCollapsed,
  onSurahChange,
  onModeChange,
  onRepeatsChange,
  onReciterChange,
  onThemeChange,
  onFontChange,
  onFontScaleChange,
  onDisplayModeChange,
  onDownload,
  onRemoveDownload,
  onPlay,
  isPlaying,
}: Props) {
  const surah = SURAH_LIST.find((s) => s.id === surahId)
  const modeLabel = mode === 'ayah' ? 'Ayah' : 'Surah'
  const summary = `${surah?.nameSimple ?? 'Surah'} · ${modeLabel} ×${repeats}`

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
            <p className="brand-sub">Juz Amma · Memorize</p>
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

        <div className="field">
          <span className="field-label">Ayah layout</span>
          <div className="segmented">
            <button
              type="button"
              className={displayMode === 'mushaf' ? 'active' : ''}
              onClick={() => onDisplayModeChange('mushaf')}
            >
              Mushaf page
            </button>
            <button
              type="button"
              className={displayMode === 'list' ? 'active' : ''}
              onClick={() => onDisplayModeChange('list')}
            >
              Ayah list
            </button>
          </div>
        </div>

        <label className="field">
          <span className="field-label">Arabic font</span>
          <select value={font} onChange={(e) => onFontChange(e.target.value as FontId)}>
            {FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span className="field-label">Text size</span>
          <div className="stepper">
            <button
              type="button"
              aria-label="Decrease text size"
              disabled={fontScale <= FONT_SCALE_MIN}
              onClick={() =>
                onFontScaleChange(
                  Math.max(FONT_SCALE_MIN, Number((fontScale - FONT_SCALE_STEP).toFixed(1))),
                )
              }
            >
              A−
            </button>
            <span className="stepper-value stepper-value-sm">{Math.round(fontScale * 100)}%</span>
            <button
              type="button"
              aria-label="Increase text size"
              disabled={fontScale >= FONT_SCALE_MAX}
              onClick={() =>
                onFontScaleChange(
                  Math.min(FONT_SCALE_MAX, Number((fontScale + FONT_SCALE_STEP).toFixed(1))),
                )
              }
            >
              A+
            </button>
          </div>
        </div>

        <label className="field">
          <span className="field-label">Surah</span>
          <select value={surahId} onChange={(e) => onSurahChange(Number(e.target.value))}>
            {SURAH_LIST.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}. {s.nameSimple} · {s.nameArabic}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span className="field-label">Mode</span>
          <div className="segmented">
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
          </div>
        </div>

        <div className="field">
          <span className="field-label">Repeats</span>
          <div className="stepper">
            <button
              type="button"
              aria-label="Decrease repeats"
              onClick={() => onRepeatsChange(Math.max(1, repeats - 1))}
            >
              −
            </button>
            <span className="stepper-value">{repeats}</span>
            <button
              type="button"
              aria-label="Increase repeats"
              onClick={() => onRepeatsChange(Math.min(99, repeats + 1))}
            >
              +
            </button>
          </div>
        </div>

        <label className="field">
          <span className="field-label">Reciter</span>
          <select value={reciterId} onChange={(e) => onReciterChange(e.target.value)}>
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <div className="setup-actions">
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
