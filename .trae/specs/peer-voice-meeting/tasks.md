# Tasks

- [x] Task 1: 项目初始化与构建工具链
  - [x] 初始化 Electron + React + TypeScript 项目骨架
  - [x] 配置 Vite 作为构建工具（支持 Electron 主进程和渲染进程）
  - [x] 配置 electron-builder 用于跨平台打包（Windows + macOS）
  - [x] 验证开发环境可正常启动 Electron 窗口

- [x] Task 2: P2P 网络层 — 信令与连接管理
  - [x] 集成 Trystero 库实现无服务器 P2P 信令（基于 BitTorrent tracker）
  - [x] 封装 P2P 房间的创建/加入/离开逻辑
  - [x] 实现 WebRTC PeerConnection 管理（全连接拓扑，每两个 peer 之间建立连接）
  - [x] 实现 WebRTC DataChannel 用于控制消息和标注数据同步
  - [x] 集成公共 STUN 服务器用于 NAT 穿透

- [x] Task 3: 房间管理系统
  - [x] 实现房间 ID 生成逻辑（短数字房间号）
  - [x] 实现房间密码哈希验证（通过 P2P 信令空间隔离实现密码保护）
  - [x] 实现房间不存在提示（超时未发现对等节点）
  - [x] 实现主持人结束会议 → 通知所有 peer 断开并销毁房间
  - [x] 实现房间无人时自动销毁（最后一人离开时触发）

- [x] Task 4: 语音通话功能
  - [x] 实现麦克风音频采集（getUserMedia）
  - [x] 将本地音频轨添加到每个 PeerConnection
  - [x] 接收远端音频轨并播放
  - [x] 实现静音/取消静音控制
  - [x] 显示参会者列表及发言状态

- [x] Task 5: 屏幕共享功能
  - [x] 实现屏幕/窗口选择采集（getDisplayMedia）
  - [x] 将屏幕视频轨添加到所有 PeerConnection
  - [x] 实现屏幕共享互斥逻辑（同一时间仅一人共享）
  - [x] 停止共享时移除视频轨并通知所有 peer 清理标注
  - [x] 在观看端渲染共享画面

- [x] Task 6: 标注系统 — 绘制引擎
  - [x] 在共享画面上叠加透明 Canvas 标注层
  - [x] 实现矩形标注工具（拖拽绘制）
  - [x] 实现箭头标注工具（拖拽绘制，带箭头头部）
  - [x] 实现文本标注工具（点击放置，输入文本）
  - [x] 实现标注工具栏 UI（工具切换、颜色选择器、粗细滑块、字号滑块）
  - [x] 实现标注撤销/重绘栈（本地操作）
  - [x] 实现清空所有标注

- [x] Task 7: 标注系统 — 实时同步
  - [x] 定义标注操作消息协议（add / remove / clear / undo / redo）
  - [x] 通过 DataChannel 广播标注操作到所有 peer
  - [x] 接收标注操作并同步渲染到本地 Canvas
  - [x] 处理标注冲突（基于操作序列 + 时间戳）

- [x] Task 8: 用户界面
  - [x] 实现首页：创建房间 / 加入房间入口
  - [x] 实现创建房间对话框（房间号展示、密码设置）
  - [x] 实现加入房间对话框（房间号输入、密码输入）
  - [x] 实现会议主界面布局（参会者列表区 + 屏幕共享区 + 底部控制栏）
  - [x] 实现底部控制栏（静音、共享屏幕、结束会议按钮）
  - [x] 实现错误提示（房间不存在、密码错误等）

- [x] Task 9: 跨平台打包与测试
  - [x] 配置 Windows 打包（NSIS 安装包 / unpacked 目录）
  - [x] 配置 macOS 打包（DMG）
  - [x] 验证 Windows 下构建成功（release/win-unpacked/）
  - [ ] 验证 macOS 下完整功能流程（需 macOS 环境）
  - [ ] 验证局域网 P2P 语音 + 屏幕共享 + 标注协作（见 local-p2p-testing 规范）
  - [ ] 验证远端 P2P 通信（需多机多网环境）

- [x] Task 10: 用户显示名功能
  - [x] 在创建房间对话框中增加"显示名"输入框（可选），不填则自动生成短UUID
  - [x] 在加入房间对话框中增加"显示名"输入框（可选），不填则自动生成短UUID
  - [x] peer-info 消息中包含显示名，广播给所有参会者
  - [x] 参会者列表 UI 中展示显示名而非原始 peerId
  - [x] 验证：构建通过（0 错误）

# Task Dependencies
- Task 2 依赖 Task 1（项目基础）
- Task 3 依赖 Task 2（P2P 连接）
- Task 4 依赖 Task 2、Task 3（P2P 连接 + 房间）
- Task 5 依赖 Task 2、Task 3（P2P 连接 + 房间）
- Task 6 依赖 Task 5（屏幕共享画面）
- Task 7 依赖 Task 6（标注绘制引擎）
- Task 8 依赖 Task 3（房间管理）；与 Task 4/5/6/7 可部分并行
- Task 9 依赖 Task 1-8 全部完成
- Task 10 依赖 Task 3、Task 8（房间管理 + 界面）