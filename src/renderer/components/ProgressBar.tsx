interface Props {
  position: number  // current playback position (seconds)
  duration: number  // total duration (seconds)
}

export function ProgressBar({ position, duration }: Props): JSX.Element {
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          backgroundColor: 'rgba(255,255,255,0.28)',
          borderRadius: 1,
        }}
      />
    </div>
  )
}
