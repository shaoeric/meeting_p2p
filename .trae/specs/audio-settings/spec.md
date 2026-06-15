# Audio Settings Spec

## Why
目前会议的静音按钮 UI 不够直观（文字按钮），且用户无法在进入房间前测试自己的麦克风和扬声器是否正常工作。需要提供专业的音频设置面板，允许用户在会前/会中自测设备。

## What Changes
- 新增音频设置面板组件，底部控制栏增加齿轮图标入口
- 重构静音按钮为麦克风图标按钮（🎤/🔇），状态切换更直观
- 麦克风测试：强制开麦，音频仅本地回放不发送给其他用户
- 扬声器测试：播放 3 秒正弦波测试音，支持音量 +/- 调节
- VoiceService 新增 micTest / speakerTest 方法
- Store 新增 speakerVolume 状态
- **BREAKING** 无破坏性变更

## Impact
- Affected specs: `peer-voice-meeting`（补充音频设置功能）
- Affected code: `services/voice.ts`（新增 micTest/speakerTest）、`store/index.tsx`（新增 speakerVolume 状态）、`components/MeetingRoom.tsx`（入口+静音按钮重构）、`components/AudioSettings.tsx`（新增）、`components/HomePage.tsx`（可会前打开设置）

## ADDED Requirements

### Requirement: 静音按钮重构
系统 SHALL 将底部控制栏的静音按钮从文字按钮改为麦克风图标按钮，开麦时显示🎤，闭麦时显示🔇，点击切换状态。闭麦仅影响本地麦克风采集轨的 enabled 属性，不影响播放远端音频。

#### Scenario: 点击闭麦
- **WHEN** 用户点击🎤麦克风按钮
- **THEN** 本地麦克风音频轨 enabled 设为 false，按钮图标变为🔇，其他参会者无法听到该用户声音

#### Scenario: 点击开麦
- **WHEN** 用户点击🔇按钮
- **THEN** 本地麦克风音频轨 enabled 恢复为 true，按钮图标变为🎤，其他参会者恢复听到该用户声音

### Requirement: 音频设置入口
系统 SHALL 在会议界面底部控制栏提供一个齿轮⚙️按钮，点击后弹出音频设置面板。

#### Scenario: 打开音频设置
- **WHEN** 用户在会议界面点击底部控制栏的⚙️按钮
- **THEN** 弹出音频设置面板，包含"测试麦克风"和"测试扬声器"两个区域

#### Scenario: 关闭音频设置
- **WHEN** 用户点击设置面板的关闭按钮或面板外部区域
- **THEN** 设置面板关闭，停止所有测试

### Requirement: 麦克风测试
系统 SHALL 在音频设置面板中提供麦克风测试功能：点击"测试麦克风"按钮后强制开麦，将麦克风音频通过 AudioContext 路由到本地扬声器（仅本地回放，不发送给房间内其他用户），用户通过听自己声音判断麦克风是否正常。

#### Scenario: 开始测试麦克风
- **WHEN** 用户点击"测试麦克风"按钮
- **THEN** 系统强制开麦（无论之前是否闭麦），创建一个本地音频回放通道，用户可以从扬声器听到自己的声音。同时 DataChannel 不广播该音频（localMediaStream 的 track.enabled 保持原值不变直接操作 track）

#### Scenario: 停止测试麦克风
- **WHEN** 用户再次点击"停止测试"按钮或关闭设置面板
- **THEN** 本地回放通道断开，麦克风恢复到测试前的静音/开麦状态

#### Scenario: 麦克风测试时不影响远端
- **WHEN** 用户正在进行麦克风测试
- **THEN** 房间内其他用户不会听到该用户的测试音频

### Requirement: 扬声器测试
系统 SHALL 在音频设置面板中提供扬声器测试功能：使用 Web Audio API 生成 3 秒 440Hz 正弦波并通过本地扬声器播放。用户可通过音量 +/- 按钮调节扬声器输出音量（GainNode 增益，范围 0% - 100%）。

#### Scenario: 开始测试扬声器
- **WHEN** 用户点击"测试扬声器"按钮
- **THEN** 本地播放一段 3 秒的 440Hz 正弦波测试音

#### Scenario: 扬声器测试音量 +/- 调节
- **WHEN** 用户点击音量 "+" 或 "-" 按钮
- **THEN** 扬声器输出音量相应增大或减小（增益 GainNode 值 ±0.1，范围 0 ~ 1.0），当前音量百分比实时更新显示

#### Scenario: 测试扬声器完成
- **WHEN** 3 秒测试音播放完毕
- **THEN** OscillatorNode 和 GainNode 自动断开，音频上下文释放

### Requirement: 会前设置入口
系统 SHALL 在首页提供音频设置入口，用户可在加入会议前测试设备。

#### Scenario: 首页打开设置
- **WHEN** 用户在首页点击"音频设置"按钮
- **THEN** 弹出音频设置面板，功能与会议中相同