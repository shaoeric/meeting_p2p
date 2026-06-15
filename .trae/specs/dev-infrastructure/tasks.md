# Tasks

- [x] Task 1: 集成测试框架
  - [x] 安装 vitest、@testing-library/react、@testing-library/jest-dom、jsdom、@vitest/coverage-v8
  - [x] 创建 `vitest.config.ts`，配置 jsdom 环境和路径别名
  - [x] 在 `package.json` 中新增 `test` 和 `test:coverage` 脚本
  - [x] 更新 `.gitignore` 排除 `coverage/`
  - [x] 验证：`npm run test` 可以启动

- [x] Task 2: Services 单元测试 — annotations.ts
  - [x] 编写 `src/renderer/src/__tests__/annotations.test.ts`
  - [x] mock roomService.getConnection 返回值
  - [x] 覆盖：addAnnotation / removeAnnotation / clearAnnotations / undo / redo / handleRemote / cleanup
  - [x] 验证：16 个测试通过，覆盖率 98.73%

- [x] Task 3: Services 单元测试 — voice.ts
  - [x] 编写 `src/renderer/src/__tests__/voice.test.ts`
  - [x] 覆盖：toggleMute / getIsMuted / setCallbacks / handleRemoteStream / removeRemoteStream / cleanup
  - [x] 覆盖：startLocalAudio 成功 + 5 种错误分支 (NotAllowedError/NotFoundError/NotReadableError/通用/无message)
  - [x] 验证：19 个测试通过，覆盖率 100%

- [x] Task 4: Services 单元测试 — screenShare.ts
  - [x] 编写 `src/renderer/src/__tests__/screenShare.test.ts`
  - [x] 覆盖：handleRemoteStarted / handleRemoteStopped / handleRemoteStream / state queries
  - [x] 覆盖：startScreenShare 3 种错误 + 成功路径 / stopScreenShare / onended handler
  - [x] 验证：23 个测试通过，覆盖率 100%

- [x] Task 5: Room 工具函数单元测试
  - [x] 编写 `src/renderer/src/__tests__/room.test.ts`
  - [x] 覆盖：generateShortUUID / createRoom / joinRoom / endMeeting / leaveRoom / setCallbacks / getters
  - [x] 验证：34 个测试通过，覆盖率 79.41%

- [x] Task 6: Store 单元测试
  - [x] 编写 `src/renderer/src/__tests__/store.test.tsx`
  - [x] 覆盖：addPeer / removePeer / addAnnotation / removeAnnotation / clearAnnotations / reset
  - [x] 验证：7 个测试通过，覆盖率 97.4%

- [x] Task 7: 文档 — README.md 和 API_DOC.md
  - [x] 编写根目录 `README.md`（中文）
  - [x] 创建 `docs/` 目录并编写 `docs/API_DOC.md`（中文）
  - [x] 验证：文档内容清晰完整

- [x] Task 8: GitHub Actions — 测试 Workflow
  - [x] 创建 `.github/workflows/test.yml`
  - [x] 触发条件：push + pull_request
  - [x] 验证：YAML 语法正确

- [x] Task 9: GitHub Actions — 构建 Workflow
  - [x] 创建 `.github/workflows/build.yml`
  - [x] 触发条件：workflow_dispatch
  - [x] 验证：YAML 语法正确

- [x] Task 10: 运行测试、覆盖率达标、提交 Push
  - [x] 运行 `npm run test:coverage`，覆盖率 93.98%（≥90%）
  - [x] 99 个测试全部通过
  - [x] `git add` → `git commit` → `git push`

# Task Dependencies
- Task 2-6 依赖 Task 1（测试框架就绪）
- Task 2/3/4/5/6 之间互不依赖，可并行
- Task 7 无依赖，可与 Task 1-6 并行
- Task 8/9 无依赖，可与所有 Task 并行
- Task 10 依赖 Task 1-6 全部完成