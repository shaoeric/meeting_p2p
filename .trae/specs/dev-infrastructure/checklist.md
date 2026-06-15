# Checklist

## 测试框架
- [x] `npm run test` 可正常运行测试
- [x] `npm run test:coverage` 生成覆盖率报告到 `coverage/`
- [x] `vitest.config.ts` 存在且配置正确（jsdom, 路径别名）

## Services 测试
- [x] `annotations.test.ts` — 覆盖 add / remove / clear / undo / redo / handleRemote / cleanup
- [x] `voice.test.ts` — 覆盖 toggleMute / handleRemoteStream / removeRemoteStream / cleanup / startLocalAudio 错误分支
- [x] `screenShare.test.ts` — 覆盖 handleRemoteStarted / handleRemoteStopped / cleanup / startScreenShare / stopScreenShare
- [x] `room.test.ts` — 覆盖 generateShortUUID / createRoom / joinRoom / endMeeting / leaveRoom / setCallbacks

## Store 测试
- [x] `store.test.tsx` — 覆盖 addPeer / removePeer / addAnnotation / removeAnnotation / clearAnnotations / reset

## 覆盖率
- [x] 整体语句覆盖率 ≥ 90%（实际 93.98%）
- [x] 整体分支覆盖率 ≥ 85%（实际 87.5%+）

## 文档
- [x] `README.md` 存在于项目根目录
- [x] README 包含：项目简介、技术栈、安装、开发、构建、打包、测试、项目结构
- [x] `docs/API_DOC.md` 存在于 `docs/` 目录
- [x] API_DOC 包含：5 个 Service 说明、P2P 网络层、DataChannel 协议、Store 结构、构建命令
- [x] 所有文档使用中文编写

## GitHub Actions
- [x] `.github/workflows/test.yml` 存在且 YAML 语法正确
- [x] test.yml 在 push 和 pull_request 时自动触发
- [x] `.github/workflows/build.yml` 存在且 YAML 语法正确
- [x] build.yml 通过 workflow_dispatch 手动触发

## Git
- [x] `coverage/` 已加入 `.gitignore`
- [x] 全部测试通过后 `git commit` + `git push` 成功