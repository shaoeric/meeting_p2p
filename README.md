# P2P 语音会议

基于 Electron + WebRTC 的纯 P2P 多人在线语音会议桌面应用，支持屏幕共享与实时标注协作。

## 技术栈

- **桌面框架**: Electron 33
- **前端**: React 18 + TypeScript
- **构建**: Vite (electron-vite)
- **P2P**: Trystero (BitTorrent tracker 信令) + WebRTC
- **打包**: electron-builder

## 环境要求

- Node.js >= 18
- Windows 10+ 或 macOS 11+
- 麦克风设备

## 安装

```bash
npm install --registry=https://registry.npmmirror.com
```

## 开发

```bash
npm run dev
```

## 构建

```bash
npm run build
```

输出在 `out/` 目录。

## 打包

```bash
# Windows 目录包
npm run pack:win:dir

# macOS 目录包
npm run pack:mac:dir

# Windows NSIS 安装包
npm run pack:win

# macOS DMG
npm run pack:mac
```

## 测试

```bash
# 单元测试 (watch)
npm run test

# 覆盖率报告
npm run test:coverage

# 启动本地实例 A（用于双实例 P2P 测试）
npm run test:a

# 启动本地实例 B
npm run test:b

# 一键启动双实例 P2P 测试
npm run test:local
```

## 项目结构

```
src/
├── main/index.ts            # Electron 主进程
├── preload/index.ts         # 预加载脚本
└── renderer/src/
    ├── App.tsx              # 应用入口
    ├── store/index.tsx      # 全局状态管理
    ├── services/            # 服务层
    │   ├── p2p.ts           # P2P 网络层
    │   ├── room.ts          # 房间管理
    │   ├── voice.ts         # 语音服务
    │   ├── screenShare.ts   # 屏幕共享
    │   └── annotations.ts   # 标注系统
    └── components/          # UI 组件
        ├── HomePage.tsx     # 首页
        ├── MeetingRoom.tsx  # 会议界面
        ├── AnnotationCanvas.tsx    # 标注画布
        └── AnnotationToolbar.tsx   # 标注工具栏
```

更多详情参见 [docs/API_DOC.md](docs/API_DOC.md)。

## 功能

- ✅ 纯 P2P 架构，无中心服务器
- ✅ 全双工多人语音通话
- ✅ 房间管理（创建/加入/销毁，6 位房间号，可选密码）
- ✅ 用户显示名（可选，不填自动生成 UUID）
- ✅ 单人屏幕共享（互斥锁）
- ✅ 多人实时标注协作（矩形/箭头/文本，支持颜色/粗细/字号/撤销/重做）
- ✅ 跨平台（Windows + macOS）
- ✅ 音频设备测试（麦克风本地回放 + 扬声器测试音）
- ✅ 扬声器音量调节

## 设计理念

- 主持人身份由"创建房间"行为确定，不需要预设
- 密码保护通过 SHA-256 哈希做 P2P 信令空间隔离
- 房间号不存在时通过 10 秒超时检测
