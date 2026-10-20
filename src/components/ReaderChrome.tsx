interface Props {
  isFullscreen: boolean
  canInstall: boolean
  onToggleFullscreen: () => void
  onInstall: () => void
}

export function ReaderChrome({
  isFullscreen,
  canInstall,
  onToggleFullscreen,
  onInstall,
}: Props) {
  return (
    <div className="reader-chrome">
      <button
        type="button"
        className="chrome-btn"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        onClick={onToggleFullscreen}
      >
        {isFullscreen ? '⛶ Exit' : '⛶ Full'}
      </button>
      {canInstall ? (
        <button type="button" className="chrome-btn chrome-btn-accent" onClick={onInstall}>
          ⬇ Install app
        </button>
      ) : null}
    </div>
  )
}
