import type { LyricsLine, TrackInfo, ThemeContainer } from '../../shared/types'

interface Props {
  lines: LyricsLine[]
  currentIndex: number
  showTranslation: boolean
  isPaused: boolean
  notFoundTrack?: TrackInfo | null
  container?: ThemeContainer
}

export function LyricsDisplay({
  lines,
  currentIndex,
  showTranslation,
  isPaused,
  notFoundTrack,
  container,
}: Props): JSX.Element {
  const containerStyle: React.CSSProperties = container
    ? {
        background: container.background,
        backdropFilter: `blur(${container.backdropBlur}px)`,
        border: container.border,
        borderRadius: container.borderRadius,
        padding: container.padding,
      }
    : {}

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p
          data-testid="line-current"
          className="text-[var(--theme-current-size)] text-[var(--theme-current-color)]"
          style={{ opacity: isPaused ? 0.5 : 1 }}
        >
          {notFoundTrack ? `${notFoundTrack.title} — ${notFoundTrack.artist}` : ''}
        </p>
        {notFoundTrack && (
          <p className="text-[var(--theme-context-size)] text-[var(--theme-context-color)]">
            未找到歌词
          </p>
        )}
      </div>
    )
  }

  const prev = currentIndex > 0 ? lines[currentIndex - 1] : null
  const current = lines[currentIndex] ?? null
  const next = currentIndex < lines.length - 1 ? lines[currentIndex + 1] : null
  const translation = showTranslation ? current?.translation : undefined

  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-4"
      style={{ opacity: isPaused ? 0.6 : 1, transition: 'opacity 0.3s' }}
    >
      <div style={containerStyle}>
        <p
          data-testid="line-prev"
          className="text-[var(--theme-context-size)] font-[var(--theme-context-weight)] text-[var(--theme-context-color)] transition-all"
          style={{
            transitionDuration: 'var(--theme-transition-duration)',
            transitionTimingFunction: 'var(--theme-transition-easing)',
          }}
        >
          {prev ? prev.text : null}
        </p>

        <p
          data-testid="line-current"
          className="text-[var(--theme-current-size)] font-[var(--theme-current-weight)] text-[var(--theme-current-color)] transition-all"
          style={{
            textShadow: 'var(--theme-current-glow)',
            transitionDuration: 'var(--theme-transition-duration)',
            transitionTimingFunction: 'var(--theme-transition-easing)',
          }}
        >
          {current ? current.text : null}
        </p>

        {translation !== undefined && (
          <p
            data-testid="line-translation"
            className="text-[var(--theme-trans-size)] font-[var(--theme-trans-weight)] text-[var(--theme-trans-color)]"
            style={{ fontStyle: 'var(--theme-trans-style)' as React.CSSProperties['fontStyle'] }}
          >
            {translation}
          </p>
        )}

        <p
          data-testid="line-next"
          className="text-[var(--theme-context-size)] font-[var(--theme-context-weight)] text-[var(--theme-context-color)] transition-all"
          style={{
            transitionDuration: 'var(--theme-transition-duration)',
            transitionTimingFunction: 'var(--theme-transition-easing)',
          }}
        >
          {next ? next.text : null}
        </p>
      </div>
    </div>
  )
}
