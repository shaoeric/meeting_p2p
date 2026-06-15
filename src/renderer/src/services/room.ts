import { createConnection, getSelfId, P2PConnection } from './p2p'
import { voiceService } from './voice'
import { screenShareService } from './screenShare'
import { annotationsService } from './annotations'

let connection: P2PConnection | null = null
let roomId: string = ''
let password: string = ''
let displayName: string = ''
let isHost: boolean = false
let onErrorCb: ((error: string) => void) | null = null
let onEndMeetingCb: (() => void) | null = null
let onPeerJoinCb: ((peerId: string, name?: string) => void) | null = null
let onPeerLeaveCb: ((peerId: string) => void) | null = null
let peersFound = false
let peerJoinTimeout: ReturnType<typeof setTimeout> | null = null

export function generateShortUUID(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8)
}

async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateRoomId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function getNamespace(roomId: string, password?: string): Promise<string> {
  if (password) {
    return hashString(roomId + ':' + password)
  }
  return Promise.resolve(roomId)
}

async function handleDataMessage(data: Record<string, unknown>, peerId: string): Promise<void> {
  const type = data.type as string
  const msgData = data.data as Record<string, unknown>

  switch (type) {
    case 'annotation-add':
    case 'annotation-remove':
    case 'annotation-clear':
    case 'annotation-undo':
    case 'annotation-redo':
      annotationsService.handleRemote(type, msgData)
      break

    case 'screen-share-started':
      screenShareService.handleRemoteStarted(msgData)
      break

    case 'screen-share-stopped':
      screenShareService.handleRemoteStopped()
      break

    case 'end-meeting':
      onEndMeetingCb?.()
      break

    case 'peer-info':
      if (onPeerJoinCb) {
        const peerName = (msgData.name as string) || peerId.slice(0, 8)
        onPeerJoinCb(peerId, peerName)
      }
      break
  }
}

function handlePeerStream(stream: MediaStream, peerId: string): void {
  voiceService.handleRemoteStream(stream, peerId)
  screenShareService.handleRemoteStream(stream, peerId)
}

export const roomService = {
  async createRoom(pwd?: string, name?: string): Promise<string> {
    isHost = true
    roomId = generateRoomId()
    password = pwd || ''
    displayName = name || generateShortUUID()
    const namespace = await getNamespace(roomId, password)

    connection = createConnection(
      namespace,
      (peerId) => {
        peersFound = true
        if (peerJoinTimeout) {
          clearTimeout(peerJoinTimeout)
          peerJoinTimeout = null
        }
        connection?.sendControl({
          type: 'peer-info',
          data: { peerId: getSelfId(), name: displayName }
        }, peerId)
        onPeerJoinCb?.(peerId, displayName)
      },
      (peerId) => {
        onPeerLeaveCb?.(peerId)
      },
      handleDataMessage,
      handlePeerStream
    )

    return roomId
  },

  async joinRoom(rid: string, pwd?: string, name?: string): Promise<void> {
    isHost = false
    roomId = rid
    password = pwd || ''
    displayName = name || generateShortUUID()

    return new Promise(async (resolve, reject) => {
      const namespace = await getNamespace(roomId, password)

      peersFound = false

      connection = createConnection(
        namespace,
        (peerId) => {
          peersFound = true
          if (peerJoinTimeout) {
            clearTimeout(peerJoinTimeout)
            peerJoinTimeout = null
          }
          connection?.sendControl({
            type: 'peer-info',
            data: { peerId: getSelfId(), name: displayName }
          }, peerId)
          onPeerJoinCb?.(peerId, displayName)
          resolve()
        },
        (peerId) => {
          onPeerLeaveCb?.(peerId)
        },
        handleDataMessage,
        handlePeerStream
      )

      peerJoinTimeout = setTimeout(() => {
        if (!peersFound) {
          connection?.leave()
          connection = null
          if (password) {
            reject(new Error('密码错误'))
          } else {
            reject(new Error('房间不存在'))
          }
        }
      }, 10000)
    })
  },

  async endMeeting(): Promise<void> {
    if (connection && isHost) {
      await connection.sendControl({
        type: 'end-meeting',
        data: {}
      })
    }
    await leaveRoom()
  },

  leaveRoom() {
    return leaveRoom()
  },

  getConnection(): P2PConnection | null {
    return connection
  },

  getRoomId(): string {
    return roomId
  },

  getDisplayName(): string {
    return displayName
  },

  isHostUser(): boolean {
    return isHost
  },

  setCallbacks(callbacks: {
    onError?: (error: string) => void
    onEndMeeting?: () => void
    onPeerJoin?: (peerId: string, name?: string) => void
    onPeerLeave?: (peerId: string) => void
  }): void {
    onErrorCb = callbacks.onError || null
    onEndMeetingCb = callbacks.onEndMeeting || null
    onPeerJoinCb = callbacks.onPeerJoin || null
    onPeerLeaveCb = callbacks.onPeerLeave || null
  }
}

async function leaveRoom(): Promise<void> {
  if (peerJoinTimeout) {
    clearTimeout(peerJoinTimeout)
    peerJoinTimeout = null
  }

  voiceService.cleanup()
  screenShareService.cleanup()
  annotationsService.cleanup()

  if (connection) {
    await connection.leave()
    connection = null
  }

  isHost = false
  roomId = ''
  password = ''
  displayName = ''
}
