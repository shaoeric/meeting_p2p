import { roomService } from './room'
import { Annotation } from '../store'

type OnAnnotationChange = (annotations: Annotation[]) => void

class AnnotationsService {
  private annotations: Annotation[] = []
  private undoStack: Annotation[][] = []
  private redoStack: Annotation[][] = []
  private onAnnotationChangeCb: OnAnnotationChange | null = null
  private idCounter = 0

  setCallbacks(callbacks: { onAnnotationChange?: OnAnnotationChange }): void {
    this.onAnnotationChangeCb = callbacks.onAnnotationChange || null
  }

  private generateId(): string {
    this.idCounter++
    return `ann_${Date.now()}_${this.idCounter}_${Math.random().toString(36).slice(2, 8)}`
  }

  private notifyChange(): void {
    this.onAnnotationChangeCb?.([...this.annotations])
  }

  private synchronize(type: string, data: Record<string, unknown>): void {
    const conn = roomService.getConnection()
    if (conn) {
      conn.sendControl({ type, data })
    }
  }

  addAnnotation(annotation: Omit<Annotation, 'id' | 'timestamp'>): Annotation {
    const conn = roomService.getConnection()

    this.undoStack.push([...this.annotations])
    this.redoStack = []

    const fullAnnotation: Annotation = {
      ...annotation,
      id: this.generateId(),
      timestamp: Date.now(),
      peerId: conn?.selfId || 'local'
    }

    this.annotations.push(fullAnnotation)
    this.notifyChange()
    this.synchronize('annotation-add', { annotation: fullAnnotation })

    return fullAnnotation
  }

  removeAnnotation(id: string): void {
    this.undoStack.push([...this.annotations])
    this.redoStack = []

    this.annotations = this.annotations.filter(a => a.id !== id)
    this.notifyChange()
    this.synchronize('annotation-remove', { id })
  }

  clearAnnotations(): void {
    this.undoStack.push([...this.annotations])
    this.redoStack = []

    this.annotations = []
    this.notifyChange()
    this.synchronize('annotation-clear', {})
  }

  undo(): void {
    if (this.undoStack.length === 0) return

    this.redoStack.push([...this.annotations])
    this.annotations = this.undoStack.pop()!
    this.notifyChange()
    this.synchronize('annotation-undo', {})
  }

  redo(): void {
    if (this.redoStack.length === 0) return

    this.undoStack.push([...this.annotations])
    this.annotations = this.redoStack.pop()!
    this.notifyChange()
    this.synchronize('annotation-redo', {})
  }

  handleRemote(type: string, data: Record<string, unknown>): void {
    switch (type) {
      case 'annotation-add': {
        const annotation = data.annotation as Annotation
        if (annotation) {
          const exists = this.annotations.find(a => a.id === annotation.id)
          if (!exists) {
            this.annotations.push(annotation)
            this.notifyChange()
          }
        }
        break
      }

      case 'annotation-remove': {
        const id = data.id as string
        if (id) {
          this.annotations = this.annotations.filter(a => a.id !== id)
          this.notifyChange()
        }
        break
      }

      case 'annotation-clear':
        this.annotations = []
        this.notifyChange()
        break

      case 'annotation-undo':
        if (this.undoStack.length > 0) {
          this.redoStack.push([...this.annotations])
          this.annotations = this.undoStack.pop()!
          this.notifyChange()
        }
        break

      case 'annotation-redo':
        if (this.redoStack.length > 0) {
          this.undoStack.push([...this.annotations])
          this.annotations = this.redoStack.pop()!
          this.notifyChange()
        }
        break
    }
  }

  getAnnotations(): Annotation[] {
    return this.annotations
  }

  getUndoCount(): number {
    return this.undoStack.length
  }

  getRedoCount(): number {
    return this.redoStack.length
  }

  cleanup(): void {
    this.annotations = []
    this.undoStack = []
    this.redoStack = []
    this.idCounter = 0
  }
}

export const annotationsService = new AnnotationsService()
