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
          className="chrome-btn chrome-btn-gear"
          aria-label={panelOpenInFullscreen ? 'Hide settings panel' : 'Open settings panel'}
          aria-pressed={panelOpenInFullscreen}
          title={panelOpenInFullscreen ? 'Hide settings' : 'Settings'}
          onClick={onTogglePanel}
        >
          <span aria-hidden="true">⚙</span>
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
