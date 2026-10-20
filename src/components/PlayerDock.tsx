import { isBismillah } from '../data/bismillah'
import {
  IconNext,
  IconNextSurah,
  IconPause,
  IconPlay,
  IconPrev,
  IconPrevSurah,
} from './TransportIcons'

interface Props {
  isPlaying: boolean
  currentAyah: number
  versesCount: number
  repeatIndex: number
  totalRepeats: number
  canPrevSurah: boolean
  canNextSurah: boolean
  onPrev: () => void
  onToggle: () => void
  onNext: () => void
  onPrevSurah: () => void
  onNextSurah: () => void
}

export function PlayerDock({
  isPlaying,
  currentAyah,
  versesCount,
  repeatIndex,
  totalRepeats,
  canPrevSurah,
  canNextSurah,
  onPrev,
  onToggle,
  onNext,
  onPrevSurah,
  onNextSurah,
}: Props) {
  const ayahLabel = isBismillah(currentAyah)
    ? 'Bismillah'
    : `Ayah ${currentAyah} / ${versesCount}`

  return (
    <footer className="player-dock">
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
