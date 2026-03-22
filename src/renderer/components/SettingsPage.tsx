import { useState } from 'react'
import type { ThemeMeta } from '../../shared/types'

interface Props {
  visible: boolean
  themes: ThemeMeta[]
  onClose: () => void
  onImport: () => void
  onExport: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
}

export function SettingsPage({ visible, themes, onClose, onImport, onExport, onDelete, onRename }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  if (!visible) return null

  function startRename(theme: ThemeMeta) {
    setEditingId(theme.id)
    setEditingName(theme.name)
  }

  function commitRename(id: string) {
    if (editingName.trim()) onRename(id, editingName.trim())
    setEditingId(null)
  }

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0d0d1a] border border-white/10 rounded-2xl w-[480px] max-h-[70vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold">设置</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white/60 text-xs uppercase tracking-widest">主题管理</h3>
            <button onClick={onImport} className="text-xs text-white/60 hover:text-white border border-white/20 hover:border-white/50 rounded px-3 py-1 transition-all">
              导入主题
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {themes.map(theme => (
              <div key={theme.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 group">
                <div className="w-8 h-8 rounded-md flex-shrink-0" style={{ background: thumbnailGradient(theme.thumbnail) }} />

                {editingId === theme.id ? (
                  <input
                    className="flex-1 bg-white/10 text-white text-sm rounded px-2 py-1 outline-none border border-white/20 focus:border-white/50"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onBlur={() => commitRename(theme.id)}
                    onKeyDown={e => e.key === 'Enter' && commitRename(theme.id)}
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 text-white/80 text-sm">{theme.name}</span>
                )}

                {theme.isBuiltIn && (
                  <span className="text-white/20 text-xs">内置</span>
                )}

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!theme.isBuiltIn && (
                    <button onClick={() => startRename(theme)} className="text-xs text-white/40 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-all">
                      重命名
                    </button>
                  )}
                  <button onClick={() => onExport(theme.id)} className="text-xs text-white/40 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-all">
                    导出
                  </button>
                  {!theme.isBuiltIn && (
                    <button onClick={() => onDelete(theme.id)} className="text-xs text-red-400/60 hover:text-red-400 px-2 py-1 rounded hover:bg-red-400/10 transition-all">
                      删除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
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
