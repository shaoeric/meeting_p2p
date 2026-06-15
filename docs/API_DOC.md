# API 开发文档

## 目录

1. [P2P 网络层](#1-p2p-网络层)
2. [房间管理](#2-房间管理-roomts)
3. [语音服务](#3-语音服务-voicets)
4. [屏幕共享](#4-屏幕共享-screensharets)
5. [标注系统](#5-标注系统-annotationsts)
6. [DataChannel 消息协议](#6-datachannel-消息协议)
7. [Store 状态结构](#7-store-状态结构)
8. [构建命令](#8-构建命令)

---

## 1. P2P 网络层

文件: `src/renderer/src/services/p2p.ts`

基于 Trystero (`trystero/torrent`) 实现无服务器 P2P 信令。

### 架构

| 组件 | 说明 |
|------|------|
| 信令 | BitTorrent tracker |
| 连接 | 全连接拓扑（每两个 peer 建立 PeerConnection） |
| 传输 | 音频轨 + 视频轨（屏幕共享） + DataChannel（控制消息） |
| NAT 穿透 | 公共 STUN 服务器 |

### 接口

| 函数 | 签名 | 说明 |
|------|------|------|
| createConnection | `(namespace, onPeerJoin, onPeerLeave, onData, onStream) => P2PConnection` | 创建 P2P 连接 |
| getSelfId | `() => string` | 获取当前 peer ID |

---

## 2. 房间管理 (room.ts)

文件: `src/renderer/src/services/room.ts`

### 接口

| 方法 | 签名 | 说明 |
|------|------|------|
| roomService.createRoom | `(password?, displayName?) => Promise<string>` | 创建房间，返回 6 位房间号 |
| roomService.joinRoom | `(roomId, password?, displayName?) => Promise<void>` | 加入房间 |
| roomService.endMeeting | `() => Promise<void>` | 结束会议（仅主持人） |
| roomService.leaveRoom | `() => Promise<void>` | 离开房间 |
| roomService.getRoomId | `() => string` | 获取当前房间号 |
| roomService.getDisplayName | `() => string` | 获取显示名 |
| roomService.isHostUser | `() => boolean` | 是否主持人 |
| roomService.setCallbacks | `(callbacks) => void` | 设置回调 |
| generateShortUUID | `() => string` | 生成 8 位短 UUID |

### 密码保护

- **无密码**: `namespace = roomId`
- **有密码**: `namespace = SHA256(roomId + ":" + password)`
- 错误密码导致不同的 namespace，无法发现房间中的 peer

### 房间检测

- 加入后 10 秒内未发现任何 peer → 判定房间不存在或密码错误

---

## 3. 语音服务 (voice.ts)

文件: `src/renderer/src/services/voice.ts`

| 方法 | 签名 | 说明 |
|------|------|------|
| voiceService.startLocalAudio | `() => Promise<MediaStream>` | 启动麦克风采集 |
| voiceService.toggleMute | `() => boolean` | 切换静音，返回新状态 |
| voiceService.getIsMuted | `() => boolean` | 获取静音状态 |
| voiceService.handleRemoteStream | `(stream, peerId) => void` | 处理远端音频流 |
| voiceService.removeRemoteStream | `(peerId) => void` | 移除远端音频 |
| voiceService.cleanup | `() => void` | 清理所有资源 |

---

## 4. 屏幕共享 (screenShare.ts)

文件: `src/renderer/src/services/screenShare.ts`

| 方法 | 签名 | 说明 |
|------|------|------|
| screenShareService.startScreenShare | `() => Promise<MediaStream>` | 开始共享 |
| screenShareService.stopScreenShare | `() => void` | 停止共享 |
| screenShareService.handleRemoteStream | `(stream, peerId) => void` | 处理远端视频流 |
| screenShareService.handleRemoteStarted | `(data) => void` | 远端开始共享通知 |
| screenShareService.handleRemoteStopped | `() => void` | 远端停止共享通知 |
| screenShareService.getIsSomeoneSharing | `() => boolean` | 是否有人共享 |
| screenShareService.getIsSharing | `() => boolean` | 本地是否共享 |
| screenShareService.cleanup | `() => void` | 清理资源 |

### 互斥逻辑

- 同一时间仅允许一人共享
- `someoneSharing` 为全局标志，DataChannel 广播状态

---

## 5. 标注系统 (annotations.ts)

文件: `src/renderer/src/services/annotations.ts`

| 方法 | 签名 | 说明 |
|------|------|------|
| annotationsService.addAnnotation | `(annotation) => Annotation` | 添加标注 |
| annotationsService.removeAnnotation | `(id) => void` | 移除标注 |
| annotationsService.clearAnnotations | `() => void` | 清空标注 |
| annotationsService.undo | `() => void` | 撤销 |
| annotationsService.redo | `() => void` | 重做 |
| annotationsService.handleRemote | `(type, data) => void` | 处理远端标注操作 |
| annotationsService.getAnnotations | `() => Annotation[]` | 获取标注列表 |
| annotationsService.getUndoCount | `() => number` | 撤销栈深度 |
| annotationsService.getRedoCount | `() => number` | 重做栈深度 |
| annotationsService.cleanup | `() => void` | 清理 |

### Annotation 类型

```typescript
interface Annotation {
  id: string
  type: 'rect' | 'arrow' | 'text'
  x: number
  y: number
  width: number
  height: number
  color: string
  lineWidth: number
  fontSize: number
  text: string
  peerId: string
  timestamp: number
}
```

---

## 6. DataChannel 消息协议

所有消息通过 DataChannel 以 JSON 传输。

| type | data | 说明 |
|------|------|------|
| annotation-add | `{ annotation }` | 添加标注 |
| annotation-remove | `{ id }` | 移除标注 |
| annotation-clear | `{}` | 清空标注 |
| annotation-undo | `{}` | 撤销 |
| annotation-redo | `{}` | 重做 |
| screen-share-started | `{ peerId }` | 开始屏幕共享 |
| screen-share-stopped | `{}` | 停止屏幕共享 |
| end-meeting | `{}` | 结束会议 |
| peer-info | `{ peerId, name }` | 参会者信息 |

---

## 7. Store 状态结构

文件: `src/renderer/src/store/index.tsx`

```typescript
interface StoreState {
  page: 'home' | 'meeting'
  roomId: string
  password: string
  displayName: string
  isHost: boolean
  peers: Peer[]
  selfId: string
  isMuted: boolean
  isScreenSharing: boolean
  screenSharerPeerId: string | null
  screenStream: MediaStream | null
  annotations: Annotation[]
  activeTool: 'rect' | 'arrow' | 'text' | null
  activeColor: string
  lineWidth: number
  fontSize: number
  error: string | null
  localStream: MediaStream | null
}
```

---

## 8. 构建命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式启动 |
| `npm run build` | TypeScript 构建 |
| `npm run preview` | 预览构建产物 |
| `npm run test` | 运行单元测试 (watch) |
| `npm run test:coverage` | 运行测试 + 覆盖率 |
| `npm run test:a` | 启动本地实例 A |
| `npm run test:b` | 启动本地实例 B |
| `npm run test:local` | 本地双实例 P2P 测试 |
| `npm run pack:win:dir` | Windows 打包 (目录) |
| `npm run pack:mac:dir` | macOS 打包 (目录) |
