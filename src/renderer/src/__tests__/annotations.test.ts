import { describe, it, expect, vi, beforeEach } from 'vitest'

const { sendControl } = vi.hoisted(() => ({
  sendControl: vi.fn()
}))

vi.mock('../services/room', () => ({
  roomService: {
    getConnection: vi.fn(() => ({
      sendControl,
      selfId: 'test-peer'
    }))
  }
}))

import { annotationsService } from '../services/annotations'

function makeAnnotation(overrides: Record<string, unknown> = {}) {
  return {
    type: 'rect' as const,
    x: 10,
    y: 20,
    width: 100,
    height: 50,
    color: '#ff0000',
    lineWidth: 2,
    fontSize: 16,
    text: '',
    peerId: 'test-peer',
    ...overrides
  }
}

describe('AnnotationsService', () => {
  beforeEach(() => {
    annotationsService.cleanup()
    sendControl.mockClear()
  })

  describe('addAnnotation', () => {
    it('creates annotation with unique id, pushes to undoStack, clears redoStack, notifies callback, calls synchronize', () => {
      const callback = vi.fn()
      annotationsService.setCallbacks({ onAnnotationChange: callback })

      const result = annotationsService.addAnnotation(makeAnnotation())

      expect(result.id).toBeDefined()
      expect(typeof result.id).toBe('string')
      expect(result.id).toContain('ann_')
      expect(result.timestamp).toBeGreaterThan(0)
      expect(result.peerId).toBe('test-peer')

      const svc = annotationsService as any
      expect(svc.undoStack).toHaveLength(1)
      expect(svc.undoStack[0]).toEqual([])
      expect(svc.redoStack).toHaveLength(0)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith([result])

      expect(sendControl).toHaveBeenCalledWith({
        type: 'annotation-add',
        data: { annotation: result }
      })
    })
  })

  describe('removeAnnotation', () => {
    it('filters out by id, pushes undo, clears redo, syncs', () => {
      const callback = vi.fn()
      annotationsService.setCallbacks({ onAnnotationChange: callback })

      const ann = annotationsService.addAnnotation(makeAnnotation())
      callback.mockClear()
      sendControl.mockClear()

      annotationsService.removeAnnotation(ann.id)

      const svc = annotationsService as any
      expect(svc.annotations).toHaveLength(0)
      expect(svc.undoStack).toHaveLength(2)
      expect(svc.redoStack).toHaveLength(0)

      expect(callback).toHaveBeenCalledWith([])
      expect(sendControl).toHaveBeenCalledWith({
        type: 'annotation-remove',
        data: { id: ann.id }
      })
    })
  })

  describe('clearAnnotations', () => {
    it('empties array, pushes undo, clears redo, syncs', () => {
      const callback = vi.fn()
      annotationsService.setCallbacks({ onAnnotationChange: callback })

      annotationsService.addAnnotation(makeAnnotation({ x: 1 }))
      annotationsService.addAnnotation(makeAnnotation({ x: 2 }))
      callback.mockClear()
      sendControl.mockClear()

      annotationsService.clearAnnotations()

      const svc = annotationsService as any
      expect(svc.annotations).toHaveLength(0)
      expect(svc.undoStack).toHaveLength(3)
      expect(svc.redoStack).toHaveLength(0)

      expect(callback).toHaveBeenCalledWith([])
      expect(sendControl).toHaveBeenCalledWith({
        type: 'annotation-clear',
        data: {}
      })
    })
  })

  describe('undo', () => {
    it('when undoStack has items, restores previous state and pushes current to redo', () => {
      const callback = vi.fn()
      annotationsService.setCallbacks({ onAnnotationChange: callback })
      annotationsService.addAnnotation(makeAnnotation({ x: 100 }))
      callback.mockClear()
      sendControl.mockClear()

      annotationsService.undo()

      const svc = annotationsService as any
      expect(svc.annotations).toEqual([])
      expect(svc.undoStack).toHaveLength(0)
      expect(svc.redoStack).toHaveLength(1)
      expect(svc.redoStack[0]).toHaveLength(1)

      expect(callback).toHaveBeenCalledWith([])
      expect(sendControl).toHaveBeenCalledWith({
        type: 'annotation-undo',
        data: {}
      })
    })

    it('when empty, does nothing', () => {
      const callback = vi.fn()
      annotationsService.setCallbacks({ onAnnotationChange: callback })

      annotationsService.undo()

      const svc = annotationsService as any
      expect(svc.undoStack).toHaveLength(0)
      expect(svc.redoStack).toHaveLength(0)
      expect(callback).not.toHaveBeenCalled()
      expect(sendControl).not.toHaveBeenCalled()
    })
  })

  describe('redo', () => {
    it('when redoStack has items, restores', () => {
      const callback = vi.fn()
      annotationsService.setCallbacks({ onAnnotationChange: callback })
      annotationsService.addAnnotation(makeAnnotation({ x: 400 }))
      annotationsService.undo()
      callback.mockClear()
      sendControl.mockClear()

      annotationsService.redo()

      const svc = annotationsService as any
      expect(svc.annotations).toHaveLength(1)
      expect(svc.undoStack).toHaveLength(1)
      expect(svc.redoStack).toHaveLength(0)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(sendControl).toHaveBeenCalledWith({
        type: 'annotation-redo',
        data: {}
      })
    })

    it('when empty, does nothing', () => {
      const callback = vi.fn()
      annotationsService.setCallbacks({ onAnnotationChange: callback })

      annotationsService.redo()

      const svc = annotationsService as any
      expect(callback).not.toHaveBeenCalled()
      expect(sendControl).not.toHaveBeenCalled()
    })
  })

  describe('undo+redo roundtrip', () => {
    it('restores original state after undo then redo', () => {
      annotationsService.setCallbacks({ onAnnotationChange: vi.fn() })
      const ann = annotationsService.addAnnotation(makeAnnotation({ x: 42 }))

      const svc = annotationsService as any
      const original = [...svc.annotations]

      annotationsService.undo()
      expect(svc.annotations).toEqual([])

      annotationsService.redo()
      expect(svc.annotations).toEqual(original)
    })
  })

  describe('handleRemote', () => {
    it("annotation-add adds if not duplicate", () => {
      const callback = vi.fn()
      annotationsService.setCallbacks({ onAnnotationChange: callback })

      const ann = { ...makeAnnotation(), id: 'remote-1', timestamp: 1000 }
      annotationsService.handleRemote('annotation-add', { annotation: ann })

      const svc = annotationsService as any
      expect(svc.annotations).toHaveLength(1)
      expect(svc.annotations[0]).toEqual(ann)
      expect(callback).toHaveBeenCalledWith([ann])
    })

    it('annotation-add skips if exists', () => {
      annotationsService.setCallbacks({ onAnnotationChange: vi.fn() })

      const ann = { ...makeAnnotation(), id: 'dup-id', timestamp: 1000 }
      annotationsService.handleRemote('annotation-add', { annotation: ann })
      const callback = vi.fn()
      annotationsService.setCallbacks({ onAnnotationChange: callback })

      annotationsService.handleRemote('annotation-add', { annotation: ann })

      const svc = annotationsService as any
      expect(svc.annotations).toHaveLength(1)
      expect(callback).not.toHaveBeenCalled()
    })

    it('annotation-remove removes by id', () => {
      const callback = vi.fn()
      annotationsService.setCallbacks({ onAnnotationChange: callback })

      annotationsService.addAnnotation(makeAnnotation())
      const ann2 = annotationsService.addAnnotation(makeAnnotation({ x: 99 }))
      callback.mockClear()

      annotationsService.handleRemote('annotation-remove', { id: ann2.id })

      const svc = annotationsService as any
      expect(svc.annotations).toHaveLength(1)
      expect(svc.annotations[0].id).not.toBe(ann2.id)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('annotation-clear clears all', () => {
      const callback = vi.fn()
      annotationsService.setCallbacks({ onAnnotationChange: callback })
      annotationsService.addAnnotation(makeAnnotation({ x: 1 }))
      annotationsService.addAnnotation(makeAnnotation({ x: 2 }))
      callback.mockClear()

      annotationsService.handleRemote('annotation-clear', {})

      const svc = annotationsService as any
      expect(svc.annotations).toHaveLength(0)
      expect(callback).toHaveBeenCalledWith([])
    })

    it('annotation-undo manipulates stacks', () => {
      const callback = vi.fn()
      annotationsService.setCallbacks({ onAnnotationChange: callback })
      annotationsService.addAnnotation(makeAnnotation({ x: 10 }))
      callback.mockClear()

      annotationsService.handleRemote('annotation-undo', {})

      const svc = annotationsService as any
      expect(svc.annotations).toEqual([])
      expect(svc.redoStack).toHaveLength(1)
      expect(callback).toHaveBeenCalledWith([])
    })

    it('annotation-redo manipulates stacks', () => {
      const callback = vi.fn()
      annotationsService.setCallbacks({ onAnnotationChange: callback })
      annotationsService.addAnnotation(makeAnnotation({ x: 5 }))
      annotationsService.undo()
      callback.mockClear()

      annotationsService.handleRemote('annotation-redo', {})

      const svc = annotationsService as any
      expect(svc.annotations).toHaveLength(1)
      expect(svc.redoStack).toHaveLength(0)
      expect(svc.undoStack).toHaveLength(1)
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe('getUndoCount / getRedoCount', () => {
    it('return correct counts', () => {
      expect(annotationsService.getUndoCount()).toBe(0)
      expect(annotationsService.getRedoCount()).toBe(0)

      annotationsService.addAnnotation(makeAnnotation())
      expect(annotationsService.getUndoCount()).toBe(1)
      expect(annotationsService.getRedoCount()).toBe(0)

      annotationsService.undo()
      expect(annotationsService.getUndoCount()).toBe(0)
      expect(annotationsService.getRedoCount()).toBe(1)

      annotationsService.redo()
      expect(annotationsService.getUndoCount()).toBe(1)
      expect(annotationsService.getRedoCount()).toBe(0)
    })
  })

  describe('cleanup', () => {
    it('resets everything', () => {
      annotationsService.addAnnotation(makeAnnotation())
      annotationsService.addAnnotation(makeAnnotation({ x: 10 }))
      annotationsService.undo()

      annotationsService.cleanup()

      const svc = annotationsService as any
      expect(svc.annotations).toEqual([])
      expect(svc.undoStack).toEqual([])
      expect(svc.redoStack).toEqual([])
      expect(svc.idCounter).toBe(0)
    })
  })
})
