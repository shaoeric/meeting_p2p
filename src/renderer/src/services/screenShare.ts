import { roomService } from './room'

type OnScreenShareStart = (stream: MediaStream, peerId: string) => void
type OnScreenShareStop = () => void

class ScreenShareService {
  private localScreenStream: MediaStream | null = null
  private isSharing = false
  private someoneSharing = false
  private remoteScreenStreams: Map<string, MediaStream> = new Map()
  private onScreenShareStartCb: OnScreenShareStart | null = null
  private onScreenShareStopCb: OnScreenShareStop | null = null

  setCallbacks(callbacks: {
    onScreenShareStart?: OnScreenShareStart
    onScreenShareStop?: OnScreenShareStop
  }): void {
    this.onScreenShareStartCb = callbacks.onScreenShareStart || null
    this.onScreenShareStopCb = callbacks.onScreenShareStop || null
  }

  async startScreenShare(): Promise<MediaStream> {
    const conn = roomService.getConnection()
    if (!conn) {
      throw new Error('未连接房间')
    }

    if (this.someoneSharing) {
      throw new Error('当前已有用户在共享屏幕')
    }

    if (this.isSharing) {
      throw new Error('您已在共享屏幕')
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false
    })

    this.localScreenStream = stream
    this.isSharing = true
    this.someoneSharing = true

    conn.room.addStream(stream)

    stream.getVideoTracks()[0].onended = () => {
      this.stopScreenShare()
    }

    await conn.sendControl({
      type: 'screen-share-started',
      data: { peerId: conn.selfId }
    })

    this.onScreenShareStartCb?.(stream, conn.selfId)
    return stream
  }

  stopScreenShare(): void {
    const conn = roomService.getConnection()
    if (!conn) return

    if (this.localScreenStream) {
      conn.room.removeStream(this.localScreenStream)
      this.localScreenStream.getTracks().forEach(track => track.stop())
      this.localScreenStream = null
    }

    this.isSharing = false
    this.someoneSharing = false

    conn.sendControl({
      type: 'screen-share-stopped',
      data: {}
    })

    this.onScreenShareStopCb?.()
  }

  handleRemoteStream(stream: MediaStream, peerId: string): void {
    if (stream.getVideoTracks().length === 0) return

    if (this.remoteScreenStreams.has(peerId)) {
      return
    }
    this.remoteScreenStreams.set(peerId, stream)

    this.someoneSharing = true
    this.onScreenShareStartCb?.(stream, peerId)
  }

  handleRemoteStarted(data: Record<string, unknown>): void {
    this.someoneSharing = true
  }

  handleRemoteStopped(): void {
    this.someoneSharing = false

    this.remoteScreenStreams.forEach((stream) => {
      stream.getTracks().forEach(track => track.stop())
    })
    this.remoteScreenStreams.clear()

    this.onScreenShareStopCb?.()
  }

  getIsSomeoneSharing(): boolean {
    return this.someoneSharing
  }

  getIsSharing(): boolean {
    return this.isSharing
  }

  getLocalScreenStream(): MediaStream | null {
    return this.localScreenStream
  }

  cleanup(): void {
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach(track => track.stop())
      this.localScreenStream = null
    }

    this.remoteScreenStreams.forEach((stream) => {
      stream.getTracks().forEach(track => track.stop())
    })
    this.remoteScreenStreams.clear()

    this.isSharing = false
    this.someoneSharing = false
  }
}

export const screenShareService = new ScreenShareService()
