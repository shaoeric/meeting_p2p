import { roomService } from './room'

type OnLocalStream = (stream: MediaStream) => void
type OnRemoteStream = (stream: MediaStream, peerId: string) => void
type OnMuteChange = (muted: boolean) => void

class VoiceService {
  private localStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private remoteAudioElements: Map<string, HTMLAudioElement> = new Map()
  private remoteStreams: Map<string, MediaStream> = new Map()
  private onLocalStreamCb: OnLocalStream | null = null
  private onRemoteStreamCb: OnRemoteStream | null = null
  private onMuteChangeCb: OnMuteChange | null = null
  private isMuted = false

  private micTestContext: AudioContext | null = null
  private micTestSource: MediaStreamAudioSourceNode | null = null
  private micTestGain: GainNode | null = null
  private wasMutedBeforeTest = false
  private micTesting = false

  private speakerTestContext: AudioContext | null = null
  private speakerTestOsc: OscillatorNode | null = null
  private speakerTestGain: GainNode | null = null
  private speakerTestTimer: ReturnType<typeof setTimeout> | null = null
  private speakerTesting = false
  private speakerVolume = 0.5

  setCallbacks(callbacks: {
    onLocalStream?: OnLocalStream
    onRemoteStream?: OnRemoteStream
    onMuteChange?: OnMuteChange
  }): void {
    this.onLocalStreamCb = callbacks.onLocalStream || null
    this.onRemoteStreamCb = callbacks.onRemoteStream || null
    this.onMuteChangeCb = callbacks.onMuteChange || null
  }

  async startLocalAudio(): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err: unknown) {
      const error = err as DOMException
      let message: string

      switch (error.name) {
        case 'NotAllowedError':
          message = '麦克风权限被拒绝，请在系统设置中允许麦克风访问'
          break
        case 'NotFoundError':
          message = '未检测到麦克风设备，请检查音频硬件连接'
          break
        case 'NotReadableError':
          message = '麦克风被其他应用占用，请关闭其他使用麦克风的程序后重试'
          break
        default:
          message = `无法启动音频：${error.message || '未知错误'}`
      }

      throw new Error(message)
    }

    const conn = roomService.getConnection()
    if (conn) {
      conn.room.addStream(this.localStream)
    }

    this.onLocalStreamCb?.(this.localStream)
    return this.localStream
  }

  handleRemoteStream(stream: MediaStream, peerId: string): void {
    const videoTracks = stream.getVideoTracks()
    if (videoTracks.length > 0 && stream.getAudioTracks().length === 0) {
      return
    }

    if (this.remoteStreams.has(peerId)) {
      return
    }
    this.remoteStreams.set(peerId, stream)

    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }

    const source = this.audioContext.createMediaStreamSource(stream)
    const destination = this.audioContext.createMediaStreamDestination()
    source.connect(destination)

    const audio = new Audio()
    audio.srcObject = destination.stream
    audio.autoplay = true
    audio.play().catch(console.warn)
    this.remoteAudioElements.set(peerId, audio)

    this.onRemoteStreamCb?.(stream, peerId)
  }

  toggleMute(): boolean {
    if (!this.localStream) return this.isMuted

    this.isMuted = !this.isMuted
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !this.isMuted
    })

    this.onMuteChangeCb?.(this.isMuted)
    return this.isMuted
  }

  getIsMuted(): boolean {
    return this.isMuted
  }

  getLocalStream(): MediaStream | null {
    return this.localStream
  }

  removeRemoteStream(peerId: string): void {
    const audio = this.remoteAudioElements.get(peerId)
    if (audio) {
      audio.pause()
      audio.srcObject = null
      audio.remove()
      this.remoteAudioElements.delete(peerId)
    }
    this.remoteStreams.delete(peerId)
  }

  cleanup(): void {
    this.stopMicTest()
    this.stopSpeakerTest()

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    this.remoteAudioElements.forEach((audio) => {
      audio.pause()
      audio.srcObject = null
      audio.remove()
    })
    this.remoteAudioElements.clear()
    this.remoteStreams.clear()

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.isMuted = false
  }

  async startMicTest(): Promise<void> {
    if (this.micTesting) return
    const stream = this.getLocalStream()
    if (!stream) throw new Error('请先启动音频设备')

    this.wasMutedBeforeTest = this.isMuted
    if (this.isMuted) {
      this.isMuted = false
      stream.getAudioTracks().forEach(track => { track.enabled = true })
    }

    this.micTestContext = new AudioContext()
    this.micTestSource = this.micTestContext.createMediaStreamSource(stream)
    this.micTestGain = this.micTestContext.createGain()
    this.micTestGain.gain.value = 0.8
    this.micTestSource.connect(this.micTestGain)
    this.micTestGain.connect(this.micTestContext.destination)
    this.micTesting = true
  }

  stopMicTest(): void {
    if (!this.micTesting) return
    this.micTesting = false

    if (this.micTestGain) {
      this.micTestGain.disconnect()
      this.micTestGain = null
    }
    if (this.micTestSource) {
      this.micTestSource.disconnect()
      this.micTestSource = null
    }
    if (this.micTestContext) {
      this.micTestContext.close()
      this.micTestContext = null
    }

    if (this.wasMutedBeforeTest && this.localStream) {
      this.isMuted = true
      this.localStream.getAudioTracks().forEach(track => { track.enabled = false })
    }
    this.wasMutedBeforeTest = false
  }

  startSpeakerTest(): void {
    if (this.speakerTesting) return
    this.speakerTestContext = new AudioContext()
    this.speakerTestOsc = this.speakerTestContext.createOscillator()
    this.speakerTestGain = this.speakerTestContext.createGain()
    this.speakerTestGain.gain.value = this.speakerVolume
    this.speakerTestOsc.type = 'sine'
    this.speakerTestOsc.frequency.value = 440
    this.speakerTestOsc.connect(this.speakerTestGain)
    this.speakerTestGain.connect(this.speakerTestContext.destination)
    this.speakerTestOsc.start()
    this.speakerTesting = true

    this.speakerTestTimer = setTimeout(() => {
      this.stopSpeakerTest()
    }, 3000)
  }

  stopSpeakerTest(): void {
    if (this.speakerTestTimer) {
      clearTimeout(this.speakerTestTimer)
      this.speakerTestTimer = null
    }
    if (this.speakerTestOsc) {
      this.speakerTestOsc.stop()
      this.speakerTestOsc.disconnect()
      this.speakerTestOsc = null
    }
    if (this.speakerTestGain) {
      this.speakerTestGain.disconnect()
      this.speakerTestGain = null
    }
    if (this.speakerTestContext) {
      this.speakerTestContext.close()
      this.speakerTestContext = null
    }
    this.speakerTesting = false
  }

  setSpeakerVolume(volume: number): void {
    this.speakerVolume = Math.max(0, Math.min(1, volume))
    if (this.speakerTestGain) {
      this.speakerTestGain.gain.value = this.speakerVolume
    }
  }

  getSpeakerVolume(): number {
    return this.speakerVolume
  }

  getIsMicTesting(): boolean {
    return this.micTesting
  }

  getIsSpeakerTesting(): boolean {
    return this.speakerTesting
  }
}

export const voiceService = new VoiceService()
