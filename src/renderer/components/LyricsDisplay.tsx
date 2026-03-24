import type { LyricsLine, TrackInfo, ThemeContainer } from '../../shared/types'

const EASE = 'var(--theme-transition-easing, cubic-bezier(0.16, 1, 0.3, 1))'
const DUR  = 'var(--theme-transition-duration, 380ms)'
const transition = `opacity ${DUR} ${EASE}, font-size ${DUR} ${EASE}, filter ${DUR} ${EASE}`

interface Props {
  lines: LyricsLine[]
  currentIndex: number
  showTranslation: boolean
  isPaused: boolean
  notFoundTrack?: TrackInfo | null
  /** @deprecated Accepted for App.tsx compatibility; removed in Task 7. Not used. */
  container?: ThemeContainer
}

export function LyricsDisplay({
  lines,
  currentIndex,
  showTranslation,
  isPaused,
  notFoundTrack,
}: Props): JSX.Element {
  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p
          data-testid="line-current"
          style={{
            fontSize: 'clamp(34px, 5.2vw, 60px)',
            fontWeight: 600,
            color: '#fff',
            textAlign: 'center',
            opacity: isPaused ? 0.5 : 1,
          }}
        >
          {notFoundTrack ? `${notFoundTrack.title} — ${notFoundTrack.artist}` : null}
        </p>
        {notFoundTrack && (
          <p style={{ fontSize: 'clamp(15px, 2.2vw, 24px)', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
            未找到歌词
          </p>
        )}
      </div>
    )
  }

  const prev        = lines[currentIndex - 1] ?? null
  const current     = lines[currentIndex]     ?? null
  const next        = lines[currentIndex + 1] ?? null
  const translation = (showTranslation && current?.translation) ? current.translation : null

  return (
    <div
      className="flex flex-col items-center justify-center h-full"
      style={{
        gap: 8,
        padding: '70px 60px 50px',
        opacity: isPaused ? 0.6 : 1,
        transition: 'opacity 0.3s',
      }}
    >
      {/* 上一行 */}
      <p
        data-testid="line-prev"
        className="text-center w-full"
        style={{
          fontSize: 'clamp(16px, 2.4vw, 26px)',
          fontWeight: 'var(--theme-context-weight, 300)' as React.CSSProperties['fontWeight'],
          color: 'var(--theme-context-color, rgba(255,255,255,0.28))',
          transition,
        }}
      >
        {prev?.text ?? null}
      </p>

      {/* 当前行 — key 强制 remount，触发 CSS 入场动画 */}
      <p
        key={currentIndex}
        data-testid="line-current"
        className="text-center w-full lyric-current-enter"
        style={{
          fontSize: 'clamp(34px, 5.2vw, 60px)',
          fontWeight: 'var(--theme-current-weight, 600)' as React.CSSProperties['fontWeight'],
          color: 'var(--theme-current-color, #fff)',
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          textShadow: 'var(--theme-current-glow, 0 0 40px rgba(255,255,255,0.25))',
          padding: '8px 0',
        }}
      >
        {current?.text ?? null}
      </p>

      {/* 译文（条件渲染） */}
      {translation !== null && (
        <p
          data-testid="line-translation"
          className="text-center w-full"
          style={{
            fontSize: 'clamp(15px, 2.2vw, 24px)',
            fontWeight: 'var(--theme-trans-weight, 300)' as React.CSSProperties['fontWeight'],
            color: 'var(--theme-trans-color, rgba(255,255,255,0.35))',
            fontStyle: 'var(--theme-trans-style, italic)' as React.CSSProperties['fontStyle'],
            transition,
          }}
        >
          {translation}
        </p>
      )}

      {/* 下一行 */}
      <p
        data-testid="line-next"
        className="text-center w-full"
        style={{
          fontSize: 'clamp(16px, 2.4vw, 26px)',
          fontWeight: 'var(--theme-context-weight, 300)' as React.CSSProperties['fontWeight'],
          color: 'var(--theme-context-color, rgba(255,255,255,0.18))',
          filter: 'blur(0.5px)',
          transition,
        }}
      >
        {next?.text ?? null}
      </p>
    </div>
  )
}
