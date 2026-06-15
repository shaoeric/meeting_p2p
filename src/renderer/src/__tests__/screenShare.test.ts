import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../services/room', () => ({
  roomService: {
    getConnection: vi.fn(() => null)
  }
}))

import { screenShareService } from '../services/screenShare'
import { roomService } from '../services/room'

function mockScreenStream(peerId: string): MediaStream {
  return {
    getVideoTracks: () => [{ stop: vi.fn() } as any],
    getAudioTracks: () => [],
    getTracks: () => [{ stop: vi.fn() } as any]
  } as unknown as MediaStream
}

function mockVideoStream(): MediaStream {
  const videoTrack = {
    stop: vi.fn(),
    onended: null as any
  }
  return {
    getVideoTracks: () => [videoTrack],
    getAudioTracks: () => [],
    getTracks: () => [videoTrack]
  } as unknown as MediaStream
}

function mockAudioOnlyStream(): MediaStream {
  return {
    getVideoTracks: () => [],
    getAudioTracks: () => [{ stop: vi.fn() } as any],
    getTracks: () => [{ stop: vi.fn() } as any]
  } as unknown as MediaStream
}

describe('ScreenShareService', () => {
  const mockConnection = {
    room: {
      addStream: vi.fn(),
      removeStream: vi.fn(),
      leave: vi.fn().mockResolvedValue(undefined),
      getPeers: vi.fn(),
      onPeerJoin: vi.fn(),
      onPeerLeave: vi.fn(),
      onPeerStream: vi.fn(),
      makeAction: vi.fn()
    },
    sendControl: vi.fn().mockResolvedValue(undefined),
    selfId: 'test-self',
    leave: vi.fn().mockResolvedValue(undefined),
    getPeers: vi.fn(() => ({})),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    screenShareService.cleanup()
    vi.mocked(roomService.getConnection).mockReturnValue(null)
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia: vi.fn().mockResolvedValue(mockVideoStream())
      }
    })
  })

  describe('handleRemoteStarted', () => {
    it('sets someoneSharing to true', () => {
      screenShareService.handleRemoteStarted({ peerId: 'peer-1' })

      expect(screenShareService.getIsSomeoneSharing()).toBe(true)
    })
  })

  describe('handleRemoteStopped', () => {
    it('sets someoneSharing to false, clears remoteScreenStreams, fires callback', () => {
      const stream = mockScreenStream('peer-1')
      screenShareService.handleRemoteStream(stream, 'peer-1')

      const callback = vi.fn()
      screenShareService.setCallbacks({ onScreenShareStop: callback })

      screenShareService.handleRemoteStopped()

      expect(screenShareService.getIsSomeoneSharing()).toBe(false)
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe('handleRemoteStream', () => {
    it('skips streams with no video tracks', () => {
      const callback = vi.fn()
      screenShareService.setCallbacks({ onScreenShareStart: callback })

      screenShareService.handleRemoteStream(mockAudioOnlyStream(), 'peer-1')

      expect(screenShareService.getIsSomeoneSharing()).toBe(false)
      expect(callback).not.toHaveBeenCalled()
    })

    it('skips duplicate peerId', () => {
      const callback = vi.fn()
      screenShareService.setCallbacks({ onScreenShareStart: callback })

      const stream1 = mockScreenStream('peer-1')
      screenShareService.handleRemoteStream(stream1, 'peer-1')

      const stream2 = mockScreenStream('peer-1')
      screenShareService.handleRemoteStream(stream2, 'peer-1')

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('adds stream, sets someoneSharing, fires callback', () => {
      const callback = vi.fn()
      screenShareService.setCallbacks({ onScreenShareStart: callback })

      const stream = mockScreenStream('peer-2')
      screenShareService.handleRemoteStream(stream, 'peer-2')

      expect(screenShareService.getIsSomeoneSharing()).toBe(true)
      expect(callback).toHaveBeenCalledWith(stream, 'peer-2')
    })
  })

  describe('getIsSomeoneSharing', () => {
    it('returns correct state', () => {
      expect(screenShareService.getIsSomeoneSharing()).toBe(false)

      screenShareService.handleRemoteStarted({ peerId: 'peer-1' })
      expect(screenShareService.getIsSomeoneSharing()).toBe(true)

      screenShareService.handleRemoteStopped()
      expect(screenShareService.getIsSomeoneSharing()).toBe(false)
    })
  })

  describe('getIsSharing', () => {
    it('returns isSharing', () => {
      expect(screenShareService.getIsSharing()).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('resets all state', () => {
      screenShareService.handleRemoteStarted({ peerId: 'peer-1' })
      expect(screenShareService.getIsSomeoneSharing()).toBe(true)

      screenShareService.cleanup()

      expect(screenShareService.getIsSomeoneSharing()).toBe(false)
      expect(screenShareService.getIsSharing()).toBe(false)
    })
  })

  describe('setCallbacks', () => {
    it('registers and fires callbacks', () => {
      const onStart = vi.fn()
      const onStop = vi.fn()

      screenShareService.setCallbacks({
        onScreenShareStart: onStart,
        onScreenShareStop: onStop
      })

      screenShareService.handleRemoteStarted({ peerId: 'peer-1' })
      expect(onStart).not.toHaveBeenCalled()

      const stream = mockScreenStream('peer-3')
      screenShareService.handleRemoteStream(stream, 'peer-3')
      expect(onStart).toHaveBeenCalledWith(stream, 'peer-3')

      screenShareService.handleRemoteStopped()
      expect(onStop).toHaveBeenCalledTimes(1)
    })
  })

  describe('startScreenShare', () => {
    it('throws 未连接房间 when no connection', async () => {
      vi.mocked(roomService.getConnection).mockReturnValue(null)

      await expect(screenShareService.startScreenShare()).rejects.toThrow('未连接房间')
    })

    it('throws 当前已有用户 when someoneSharing is true', async () => {
      vi.mocked(roomService.getConnection).mockReturnValue(mockConnection as any)
      screenShareService.handleRemoteStarted({ peerId: 'peer-1' })

      await expect(screenShareService.startScreenShare()).rejects.toThrow('当前已有用户在共享屏幕')
    })

    it('throws 您已 when already sharing', async () => {
      vi.mocked(roomService.getConnection).mockReturnValue(mockConnection as any)
      ;(screenShareService as any).isSharing = true

      await expect(screenShareService.startScreenShare()).rejects.toThrow('您已在共享屏幕')
    })

    it('succeeds and sets all state correctly', async () => {
      vi.mocked(roomService.getConnection).mockReturnValue(mockConnection as any)

      const callback = vi.fn()
      screenShareService.setCallbacks({ onScreenShareStart: callback })

      const result = await screenShareService.startScreenShare()

      expect(result).toBeDefined()
      expect(result.getVideoTracks).toBeDefined()
      expect(screenShareService.getIsSharing()).toBe(true)
      expect(screenShareService.getIsSomeoneSharing()).toBe(true)
      expect(screenShareService.getLocalScreenStream()).toBe(result)
      expect(mockConnection.room.addStream).toHaveBeenCalledWith(result)
      expect(mockConnection.sendControl).toHaveBeenCalledWith({
        type: 'screen-share-started',
        data: { peerId: 'test-self' }
      })
      expect(callback).toHaveBeenCalledWith(result, 'test-self')
    })

    it('registers onended handler on video track', async () => {
      vi.mocked(roomService.getConnection).mockReturnValue(mockConnection as any)

      const result = await screenShareService.startScreenShare()
      const videoTrack = result.getVideoTracks()[0] as any

      expect(videoTrack.onended).toBeInstanceOf(Function)
    })

    it('triggers stopScreenShare via onended handler', async () => {
      vi.mocked(roomService.getConnection).mockReturnValue(mockConnection as any)

      const result = await screenShareService.startScreenShare()
      const videoTrack = result.getVideoTracks()[0] as any

      expect(screenShareService.getIsSharing()).toBe(true)

      videoTrack.onended()

      expect(screenShareService.getIsSharing()).toBe(false)
      expect(screenShareService.getIsSomeoneSharing()).toBe(false)
      expect(mockConnection.room.removeStream).toHaveBeenCalledWith(result)
      expect(mockConnection.sendControl).toHaveBeenCalledWith({
        type: 'screen-share-stopped',
        data: {}
      })
    })
  })

  describe('stopScreenShare', () => {
    it('does nothing when no connection', () => {
      vi.mocked(roomService.getConnection).mockReturnValue(null)
      expect(() => screenShareService.stopScreenShare()).not.toThrow()
    })

    it('removes stream and sends control message', async () => {
      vi.mocked(roomService.getConnection).mockReturnValue(mockConnection as any)

      const onStop = vi.fn()
      screenShareService.setCallbacks({ onScreenShareStop: onStop })

      await screenShareService.startScreenShare()
      mockConnection.sendControl.mockClear()

      screenShareService.stopScreenShare()

      expect(mockConnection.room.removeStream).toHaveBeenCalled()
      expect(mockConnection.sendControl).toHaveBeenCalledWith({
        type: 'screen-share-stopped',
        data: {}
      })
      expect(screenShareService.getIsSharing()).toBe(false)
      expect(screenShareService.getIsSomeoneSharing()).toBe(false)
      expect(screenShareService.getLocalScreenStream()).toBeNull()
      expect(onStop).toHaveBeenCalledTimes(1)
    })
  })

  describe('getLocalScreenStream', () => {
    it('returns null initially', () => {
      expect(screenShareService.getLocalScreenStream()).toBeNull()
    })

    it('returns the stream after startScreenShare', async () => {
      vi.mocked(roomService.getConnection).mockReturnValue(mockConnection as any)

      const stream = await screenShareService.startScreenShare()
      expect(screenShareService.getLocalScreenStream()).toBe(stream)
    })

    it('returns null after cleanup', async () => {
      vi.mocked(roomService.getConnection).mockReturnValue(mockConnection as any)

      await screenShareService.startScreenShare()
      screenShareService.cleanup()

      expect(screenShareService.getLocalScreenStream()).toBeNull()
    })
  })

  describe('getIsSharing', () => {
    it('returns false initially', () => {
      expect(screenShareService.getIsSharing()).toBe(false)
    })

    it('returns true after startScreenShare', async () => {
      vi.mocked(roomService.getConnection).mockReturnValue(mockConnection as any)

      await screenShareService.startScreenShare()
      expect(screenShareService.getIsSharing()).toBe(true)
    })

    it('returns false after cleanup', async () => {
      vi.mocked(roomService.getConnection).mockReturnValue(mockConnection as any)

      await screenShareService.startScreenShare()
      expect(screenShareService.getIsSharing()).toBe(true)

      screenShareService.cleanup()
      expect(screenShareService.getIsSharing()).toBe(false)
    })
  })
})
