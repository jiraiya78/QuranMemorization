import { isBismillah } from '../data/bismillah'
import {
  IconNext,
  IconNextSurah,
  IconPause,
  IconPlay,
  IconPrev,
  IconPrevSurah,
  IconStop,
} from './TransportIcons'

interface Props {
  isPlaying: boolean
  /** A source is loaded and Stop can clear it. */
  canStop?: boolean
  currentAyah: number
  versesCount: number
  repeatIndex: number
  totalRepeats: number
  canPrevSurah: boolean
  canNextSurah: boolean
  /** `rail` stacks the controls vertically inside the side panel. */
  variant?: 'bar' | 'rail'
  onPrev: () => void
  onToggle: () => void
  onNext: () => void
  onStop: () => void
  onPrevSurah: () => void
  onNextSurah: () => void
}

export function PlayerDock({
  isPlaying,
  canStop = false,
  currentAyah,
  versesCount,
  repeatIndex,
  totalRepeats,
  canPrevSurah,
  canNextSurah,
  variant = 'bar',
  onPrev,
  onToggle,
  onNext,
  onStop,
  onPrevSurah,
  onNextSurah,
}: Props) {
  const ayahLabel = isBismillah(currentAyah)
    ? 'Bismillah'
    : `Ayah ${currentAyah} / ${versesCount}`

  return (
    <footer className={`player-dock is-${variant}`}>
      <span className="dock-stat">
        Repeat {repeatIndex} / {totalRepeats}
      </span>
      <div className="dock-controls">
        <button
          type="button"
          className="ctrl ctrl-surah"
          aria-label="Previous surah"
          disabled={!canPrevSurah}
          onClick={onPrevSurah}
        >
          <IconPrevSurah />
        </button>
        <button type="button" className="ctrl" aria-label="Previous ayah" onClick={onPrev}>
          <IconPrev />
        </button>
        <button
          type="button"
          className="ctrl ctrl-main"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={onToggle}
        >
          {isPlaying ? <IconPause /> : <IconPlay />}
        </button>
        <button type="button" className="ctrl" aria-label="Next ayah" onClick={onNext}>
          <IconNext />
        </button>
        <button
          type="button"
          className="ctrl ctrl-stop"
          aria-label="Stop"
          title="Stop playback"
          disabled={!canStop}
          onClick={onStop}
        >
          <IconStop />
        </button>
        <button
          type="button"
          className="ctrl ctrl-surah"
          aria-label="Next surah"
          disabled={!canNextSurah}
          onClick={onNextSurah}
        >
          <IconNextSurah />
        </button>
      </div>
      <span className="dock-stat">{ayahLabel}</span>
    </footer>
  )
}
