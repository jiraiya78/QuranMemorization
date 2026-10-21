import {
  IconBook,
  IconDownload,
  IconFullscreen,
  IconFullscreenExit,
} from './TransportIcons'

interface Props {
  isFullscreen: boolean
  panelOpen: boolean
  canInstall: boolean
  onToggleFullscreen: () => void
  onTogglePanel: () => void
  onInstall: () => void
}

export function ReaderChrome({
  isFullscreen,
  panelOpen,
  canInstall,
  onToggleFullscreen,
  onTogglePanel,
  onInstall,
}: Props) {
  return (
    <div className="reader-chrome">
      <button
        type="button"
        className="chrome-btn chrome-btn-icon chrome-btn-library"
        aria-label={panelOpen ? 'Hide library' : 'Open library'}
        aria-pressed={panelOpen}
        title={panelOpen ? 'Hide library' : 'Library'}
        onClick={onTogglePanel}
      >
        <IconBook />
      </button>
      <button
        type="button"
        className="chrome-btn chrome-btn-icon"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        onClick={onToggleFullscreen}
      >
        {isFullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
      </button>
      {canInstall ? (
        <button
          type="button"
          className="chrome-btn chrome-btn-icon chrome-btn-accent"
          aria-label="Install app"
          title="Install app"
          onClick={onInstall}
        >
          <IconDownload />
        </button>
      ) : null}
    </div>
  )
}
