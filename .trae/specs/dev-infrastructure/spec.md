# Dev Infrastructure Spec

## Why
当前项目缺少单元测试、开发文档和 CI 自动化，不利于团队协作和代码质量保障。需要为项目补齐测试体系、文档体系和 CI/CD 流程。

## What Changes
- 集成 Vitest + @testing-library/react + jsdom 测试框架
- 为 5 个 services + store 编写单元测试，目标覆盖率 ≥90%
- 编写项目根目录 README.md、开发文档 API_DOC.md
- 新增 `npm run test` / `npm run test:coverage` 脚本
- 新增 `.github/workflows/test.yml`：PR/Push 触发自动运行测试
- 新增 `.github/workflows/build.yml`：手动触发 (workflow_dispatch) 构建应用
- **BREAKING** 无破坏性变更

## Impact
- Affected specs: `peer-voice-meeting`（补充 Task 9 测试验证项）
- Affected code: `package.json`（新增测试依赖和脚本）、`src/renderer/src/__tests__/**`（新增测试文件）、`.github/workflows/`（新增）、`README.md`（新增）、`API_DOC.md`（新增）

## ADDED Requirements

### Requirement: 单元测试框架
系统 SHALL 集成 Vitest 测试框架，支持 TypeScript 和 React 组件的单元测试，覆盖率报告输出到 `coverage/` 目录。

#### Scenario: 运行测试
- **WHEN** 用户执行 `npm run test`
- **THEN** 所有单元测试以 watch 模式运行

#### Scenario: 生成覆盖率报告
- **WHEN** 用户执行 `npm run test:coverage`
- **THEN** 运行所有测试并生成覆盖率报告（`coverage/index.html`），目标是 ≥90% 语句覆盖率

### Requirement: Services 单元测试
系统 SHALL 为所有 services 层编写单元测试，覆盖核心业务逻辑。

#### Scenario: AnnotationsService 测试
- **WHEN** 运行 annotations 测试
- **THEN** 覆盖 addAnnotation / removeAnnotation / clearAnnotations / undo / redo / handleRemote / cleanup，mock roomService 依赖

#### Scenario: VoiceService 测试
- **WHEN** 运行 voice 测试
- **THEN** 覆盖 toggleMute / getIsMuted / handleRemoteStream / setCallbacks / cleanup；startLocalAudio 由于依赖真实硬件，mock navigator.mediaDevices 验证错误分支

#### Scenario: ScreenShareService 测试
- **WHEN** 运行 screenShare 测试
- **THEN** 覆盖 handleRemoteStarted / handleRemoteStopped / getIsSomeoneSharing / getIsSharing / cleanup / setCallbacks

#### Scenario: RoomService 工具函数测试
- **WHEN** 运行 room 工具函数测试
- **THEN** 覆盖 generateShortUUID（纯函数，8位十六进制）、generateRoomId（6位数字）、hashString（SHA-256 确定性），不测试依赖 trystero 的 createRoom/joinRoom

### Requirement: Store 单元测试
系统 SHALL 为 React store 编写单元测试，使用 @testing-library/react。

#### Scenario: Store Provider 测试
- **WHEN** 运行 store 测试
- **THEN** 覆盖 addPeer（去重）/ removePeer / addAnnotation / removeAnnotation / clearAnnotations / reset 状态逻辑

### Requirement: README 文档
系统 SHALL 提供根目录 README.md，包含项目简介、环境要求、安装、开发运行、构建打包、测试说明，使用中文编写。

#### Scenario: README 完整性
- **WHEN** 用户打开 README.md
- **THEN** 能看到：项目简介、技术栈、前置要求 (Node.js 18+)、安装步骤 (`npm install --registry=https://registry.npmmirror.com`)、开发 (`npm run dev`)、构建 (`npm run build`)、打包 (`npm run pack:win:dir`)、测试 (`npm run test:local`)、项目结构树

### Requirement: API 开发文档
系统 SHALL 提供 `docs/API_DOC.md`，包含服务层接口文档和数据协议规范，使用中文编写。

#### Scenario: API 文档内容
- **WHEN** 用户打开 `docs/API_DOC.md`
- **THEN** 能看到：各 Service 模块说明（roomService / voiceService / screenShareService / annotationsService）、P2P 网络层说明、DataChannel 消息协议规范、Store 状态结构说明、构建与打包命令

### Requirement: GitHub Actions CI

#### Scenario: 测试 Workflow
- **WHEN** 代码 push 到任意分支或创建 Pull Request
- **THEN** `.github/workflows/test.yml` 触发，执行 `npm ci && npm run test:coverage`，失败则阻断

#### Scenario: 构建 Workflow
- **WHEN** 用户手动触发 workflow_dispatch
- **THEN** `.github/workflows/build.yml` 触发，执行构建和 Windows 打包，产物上传为 artifact