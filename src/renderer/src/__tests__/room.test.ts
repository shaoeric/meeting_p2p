import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let roomService: any
let generateShortUUID: any
let mockSendControl: ReturnType<typeof vi.fn>
let mockLeave: ReturnType<typeof vi.fn>
let mockAddStream: ReturnType<typeof vi.fn>
let onPeerJoinCallback: any
let onPeerLeaveCallback: any
let onDataCallback: any
let onPeerStreamCallback: any
let voiceCleanup: ReturnType<typeof vi.fn>
let screenShareCleanup: ReturnType<typeof vi.fn>
let annotationsCleanup: ReturnType<typeof vi.fn>

describe('roomService', () => {
  beforeEach(async () => {
    vi.resetModules()

    mockSendControl = vi.fn().mockResolvedValue(undefined)
    mockLeave = vi.fn().mockResolvedValue(undefined)
    mockAddStream = vi.fn()
    voiceCleanup = vi.fn()
    screenShareCleanup = vi.fn()
    annotationsCleanup = vi.fn()

    onPeerJoinCallback = null
    onPeerLeaveCallback = null
    onDataCallback = null
    onPeerStreamCallback = null

    const mockConnection = {
      room: {
        addStream: mockAddStream,
        removeStream: vi.fn(),
        leave: mockLeave,
        getPeers: vi.fn(),
        onPeerJoin: vi.fn(),
        onPeerLeave: vi.fn(),
        onPeerStream: vi.fn(),
        makeAction: vi.fn()
      },
      sendControl: mockSendControl,
      selfId: 'test-self',
      leave: mockLeave,
      getPeers: vi.fn(() => ({})),
    }

    vi.doMock('../services/p2p', () => ({
      createConnection: vi.fn((_ns: string, onPJoin: any, onPLeave: any, onData: any, onPStream: any) => {
        onPeerJoinCallback = onPJoin
        onPeerLeaveCallback = onPLeave
        onDataCallback = onData
        onPeerStreamCallback = onPStream
        return mockConnection
      }),
      getSelfId: vi.fn(() => 'test-self-id')
    }))

    vi.doMock('../services/voice', () => ({
      voiceService: {
        cleanup: voiceCleanup,
        handleRemoteStream: vi.fn()
      }
    }))

    vi.doMock('../services/screenShare', () => ({
      screenShareService: {
        cleanup: screenShareCleanup,
        handleRemoteStream: vi.fn(),
        handleRemoteStarted: vi.fn(),
        handleRemoteStopped: vi.fn()
      }
    }))

    vi.doMock('../services/annotations', () => ({
      annotationsService: {
        cleanup: annotationsCleanup,
        handleRemote: vi.fn()
      }
    }))

    const mod = await import('../services/room')
    roomService = mod.roomService
    generateShortUUID = mod.generateShortUUID
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateShortUUID', () => {
    it('returns a string of length 8', () => {
      const id = generateShortUUID()
      expect(id).toHaveLength(8)
    })

    it('contains only hex characters (0-9, a-f)', () => {
      for (let i = 0; i < 20; i++) {
        const id = generateShortUUID()
        expect(id).toMatch(/^[0-9a-f]{8}$/)
      }
    })

    it('multiple calls produce different values (at least 10 calls are unique)', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 10; i++) {
        ids.add(generateShortUUID())
      }
      expect(ids.size).toBe(10)
    })
  })

  describe('getRoomId', () => {
    it('returns empty string initially', () => {
      expect(roomService.getRoomId()).toBe('')
    })

    it('returns roomId after createRoom', async () => {
      const roomId = await roomService.createRoom()
      expect(roomService.getRoomId()).toBe(roomId)
    })

    it('returns empty string after leaveRoom', async () => {
      await roomService.createRoom()
      await roomService.leaveRoom()
      expect(roomService.getRoomId()).toBe('')
    })
  })

  describe('getDisplayName', () => {
    it('returns empty string initially', () => {
      expect(roomService.getDisplayName()).toBe('')
    })

    it('returns generated displayName after createRoom', async () => {
      await roomService.createRoom()
      expect(roomService.getDisplayName()).toBeTruthy()
      expect(roomService.getDisplayName().length).toBeGreaterThan(0)
    })

    it('returns custom displayName when provided', async () => {
      await roomService.createRoom(undefined, 'CustomName')
      expect(roomService.getDisplayName()).toBe('CustomName')
    })

    it('returns empty string after leaveRoom', async () => {
      await roomService.createRoom(undefined, 'CustomName')
      await roomService.leaveRoom()
      expect(roomService.getDisplayName()).toBe('')
    })
  })

  describe('isHostUser', () => {
    it('returns false initially', () => {
      expect(roomService.isHostUser()).toBe(false)
    })

    it('returns true after createRoom', async () => {
      await roomService.createRoom()
      expect(roomService.isHostUser()).toBe(true)
    })

    it('returns false after leaveRoom', async () => {
      await roomService.createRoom()
      await roomService.leaveRoom()
      expect(roomService.isHostUser()).toBe(false)
    })
  })

  describe('setCallbacks', () => {
    it('fires onEndMeeting callback when end-meeting message received', async () => {
      const onEndMeeting = vi.fn()
      roomService.setCallbacks({ onEndMeeting })

      await roomService.createRoom()

      onDataCallback({ type: 'end-meeting', data: {} }, 'peer-1')

      expect(onEndMeeting).toHaveBeenCalledTimes(1)
    })

    it('fires onPeerJoin callback when peer joins', async () => {
      const onPeerJoin = vi.fn()
      roomService.setCallbacks({ onPeerJoin })

      await roomService.createRoom()

      onPeerJoinCallback('peer-1')

      expect(onPeerJoin).toHaveBeenCalledWith('peer-1', expect.any(String))
      expect(mockSendControl).toHaveBeenCalledWith(
        {
          type: 'peer-info',
          data: { peerId: 'test-self-id', name: expect.any(String) }
        },
        'peer-1'
      )
    })

    it('fires onPeerLeave callback when peer leaves', async () => {
      const onPeerLeave = vi.fn()
      roomService.setCallbacks({ onPeerLeave })

      await roomService.createRoom()

      onPeerLeaveCallback('peer-1')

      expect(onPeerLeave).toHaveBeenCalledWith('peer-1')
    })

    it('does not fire onEndMeeting if callback not set', async () => {
      await roomService.createRoom()

      expect(() => {
        onDataCallback({ type: 'end-meeting', data: {} }, 'peer-1')
      }).not.toThrow()
    })
  })

  describe('createRoom', () => {
    it('returns a 6-digit string', async () => {
      const roomId = await roomService.createRoom()
      expect(roomId).toMatch(/^\d{6}$/)
    })

    it('sets isHostUser to true', async () => {
      await roomService.createRoom()
      expect(roomService.isHostUser()).toBe(true)
    })

    it('sets roomId getter to the generated roomId', async () => {
      const roomId = await roomService.createRoom()
      expect(roomService.getRoomId()).toBe(roomId)
    })

    it('accepts optional password parameter', async () => {
      const roomId = await roomService.createRoom('secret123')
      expect(roomId).toMatch(/^\d{6}$/)
    })

    it('accepts optional displayName parameter', async () => {
      await roomService.createRoom(undefined, 'Alice')
      expect(roomService.getDisplayName()).toBe('Alice')
    })

    it('generates different roomIds on subsequent calls', async () => {
      const roomId1 = await roomService.createRoom()
      expect(roomService.isHostUser()).toBe(true)

      const roomId2 = '987654'
      expect(roomId1).not.toBe(roomId2)
    })
  })

  describe('joinRoom', () => {
    it('resolves when a peer is found and sets isHost=false', async () => {
      const onPeerJoin = vi.fn()
      roomService.setCallbacks({ onPeerJoin })

      const promise = roomService.joinRoom('123456')
      expect(roomService.isHostUser()).toBe(false)
      expect(roomService.getRoomId()).toBe('123456')

      await vi.waitFor(() => {
        expect(onPeerJoinCallback).not.toBeNull()
      })

      onPeerJoinCallback('peer-1')

      await expect(promise).resolves.toBeUndefined()
      expect(onPeerJoin).toHaveBeenCalledWith('peer-1', expect.any(String))
      expect(roomService.isHostUser()).toBe(false)
    })

    it('clears peerJoinTimeout on leaveRoom', async () => {
      roomService.joinRoom('123456')

      await vi.waitFor(() => {
        expect(onPeerJoinCallback).not.toBeNull()
      })

      await roomService.leaveRoom()

      expect(roomService.getRoomId()).toBe('')
      expect(roomService.isHostUser()).toBe(false)
    })
  })

  describe('endMeeting', () => {
    it('sends end-meeting control message when host', async () => {
      await roomService.createRoom()
      mockSendControl.mockClear()

      await roomService.endMeeting()

      expect(mockSendControl).toHaveBeenCalledWith({
        type: 'end-meeting',
        data: {}
      })
    })

    it('calls leaveRoom after sending end-meeting', async () => {
      await roomService.createRoom()
      mockLeave.mockClear()

      await roomService.endMeeting()

      expect(mockLeave).toHaveBeenCalled()
    })

    it('clears room state after endMeeting', async () => {
      await roomService.createRoom()
      await roomService.endMeeting()

      expect(roomService.getRoomId()).toBe('')
      expect(roomService.isHostUser()).toBe(false)
      expect(roomService.getDisplayName()).toBe('')
    })
  })

  describe('leaveRoom', () => {
    it('calls all service cleanups', async () => {
      await roomService.createRoom()
      mockLeave.mockClear()

      await roomService.leaveRoom()

      expect(voiceCleanup).toHaveBeenCalledTimes(1)
      expect(screenShareCleanup).toHaveBeenCalledTimes(1)
      expect(annotationsCleanup).toHaveBeenCalledTimes(1)
      expect(mockLeave).toHaveBeenCalledTimes(1)
    })

    it('resets all room state', async () => {
      await roomService.createRoom()
      await roomService.leaveRoom()

      expect(roomService.getRoomId()).toBe('')
      expect(roomService.isHostUser()).toBe(false)
      expect(roomService.getDisplayName()).toBe('')
    })

    it('does not throw when called without active room', async () => {
      await expect(roomService.leaveRoom()).resolves.toBeUndefined()
    })
  })

  describe('getConnection', () => {
    it('returns null initially', () => {
      expect(roomService.getConnection()).toBeNull()
    })

    it('returns connection after createRoom', async () => {
      await roomService.createRoom()
      const conn = roomService.getConnection()
      expect(conn).not.toBeNull()
      expect(conn.selfId).toBe('test-self')
    })

    it('returns null after leaveRoom', async () => {
      await roomService.createRoom()
      await roomService.leaveRoom()
      expect(roomService.getConnection()).toBeNull()
    })
  })
})
