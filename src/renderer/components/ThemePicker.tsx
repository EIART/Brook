import type { ThemeMeta } from '../../shared/types'

interface Props {
  visible: boolean
  themes: ThemeMeta[]
  activeThemeId: string
  onSelect: (id: string) => void
  onImport: () => void
  onClose: () => void
}

export function ThemePicker({ visible, themes, activeThemeId, onSelect, onImport, onClose }: Props) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease',
        background: 'rgba(8,8,20,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '20px 24px 28px',
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <span className="text-white/40 text-xs uppercase tracking-widest">选择主题</span>
        <button onClick={onClose} className="text-white/40 hover:text-white text-lg leading-none">×</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {themes.map(theme => (
          <button
            key={theme.id}
            onClick={() => { onSelect(theme.id); onClose() }}
            className="flex flex-col items-center gap-1 group"
          >
            <div
              className="w-full h-12 rounded-lg overflow-hidden transition-all"
              style={{
                background: thumbnailGradient(theme.thumbnail),
                border: theme.id === activeThemeId ? '2px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.12)',
              }}
            />
            <span className="text-xs text-white/50 group-hover:text-white/80 transition-colors truncate w-full text-center">
              {theme.name}
            </span>
          </button>
        ))}

        {/* Import slot */}
        <button onClick={onImport} className="flex flex-col items-center gap-1 group">
          <div className="w-full h-12 rounded-lg flex items-center justify-center border border-dashed border-white/20 hover:border-white/40 transition-colors">
            <span className="text-white/30 text-xl group-hover:text-white/60 transition-colors">+</span>
          </div>
          <span className="text-xs text-white/30 group-hover:text-white/50 transition-colors">导入</span>
        </button>
      </div>
    </div>
  )
}

function thumbnailGradient(thumbnail: string): string {
  const colors = thumbnail.split(',').map(c => c.trim())
  return colors.length > 1
    ? `linear-gradient(135deg, ${colors.join(', ')})`
    : colors[0]
}
