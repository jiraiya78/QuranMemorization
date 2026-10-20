interface Props {
  isFullscreen: boolean
  panelOpenInFullscreen: boolean
  canInstall: boolean
  onToggleFullscreen: () => void
  onTogglePanel: () => void
  onInstall: () => void
}

export function ReaderChrome({
  isFullscreen,
  panelOpenInFullscreen,
  canInstall,
  onToggleFullscreen,
  onTogglePanel,
  onInstall,
}: Props) {
  return (
    <div className="reader-chrome">
      {isFullscreen ? (
        <button
          type="button"
          className="chrome-btn"
          aria-pressed={panelOpenInFullscreen}
          onClick={onTogglePanel}
        >
          {panelOpenInFullscreen ? 'Hide panel' : 'Settings panel'}
        </button>
      ) : null}
      <button
        type="button"
        className="chrome-btn"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        onClick={onToggleFullscreen}
      >
        {isFullscreen ? 'Exit full' : 'Fullscreen'}
      </button>
      {canInstall ? (
        <button type="button" className="chrome-btn chrome-btn-accent" onClick={onInstall}>
          Install app
        </button>
      ) : null}
    </div>
  )
}
