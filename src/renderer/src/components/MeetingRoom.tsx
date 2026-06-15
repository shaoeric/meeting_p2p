import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { roomService } from '../services/room'
import { voiceService } from '../services/voice'
import { screenShareService } from '../services/screenShare'
import AnnotationToolbar from './AnnotationToolbar'
import AnnotationCanvas from './AnnotationCanvas'

export default function MeetingRoom() {
  const store = useStore()
  const screenVideoRef = useRef<HTMLVideoElement>(null)
  const [meetingEnded, setMeetingEnded] = useState(false)

  useEffect(() => {
    roomService.setCallbacks({
      onPeerJoin: (peerId, name) => {
        store.addPeer({ id: peerId, name: name || `参会者 ${peerId.slice(0, 6)}` })
      },
      onPeerLeave: (peerId) => {
        store.removePeer(peerId)
        voiceService.removeRemoteStream(peerId)
      },
      onEndMeeting: () => {
        setMeetingEnded(true)
      },
      onError: (err) => {
        store.setError(err)
      }
    })

    screenShareService.setCallbacks({
      onScreenShareStart: (stream, peerId) => {
        store.setScreenStream(stream)
        store.setScreenSharerPeerId(peerId)
        store.setIsScreenSharing(screenShareService.getIsSharing())
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream
        }
      },
      onScreenShareStop: () => {
        store.setScreenStream(null)
        store.setScreenSharerPeerId(null)
        store.setIsScreenSharing(false)
        store.clearAnnotations()
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = null
        }
      }
    })

    voiceService.setCallbacks({
      onMuteChange: (muted) => {
        store.setIsMuted(muted)
      }
    })

    return () => {
      roomService.setCallbacks({})
      screenShareService.setCallbacks({})
      voiceService.setCallbacks({})
    }
  }, [store])

  useEffect(() => {
    if (store.screenStream && screenVideoRef.current) {
      screenVideoRef.current.srcObject = store.screenStream
    }
  }, [store.screenStream])

  useEffect(() => {
    if (!meetingEnded) return
    const timer = setTimeout(() => {
      roomService.leaveRoom().then(() => {
        store.reset()
        store.setPage('home')
      })
    }, 2000)
    return () => clearTimeout(timer)
  }, [meetingEnded, store])

  const handleMute = () => {
    voiceService.toggleMute()
  }

  const handleScreenShare = async () => {
    if (screenShareService.getIsSharing()) {
      screenShareService.stopScreenShare()
      store.setScreenStream(null)
      store.setScreenSharerPeerId(null)
      store.setIsScreenSharing(false)
      return
    }

    try {
      const stream = await screenShareService.startScreenShare()
      store.setScreenStream(stream)
      store.setScreenSharerPeerId(store.selfId)
      store.setIsScreenSharing(true)
    } catch (e: unknown) {
      const msg = (e as Error).message
      store.setError(msg || '屏幕共享失败')
    }
  }

  const handleEndMeeting = async () => {
    await roomService.endMeeting()
    store.reset()
    store.setPage('home')
  }

  const handleLeave = async () => {
    await roomService.leaveRoom()
    store.reset()
    store.setPage('home')
  }

  if (meetingEnded) {
    return (
      <div className="meeting-room">
        <div className="meeting-ended-overlay">
          <div className="meeting-ended-card">
            <h2>会议已结束</h2>
            <p>主持人已结束会议，即将返回首页...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="meeting-room">
      <div className="meeting-topbar">
        <div className="room-info">
          <span className="room-label">房间号: {store.roomId}</span>
          {store.isHost && <span className="host-badge">主持人</span>}
        </div>
        <div className="peer-count">
          {store.peers.length + 1} 人在线
        </div>
      </div>

      <div className="meeting-main">
        <div className="participants-sidebar">
          <div className="sidebar-header">参会者</div>
          <div className="participant-list">
            <div className="participant-item self">
              <div className="participant-avatar self-avatar">
                {store.isMuted ? '🔇' : '🎤'}
              </div>
              <div className="participant-name">{store.displayName || '我'}{store.isHost ? ' (主持人)' : ''}</div>
              <div className="participant-status">
                {store.isMuted ? '已静音' : '发言中'}
              </div>
            </div>
            {store.peers.map(peer => (
              <div key={peer.id} className="participant-item">
                <div className="participant-avatar">👤</div>
                <div className="participant-name">{peer.name}</div>
                <div className="participant-status">
                  {store.screenSharerPeerId === peer.id ? '正在共享' : '在线'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="screen-share-area">
          {store.screenStream ? (
            <div className="screen-container">
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                className="screen-video"
              />
              <AnnotationCanvas />
            </div>
          ) : (
            <div className="screen-placeholder">
              <div className="placeholder-icon">🖥️</div>
              <p>等待屏幕共享...</p>
            </div>
          )}
          {store.screenStream && (
            <div className="sharing-indicator">
              {store.screenSharerPeerId === store.selfId
                ? '你正在共享屏幕'
                : `${store.peers.find(p => p.id === store.screenSharerPeerId)?.name || '其他用户'} 正在共享屏幕`}
            </div>
          )}
        </div>
      </div>

      <AnnotationToolbar />

      <div className="bottom-bar">
        <button
          className={`control-btn ${store.isMuted ? 'active' : ''}`}
          onClick={handleMute}
          title={store.isMuted ? '取消静音' : '静音'}
        >
          {store.isMuted ? '🔇 取消静音' : '🎤 静音'}
        </button>

        <button
          className={`control-btn ${store.isScreenSharing ? 'active' : ''}`}
          onClick={handleScreenShare}
          title={store.isScreenSharing ? '停止共享' : '共享屏幕'}
        >
          {store.isScreenSharing ? '⏹ 停止共享' : '🖥️ 共享屏幕'}
        </button>

        {store.isHost ? (
          <button className="control-btn end-btn" onClick={handleEndMeeting}>
            📞 结束会议
          </button>
        ) : (
          <button className="control-btn leave-btn" onClick={handleLeave}>
            🚪 离开会议
          </button>
        )}
      </div>

      {store.error && (
        <div className="error-toast">
          <span>{store.error}</span>
          <button onClick={() => store.setError(null)}>✕</button>
        </div>
      )}
    </div>
  )
}
