import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../services/room', () => ({
  roomService: {
    getConnection: vi.fn(() => null)
  }
}))

import { voiceService } from '../services/voice'
import { roomService } from '../services/room'

function mockMediaStream(
  audioTracks: any[] = [{ enabled: true, stop: vi.fn() }],
  videoTracks: any[] = []
) {
  return {
    getAudioTracks: () => audioTracks,
    getVideoTracks: () => videoTracks,
    getTracks: () => [...audioTracks, ...videoTracks]
  } as unknown as MediaStream
}

function mockAudioStream(): MediaStream {
  return mockMediaStream([{ enabled: true, stop: vi.fn() }], [])
}

describe('VoiceService', () => {
  let mockSource: { connect: ReturnType<typeof vi.fn> }
  let mockDestination: { stream: Record<string, never> }
  let audioMocks: any[]
  let ctxMocks: any[]

  beforeEach(() => {
    vi.clearAllMocks()
    voiceService.cleanup()

    mockSource = { connect: vi.fn() }
    mockDestination = { stream: {} }
    audioMocks = []
    ctxMocks = []

    vi.stubGlobal('AudioContext', class {
      createMediaStreamSource = vi.fn(() => mockSource)
      createMediaStreamDestination = vi.fn(() => mockDestination)
      close = vi.fn()
      constructor() {
        ctxMocks.push(this)
      }
    })

    vi.stubGlobal('Audio', class {
      srcObject: any = null
      autoplay = false
      play = vi.fn(() => Promise.resolve())
      pause = vi.fn()
      remove = vi.fn()
      constructor() {
        audioMocks.push(this)
      }
    })

    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockAudioStream())
      }
    })

    vi.mocked(roomService.getConnection).mockReturnValue(null)
  })

  describe('toggleMute', () => {
    it('toggles isMuted and enables/disables audio tracks, fires callback', () => {
      const callback = vi.fn()
      voiceService.setCallbacks({ onMuteChange: callback })

      const audioTracks = [{ enabled: true, stop: vi.fn() }]
      const stream = mockMediaStream(audioTracks)
      ;(voiceService as any).localStream = stream

      const result = voiceService.toggleMute()
      expect(result).toBe(true)
      expect(voiceService.getIsMuted()).toBe(true)
      expect(audioTracks[0].enabled).toBe(false)
      expect(callback).toHaveBeenCalledWith(true)

      callback.mockClear()
      const result2 = voiceService.toggleMute()
      expect(result2).toBe(false)
      expect(voiceService.getIsMuted()).toBe(false)
      expect(audioTracks[0].enabled).toBe(true)
      expect(callback).toHaveBeenCalledWith(false)
    })

    it('when no localStream returns current mute state unchanged', () => {
      expect(voiceService.toggleMute()).toBe(false)
      expect(voiceService.getIsMuted()).toBe(false)
    })
  })

  describe('getIsMuted', () => {
    it('returns correct state', () => {
      expect(voiceService.getIsMuted()).toBe(false)

      const audioTracks = [{ enabled: true, stop: vi.fn() }]
      ;(voiceService as any).localStream = mockMediaStream(audioTracks)
      voiceService.toggleMute()

      expect(voiceService.getIsMuted()).toBe(true)
    })
  })

  describe('setCallbacks', () => {
    it('registers all 3 callbacks', () => {
      const onLocal = vi.fn()
      const onRemote = vi.fn()
      const onMute = vi.fn()

      voiceService.setCallbacks({
        onLocalStream: onLocal,
        onRemoteStream: onRemote,
        onMuteChange: onMute
      })

      const svc = voiceService as any
      expect(svc.onLocalStreamCb).toBe(onLocal)
      expect(svc.onRemoteStreamCb).toBe(onRemote)
      expect(svc.onMuteChangeCb).toBe(onMute)
    })
  })

  describe('handleRemoteStream', () => {
    it('skips streams with video but no audio', () => {
      const callback = vi.fn()
      voiceService.setCallbacks({ onRemoteStream: callback })

      const stream = mockMediaStream([], [{ stop: vi.fn() }])
      voiceService.handleRemoteStream(stream, 'peer-1')

      const svc = voiceService as any
      expect(svc.remoteStreams.has('peer-1')).toBe(false)
      expect(callback).not.toHaveBeenCalled()
    })

    it('skips duplicate peerId', () => {
      voiceService.setCallbacks({ onRemoteStream: vi.fn() })

      const stream1 = mockMediaStream([{ enabled: true, stop: vi.fn() }])
      voiceService.handleRemoteStream(stream1, 'peer-1')

      const callback = vi.fn()
      voiceService.setCallbacks({ onRemoteStream: callback })

      const stream2 = mockMediaStream([{ enabled: true, stop: vi.fn() }])
      voiceService.handleRemoteStream(stream2, 'peer-1')

      expect(callback).not.toHaveBeenCalled()
    })

    it('correctly creates AudioContext, routes audio, creates Audio element', () => {
      const callback = vi.fn()
      voiceService.setCallbacks({ onRemoteStream: callback })

      const audioTracks = [{ enabled: true, stop: vi.fn() }]
      const stream = mockMediaStream(audioTracks)
      voiceService.handleRemoteStream(stream, 'peer-2')

      const svc = voiceService as any
      expect(svc.remoteStreams.has('peer-2')).toBe(true)
      expect(svc.audioContext).not.toBeNull()

      expect(ctxMocks[0].createMediaStreamSource).toHaveBeenCalledWith(stream)
      expect(ctxMocks[0].createMediaStreamDestination).toHaveBeenCalled()
      expect(mockSource.connect).toHaveBeenCalledWith(mockDestination)

      expect(audioMocks).toHaveLength(1)
      expect(audioMocks[0].srcObject).toBe(mockDestination.stream)
      expect(audioMocks[0].autoplay).toBe(true)
      expect(audioMocks[0].play).toHaveBeenCalled()

      expect(callback).toHaveBeenCalledWith(stream, 'peer-2')
    })
  })

  describe('removeRemoteStream', () => {
    it('pauses and removes audio element', () => {
      voiceService.setCallbacks({ onRemoteStream: vi.fn() })

      const stream = mockMediaStream([{ enabled: true, stop: vi.fn() }])
      voiceService.handleRemoteStream(stream, 'peer-3')

      const audio = audioMocks[0]
      voiceService.removeRemoteStream('peer-3')

      expect(audio.pause).toHaveBeenCalled()
      expect(audio.srcObject).toBeNull()
      expect(audio.remove).toHaveBeenCalled()

      const svc = voiceService as any
      expect(svc.remoteAudioElements.has('peer-3')).toBe(false)
      expect(svc.remoteStreams.has('peer-3')).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('clears localStream, remoteStreams, audioElements, audioContext', () => {
      voiceService.setCallbacks({ onRemoteStream: vi.fn() })

      const audioTracks = [{ enabled: true, stop: vi.fn() }]
      const localStream = mockMediaStream(audioTracks)
      ;(voiceService as any).localStream = localStream

      const remoteStream = mockMediaStream([{ enabled: true, stop: vi.fn() }])
      voiceService.handleRemoteStream(remoteStream, 'peer-4')

      const ctx = ctxMocks[0]
      const audio = audioMocks[0]

      voiceService.cleanup()

      expect(audioTracks[0].stop).toHaveBeenCalled()

      const svc = voiceService as any
      expect(svc.localStream).toBeNull()
      expect(svc.remoteStreams.size).toBe(0)
      expect(svc.remoteAudioElements.size).toBe(0)
      expect(svc.audioContext).toBeNull()

      expect(ctx.close).toHaveBeenCalled()
      expect(audio.pause).toHaveBeenCalled()
      expect(audio.srcObject).toBeNull()
      expect(audio.remove).toHaveBeenCalled()
    })
  })

  describe('startLocalAudio', () => {
    const mockConnection = {
      room: {
        addStream: vi.fn()
      }
    }

    it('resolves with MediaStream and adds to room connection', async () => {
      vi.mocked(roomService.getConnection).mockReturnValue(mockConnection as any)

      const onLocalStream = vi.fn()
      voiceService.setCallbacks({ onLocalStream })

      const stream = await voiceService.startLocalAudio()

      expect(stream).toBeDefined()
      expect(stream.getAudioTracks).toBeDefined()
      expect(voiceService.getLocalStream()).toBe(stream)
      expect(mockConnection.room.addStream).toHaveBeenCalledWith(stream)
      expect(onLocalStream).toHaveBeenCalledWith(stream)
    })

    it('works even when getConnection returns null', async () => {
      vi.mocked(roomService.getConnection).mockReturnValue(null)

      const stream = await voiceService.startLocalAudio()

      expect(stream).toBeDefined()
      expect(voiceService.getLocalStream()).toBe(stream)
    })

    it('throws with Chinese error for NotAllowedError', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce({
        name: 'NotAllowedError',
        message: 'Permission denied'
      })

      await expect(voiceService.startLocalAudio()).rejects.toThrow('麦克风权限被拒绝')
    })

    it('throws with Chinese error for NotFoundError', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce({
        name: 'NotFoundError',
        message: 'No device found'
      })

      await expect(voiceService.startLocalAudio()).rejects.toThrow('未检测到麦克风设备')
    })

    it('throws with Chinese error for NotReadableError', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce({
        name: 'NotReadableError',
        message: 'Device in use'
      })

      await expect(voiceService.startLocalAudio()).rejects.toThrow('麦克风被其他应用占用')
    })

    it('throws generic error for unknown error types', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce({
        name: 'UnknownError',
        message: 'Something went wrong'
      })

      await expect(voiceService.startLocalAudio()).rejects.toThrow('无法启动音频：Something went wrong')
    })

    it('throws generic error for unknown error without message', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce({
        name: 'UnknownError'
      })

      await expect(voiceService.startLocalAudio()).rejects.toThrow('无法启动音频：未知错误')
    })
  })

  describe('getLocalStream', () => {
    it('returns null initially', () => {
      expect(voiceService.getLocalStream()).toBeNull()
    })

    it('returns the stream after startLocalAudio', async () => {
      const mockConn = {
        room: { addStream: vi.fn() }
      }
      vi.mocked(roomService.getConnection).mockReturnValue(mockConn as any)

      const stream = await voiceService.startLocalAudio()
      expect(voiceService.getLocalStream()).toBe(stream)
    })

    it('returns null after cleanup', async () => {
      const mockConn = {
        room: { addStream: vi.fn() }
      }
      vi.mocked(roomService.getConnection).mockReturnValue(mockConn as any)

      await voiceService.startLocalAudio()
      voiceService.cleanup()

      expect(voiceService.getLocalStream()).toBeNull()
    })
  })
})
