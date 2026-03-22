import type { TrackInfo } from '../../shared/types'

interface Props {
  visible: boolean
  track: TrackInfo | null
  position: number
  onTheme: () => void
  onTranslation: () => void
  onSettings: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function ControlBar({ visible, track, position, onTheme, onTranslation, onSettings }: Props): JSX.Element {
  const duration = track?.duration ?? 0
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0

  const shortcuts = [
    { key: 'T', label: '主题',  action: onTheme },
    { key: 'L', label: '译文',  action: onTranslation },
    { key: ',', label: '设置',  action: onSettings },
  ]

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{
        gap: 16,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 200ms ease-out',
      }}
    >
      {/* 区块 1：曲目信息 */}
      <div className="flex items-center" style={{ gap: 10 }}>
        {track?.artworkUrl ? (
          <img
            src={track.artworkUrl}
            alt=""
            style={{ width: 36, height: 36, borderRadius: 7, flexShrink: 0, objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: 7, flexShrink: 0, background: 'rgba(255,255,255,0.1)' }} />
        )}
        <div className="flex flex-col" style={{ gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
            {track?.title ?? '—'}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            {track ? `${track.artist} · ${track.album}` : ''}
          </span>
        </div>
      </div>

      {/* 区块 2：进度条 */}
      <div className="flex items-center" style={{ gap: 8 }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{formatTime(position)}</span>
        <div style={{ width: 120, height: 2, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 1, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 1 }} />
        </div>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{formatTime(duration)}</span>
      </div>

      {/* 区块 3：快捷键徽章 */}
      <div className="flex" style={{ gap: 24 }}>
        {shortcuts.map(({ key, label, action }) => (
          <button
            key={key}
            onClick={action}
            className="flex flex-col items-center"
            style={{ gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div
              style={{
                width: 28, height: 28,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.8)',
              }}
            >
              {key}
            </div>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
