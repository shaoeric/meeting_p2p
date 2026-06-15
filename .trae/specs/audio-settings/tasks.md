# Tasks

- [x] Task 1: VoiceService 新增 micTest 和 speakerTest 方法
  - [x] 实现 `startMicTest()` / `stopMicTest()`：AudioContext 本地回环
  - [x] 实现 `startSpeakerTest()` / `stopSpeakerTest()`：OscillatorNode 440Hz 3秒
  - [x] 实现 `setSpeakerVolume()` / `getSpeakerVolume()`：GainNode 增益
  - [x] 实现 `getIsMicTesting()` / `getIsSpeakerTesting()` 状态查询

- [x] Task 2: Store 新增 speakerVolume 和 showAudioSettings 状态
  - [x] 新增 `speakerVolume: number`（默认 0.5）
  - [x] 新增 `showAudioSettings: boolean`（默认 false）

- [x] Task 3: 创建 AudioSettings 组件
  - [x] 麦克风测试：Modal 弹窗内测试按钮 + 状态指示
  - [x] 扬声器测试：3 秒测试音按钮 + 进度提示
  - [x] 音量调节：+/- 按钮 + 百分比显示

- [x] Task 4: 重构 MeetingRoom 底部控制栏
  - [x] 静音按钮改为🎤/🔇图标按钮
  - [x] 新增⚙️齿轮按钮入口

- [x] Task 5: 首页增加音频设置入口
  - [x] HomePage 新增"音频设置"按钮

- [x] Task 6: 补充单元测试，覆盖率 ≥90%
  - [x] 115 tests passed（新增 16 tests）
  - [x] 覆盖率 93.8%（≥90%）

- [x] Task 7: 补充接口文档 + 更新 README
  - [x] API_DOC.md 新增 8 个 VoiceService 方法说明
  - [x] README.md 新增音频测试功能描述

- [x] Task 8: Git commit + push

# Task Dependencies
- Task 2 无依赖，可与 Task 1 并行
- Task 3 依赖 Task 1、Task 2
- Task 4 依赖 Task 3
- Task 5 依赖 Task 3
- Task 6 依赖 Task 1
- Task 7 无依赖，可与 Task 3-6 并行
- Task 8 依赖 Task 1-7 全部完成