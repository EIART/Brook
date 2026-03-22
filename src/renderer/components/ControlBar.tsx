interface Props {
  visible: boolean
  hasTranslation: boolean
  translationEnabled: boolean
  onTheme: () => void
  onTranslation: () => void
  onSettings: () => void
}

export function ControlBar({ visible, hasTranslation, translationEnabled, onTheme, onTranslation, onSettings }: Props) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8 py-4"
      style={{
        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.3s ease',
      }}
    >
      <div className="flex gap-4">
        <button onClick={onTheme} className="text-white/60 hover:text-white text-sm px-3 py-1 rounded border border-white/20 hover:border-white/50 transition-all">
          主题
        </button>
        {hasTranslation && (
          <button onClick={onTranslation} className={`text-sm px-3 py-1 rounded border transition-all ${translationEnabled ? 'text-white border-white/50' : 'text-white/60 border-white/20 hover:text-white hover:border-white/50'}`}>
            译文
          </button>
        )}
      </div>
      <button onClick={onSettings} className="text-white/60 hover:text-white text-sm px-3 py-1 rounded border border-white/20 hover:border-white/50 transition-all">
        设置
      </button>
    </div>
  )
}
