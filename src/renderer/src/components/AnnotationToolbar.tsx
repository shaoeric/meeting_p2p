import { useStore } from '../store'
import { annotationsService } from '../services/annotations'

const TOOLS = [
  { id: 'rect' as const, label: '矩形', icon: '⬜' },
  { id: 'arrow' as const, label: '箭头', icon: '➡️' },
  { id: 'text' as const, label: '文本', icon: 'T' }
]

const COLORS = ['#ff4444', '#4488ff', '#44cc44', '#ffcc00', '#ffffff', '#000000']

export default function AnnotationToolbar() {
  const store = useStore()

  if (!store.screenStream) {
    return null
  }

  return (
    <div className="annotation-toolbar">
      <div className="toolbar-section">
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            className={`tool-btn ${store.activeTool === tool.id ? 'active' : ''}`}
            onClick={() => store.setActiveTool(store.activeTool === tool.id ? null : tool.id)}
            title={tool.label}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-label">{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        {COLORS.map(color => (
          <button
            key={color}
            className={`color-btn ${store.activeColor === color ? 'active' : ''}`}
            style={{
              backgroundColor: color,
              border: color === '#ffffff' ? '2px solid #555' : '2px solid transparent'
            }}
            onClick={() => store.setActiveColor(color)}
            title={color}
          />
        ))}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <label className="slider-label">线宽: {store.lineWidth}px</label>
        <input
          type="range"
          min="1"
          max="10"
          value={store.lineWidth}
          onChange={e => store.setLineWidth(Number(e.target.value))}
          className="slider"
        />
      </div>

      <div className="toolbar-section">
        <label className={`slider-label ${store.activeTool !== 'text' ? 'disabled' : ''}`}>
          字号: {store.fontSize}px
        </label>
        <input
          type="range"
          min="12"
          max="48"
          value={store.fontSize}
          onChange={e => store.setFontSize(Number(e.target.value))}
          className="slider"
          disabled={store.activeTool !== 'text'}
        />
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <button
          className="tool-btn"
          onClick={() => annotationsService.undo()}
          disabled={annotationsService.getUndoCount() === 0}
          title="撤销"
        >
          ↩️ 撤销
        </button>
        <button
          className="tool-btn"
          onClick={() => annotationsService.redo()}
          disabled={annotationsService.getRedoCount() === 0}
          title="重做"
        >
          ↪️ 重做
        </button>
        <button
          className="tool-btn danger"
          onClick={() => annotationsService.clearAnnotations()}
          title="清空"
        >
          🗑️ 清空
        </button>
      </div>
    </div>
  )
}
