import { isBismillah } from '../data/bismillah'

interface Props {
  isPlaying: boolean
  currentAyah: number
  versesCount: number
  repeatIndex: number
  totalRepeats: number
  onPrev: () => void
  onToggle: () => void
  onNext: () => void
}

export function PlayerDock({
  isPlaying,
  currentAyah,
  versesCount,
  repeatIndex,
  totalRepeats,
  onPrev,
  onToggle,
  onNext,
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
        <button type="button" className="ctrl" aria-label="Previous" onClick={onPrev}>
          ⏮
        </button>
        <button
          type="button"
          className="ctrl ctrl-main"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={onToggle}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button type="button" className="ctrl" aria-label="Next" onClick={onNext}>
          ⏭
        </button>
      </div>
      <span className="dock-stat">{ayahLabel}</span>
    </footer>
  )
}
