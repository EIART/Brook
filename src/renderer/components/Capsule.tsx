import type { TrackInfo } from '../../shared/types'

interface Props {
  track: TrackInfo | null
}

export function Capsule({ track }: Props): JSX.Element | null {
  if (!track) return null

  return (
    <div
      className="absolute flex items-center"
      style={{
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        gap: 10,
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 100,
        padding: '7px 16px 7px 10px',
        whiteSpace: 'nowrap',
      }}
    >
      {/* 专辑封面 */}
      {track.artworkUrl ? (
        <img
          src={track.artworkUrl}
          alt=""
          style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0, objectFit: 'cover' }}
        />
      ) : (
        <div style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0, background: 'rgba(255,255,255,0.15)' }} />
      )}

      {/* 歌名 */}
      <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em' }}>
        {track.title}
      </span>

      {/* 分隔点 */}
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />

      {/* 歌手名 */}
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
        {track.artist}
      </span>
    </div>
  )
}
