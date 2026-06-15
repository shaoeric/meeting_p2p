import { joinRoom, selfId } from 'trystero/torrent'
import type { Room, BaseRoomConfig, RelayConfig } from 'trystero'

const STUN_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}

const APP_ID = 'peer-meeting-app'

type ControlMessage = Record<string, unknown>
type ControlSender = (data: ControlMessage, targetPeers?: string | string[] | null, metadata?: unknown) => Promise<void[]>

export interface P2PConnection {
  room: Room
  sendControl: ControlSender
  selfId: string
  leave: () => Promise<void>
  getPeers: () => Record<string, RTCPeerConnection>
}

export function createConnection(
  namespace: string,
  onPeerJoinCb: (peerId: string) => void,
  onPeerLeaveCb: (peerId: string) => void,
  onDataCb: (data: ControlMessage, peerId: string) => void,
  onPeerStreamCb: (stream: MediaStream, peerId: string) => void
): P2PConnection {
  const config: BaseRoomConfig & RelayConfig = {
    appId: APP_ID,
    rtcConfig: STUN_SERVERS
  }

  const room: Room = joinRoom(config, namespace)
  const [sendControl, receiveControl] = room.makeAction<ControlMessage>('control')

  room.onPeerJoin(onPeerJoinCb)
  room.onPeerLeave(onPeerLeaveCb)
  receiveControl(onDataCb)
  room.onPeerStream((stream, peerId) => {
    onPeerStreamCb(stream, peerId)
  })

  return {
    room,
    sendControl,
    selfId: selfId,
    leave: () => room.leave(),
    getPeers: () => room.getPeers()
  }
}

export function getSelfId(): string {
  return selfId
}
