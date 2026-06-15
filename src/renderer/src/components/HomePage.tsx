import { useState } from 'react'
import { useStore } from '../store'
import { roomService, generateShortUUID } from '../services/room'
import { voiceService } from '../services/voice'
import { screenShareService } from '../services/screenShare'
import { annotationsService } from '../services/annotations'
import { getSelfId } from '../services/p2p'

export default function HomePage() {
  const store = useStore()

  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [createPwd, setCreatePwd] = useState('')
  const [createName, setCreateName] = useState('')
  const [joinRoomId, setJoinRoomId] = useState('')
  const [joinPwd, setJoinPwd] = useState('')
  const [joinName, setJoinName] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdRoomId, setCreatedRoomId] = useState('')
  const [created, setCreated] = useState(false)
  const [joined, setJoined] = useState(false)

  const handleCreate = async () => {
    setLoading(true)
    try {
      const name = createName.trim() || generateShortUUID()
      const rid = await roomService.createRoom(createPwd || undefined, name)
      setCreatedRoomId(rid)
      setCreated(true)
      store.setRoomId(rid)
      store.setPassword(createPwd)
      store.setDisplayName(name)
      store.setIsHost(true)
    } catch (e: unknown) {
      store.setError((e as Error).message || '创建房间失败')
    }
    setLoading(false)
  }

  const handleJoin = async () => {
    if (!joinRoomId.trim()) {
      store.setError('请输入房间号')
      return
    }
    setLoading(true)
    try {
      const name = joinName.trim() || generateShortUUID()
      await roomService.joinRoom(joinRoomId.trim(), joinPwd || undefined, name)
      store.setRoomId(joinRoomId.trim())
      store.setPassword(joinPwd)
      store.setDisplayName(name)
      store.setIsHost(false)
      setJoined(true)
    } catch (e: unknown) {
      const msg = (e as Error).message || '加入房间失败'
      store.setError(msg)
      setLoading(false)
      return
    }
    setLoading(false)
  }

  const enterMeeting = async () => {
    setLoading(true)
    try {
      store.setSelfId(getSelfId())

      const stream = await voiceService.startLocalAudio()
      store.setLocalStream(stream)

      voiceService.setCallbacks({
        onLocalStream: (s) => store.setLocalStream(s),
        onRemoteStream: () => {},
        onMuteChange: (muted) => store.setIsMuted(muted)
      })

      screenShareService.setCallbacks({
        onScreenShareStart: (stream, peerId) => {
          store.setScreenStream(stream)
          store.setScreenSharerPeerId(peerId)
          store.setIsScreenSharing(true)
        },
        onScreenShareStop: () => {
          store.setScreenStream(null)
          store.setScreenSharerPeerId(null)
          store.setIsScreenSharing(false)
          store.clearAnnotations()
          annotationsService.cleanup()
        }
      })

      annotationsService.setCallbacks({
        onAnnotationChange: (annotations) => {
          store.setAnnotations(annotations)
        }
      })

      store.setPage('meeting')
    } catch (e: unknown) {
      store.setError((e as Error).message || '启动语音失败')
    }
    setLoading(false)
  }

  return (
    <div className="home-page">
      <div className="home-card">
        <h1 className="home-title">P2P 语音会议</h1>
        <p className="home-subtitle">无需服务器 · 端到端加密 · 屏幕共享</p>

        {store.error && (
          <div className="error-banner">
            <span>{store.error}</span>
            <button className="error-close" onClick={() => store.setError(null)}>✕</button>
          </div>
        )}

        {!showCreate && !showJoin && (
          <div className="home-actions">
            <button
              className="btn btn-primary"
              onClick={() => { setShowCreate(true); setCreated(false) }}
            >
              创建房间
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => { setShowJoin(true); setJoined(false) }}
            >
              加入房间
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => store.setShowAudioSettings(true)}
            >
              音频设置
            </button>
          </div>
        )}

        {showCreate && !created && (
          <div className="dialog">
            <h2>创建房间</h2>
            <div className="form-group">
              <label>显示名（可选）</label>
              <input
                type="text"
                placeholder="留空则自动生成"
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                className="input"
              />
            </div>
            <div className="form-group">
              <label>房间密码（可选）</label>
              <input
                type="text"
                placeholder="留空则无密码"
                value={createPwd}
                onChange={e => setCreatePwd(e.target.value)}
                className="input"
              />
            </div>
            <div className="dialog-actions">
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
                {loading ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        )}

        {showCreate && created && (
          <div className="dialog">
            <h2>房间已创建</h2>
            <div className="room-id-display">
              <span>房间号：</span>
              <strong>{createdRoomId}</strong>
            </div>
            {createPwd && (
              <div className="room-pwd-hint">
                密码：{createPwd}
              </div>
            )}
            <p className="hint">将此房间号分享给其他参会者</p>
            <div className="dialog-actions">
              <button className="btn btn-primary" onClick={enterMeeting} disabled={loading}>
                {loading ? '进入中...' : '进入会议'}
              </button>
            </div>
          </div>
        )}

        {showJoin && !joined && (
          <div className="dialog">
            <h2>加入房间</h2>
            <div className="form-group">
              <label>显示名（可选）</label>
              <input
                type="text"
                placeholder="留空则自动生成"
                value={joinName}
                onChange={e => setJoinName(e.target.value)}
                className="input"
              />
            </div>
            <div className="form-group">
              <label>房间号</label>
              <input
                type="text"
                placeholder="输入6位房间号"
                value={joinRoomId}
                onChange={e => setJoinRoomId(e.target.value)}
                maxLength={6}
                className="input"
              />
            </div>
            <div className="form-group">
              <label>房间密码（可选）</label>
              <input
                type="text"
                placeholder="房间有密码则必须输入"
                value={joinPwd}
                onChange={e => setJoinPwd(e.target.value)}
                className="input"
              />
            </div>
            <div className="dialog-actions">
              <button className="btn btn-ghost" onClick={() => setShowJoin(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleJoin} disabled={loading}>
                {loading ? '加入中...' : '加入'}
              </button>
            </div>
          </div>
        )}

        {showJoin && joined && (
          <div className="dialog">
            <h2>已加入房间</h2>
            <div className="room-id-display">
              <span>房间号：</span>
              <strong>{store.roomId}</strong>
            </div>
            <p className="hint">已成功连接到房间</p>
            <div className="dialog-actions">
              <button className="btn btn-primary" onClick={enterMeeting} disabled={loading}>
                {loading ? '进入中...' : '进入会议'}
              </button>
            </div>
          </div>
        )}
      </div>

      {store.showAudioSettings && <AudioSettings />}
    </div>
  )
}
