import { useState, useEffect } from 'react'
import { voiceService } from '../services/voice'
import { useStore } from '../store'

export default function AudioSettings() {
  const store = useStore()
  const [micTesting, setMicTesting] = useState(false)
  const [speakerTesting, setSpeakerTesting] = useState(false)
  const [volume, setVolume] = useState(voiceService.getSpeakerVolume())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (micTesting) voiceService.stopMicTest()
      if (speakerTesting) voiceService.stopSpeakerTest()
    }
  }, [])

  const handleMicTest = async () => {
    if (micTesting) {
      voiceService.stopMicTest()
      setMicTesting(false)
      return
    }
    try {
      setError(null)
      await voiceService.startMicTest()
      setMicTesting(true)
    } catch (e: unknown) {
      setError((e as Error).message)
    }
  }

  const handleSpeakerTest = () => {
    if (speakerTesting) {
      voiceService.stopSpeakerTest()
      setSpeakerTesting(false)
      return
    }
    setError(null)
    voiceService.startSpeakerTest()
    setSpeakerTesting(true)
    setTimeout(() => setSpeakerTesting(false), 3000)
  }

  const handleVolumeUp = () => {
    const newVol = Math.min(1, volume + 0.1)
    setVolume(newVol)
    voiceService.setSpeakerVolume(newVol)
    store.setSpeakerVolume(newVol)
  }

  const handleVolumeDown = () => {
    const newVol = Math.max(0, volume - 0.1)
    setVolume(newVol)
    voiceService.setSpeakerVolume(newVol)
    store.setSpeakerVolume(newVol)
  }

  const handleClose = () => {
    if (micTesting) voiceService.stopMicTest()
    if (speakerTesting) voiceService.stopSpeakerTest()
    store.setShowAudioSettings(false)
  }

  return (
    <div className="audio-settings-overlay" onClick={handleClose}>
      <div className="audio-settings-panel" onClick={e => e.stopPropagation()}>
        <div className="audio-settings-header">
          <h2>音频设置</h2>
          <button className="audio-settings-close" onClick={handleClose}>✕</button>
        </div>

        {error && (
          <div className="audio-settings-error">{error}</div>
        )}

        <div className="audio-settings-section">
          <h3>麦克风</h3>
          <p className="audio-settings-desc">测试麦克风是否正常工作，音频仅本地回放</p>
          <button
            className={`audio-settings-btn ${micTesting ? 'mic-testing' : ''}`}
            onClick={handleMicTest}
            disabled={speakerTesting && !micTesting}
          >
            {micTesting ? '⏹ 停止测试' : '🎤 测试麦克风'}
          </button>
          {micTesting && (
            <div className="audio-settings-status recording">
              <span className="pulse-dot" /> 正在录音...
            </div>
          )}
        </div>

        <div className="audio-settings-section">
          <h3>扬声器</h3>
          <p className="audio-settings-desc">播放 3 秒测试音，检查扬声器是否正常</p>
          <button
            className={`audio-settings-btn ${speakerTesting ? 'speaker-testing' : ''}`}
            onClick={handleSpeakerTest}
            disabled={micTesting && !speakerTesting}
          >
            {speakerTesting ? '⏹ 停止' : '🔊 测试扬声器'}
          </button>
          {speakerTesting && (
            <div className="audio-settings-status playing">
              正在播放测试音...
            </div>
          )}

          <div className="volume-control">
            <span className="volume-label">音量</span>
            <button className="volume-btn" onClick={handleVolumeDown}>-</button>
            <span className="volume-value">{Math.round(volume * 100)}%</span>
            <button className="volume-btn" onClick={handleVolumeUp}>+</button>
          </div>
        </div>
      </div>
    </div>
  )
}
