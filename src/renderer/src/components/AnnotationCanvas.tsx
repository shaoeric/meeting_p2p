import { useRef, useEffect, useState, useCallback } from 'react'
import { useStore } from '../store'
import { annotationsService } from '../services/annotations'

export default function AnnotationCanvas() {
  const store = useStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 })
  const [showTextInput, setShowTextInput] = useState(false)
  const [textInputPos, setTextInputPos] = useState({ x: 0, y: 0 })
  const [textValue, setTextValue] = useState('')
  const textInputRef = useRef<HTMLInputElement>(null)

  const getCanvasPos = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [])

  const drawAll = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    store.annotations.forEach(ann => {
      ctx.save()
      ctx.strokeStyle = ann.color
      ctx.fillStyle = ann.color
      ctx.lineWidth = ann.lineWidth
      ctx.font = `${ann.fontSize}px sans-serif`

      switch (ann.type) {
        case 'rect':
          ctx.strokeRect(ann.x, ann.y, ann.width, ann.height)
          break

        case 'arrow':
          drawArrow(ctx, ann.x, ann.y, ann.x + ann.width, ann.y + ann.height)
          break

        case 'text':
          ctx.fillText(ann.text, ann.x, ann.y)
          break
      }

      ctx.restore()
    })
  }, [store.annotations])

  useEffect(() => {
    const resizeCanvas = () => {
      const container = containerRef.current
      const canvas = canvasRef.current
      if (!container || !canvas) return

      const { width, height } = container.getBoundingClientRect()
      canvas.width = width
      canvas.height = height
      drawAll()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [drawAll])

  useEffect(() => {
    drawAll()
  }, [drawAll])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!store.activeTool) return

    const pos = getCanvasPos(e)

    if (store.activeTool === 'text') {
      setTextInputPos(pos)
      setTextValue('')
      setShowTextInput(true)
      setTimeout(() => textInputRef.current?.focus(), 50)
      return
    }

    setDrawing(true)
    setStartPos(pos)
    setCurrentPos(pos)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !store.activeTool) return
    const pos = getCanvasPos(e)
    setCurrentPos(pos)

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawAll()

    ctx.save()
    ctx.strokeStyle = store.activeColor
    ctx.fillStyle = store.activeColor
    ctx.lineWidth = store.lineWidth

    if (store.activeTool === 'rect') {
      const x = Math.min(startPos.x, pos.x)
      const y = Math.min(startPos.y, pos.y)
      const w = Math.abs(pos.x - startPos.x)
      const h = Math.abs(pos.y - startPos.y)
      ctx.strokeRect(x, y, w, h)
    } else if (store.activeTool === 'arrow') {
      drawArrow(ctx, startPos.x, startPos.y, pos.x, pos.y)
    }

    ctx.restore()
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!drawing || !store.activeTool) {
      setDrawing(false)
      return
    }

    const pos = getCanvasPos(e)

    if (store.activeTool === 'rect') {
      const x = Math.min(startPos.x, pos.x)
      const y = Math.min(startPos.y, pos.y)
      const w = Math.abs(pos.x - startPos.x)
      const h = Math.abs(pos.y - startPos.y)
      if (w > 2 || h > 2) {
        annotationsService.addAnnotation({
          type: 'rect',
          x,
          y,
          width: w,
          height: h,
          color: store.activeColor,
          lineWidth: store.lineWidth,
          fontSize: store.fontSize,
          text: ''
        })
      }
    } else if (store.activeTool === 'arrow') {
      const dx = pos.x - startPos.x
      const dy = pos.y - startPos.y
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        annotationsService.addAnnotation({
          type: 'arrow',
          x: startPos.x,
          y: startPos.y,
          width: dx,
          height: dy,
          color: store.activeColor,
          lineWidth: store.lineWidth,
          fontSize: store.fontSize,
          text: ''
        })
      }
    }

    setDrawing(false)
  }

  const handleTextSubmit = () => {
    if (textValue.trim()) {
      annotationsService.addAnnotation({
        type: 'text',
        x: textInputPos.x,
        y: textInputPos.y + store.fontSize,
        width: 0,
        height: 0,
        color: store.activeColor,
        lineWidth: store.lineWidth,
        fontSize: store.fontSize,
        text: textValue.trim()
      })
    }
    setShowTextInput(false)
    setTextValue('')
  }

  return (
    <div ref={containerRef} className="annotation-canvas-container">
      <canvas
        ref={canvasRef}
        className="annotation-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setDrawing(false)}
        style={{ cursor: store.activeTool ? 'crosshair' : 'default' }}
      />
      {showTextInput && (
        <input
          ref={textInputRef}
          type="text"
          className="text-input-overlay"
          style={{
            left: textInputPos.x,
            top: textInputPos.y,
            color: store.activeColor,
            fontSize: store.fontSize
          }}
          value={textValue}
          onChange={e => setTextValue(e.target.value)}
          onBlur={handleTextSubmit}
          onKeyDown={e => {
            if (e.key === 'Enter') handleTextSubmit()
            if (e.key === 'Escape') {
              setShowTextInput(false)
              setTextValue('')
            }
          }}
          placeholder="输入文本..."
        />
      )}
    </div>
  )
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): void {
  const headLength = 15
  const angle = Math.atan2(toY - fromY, toX - fromX)

  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX, toY)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(toX, toY)
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6)
  )
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6)
  )
  ctx.closePath()
  ctx.fill()
}
