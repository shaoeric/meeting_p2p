# Local P2P Testing Spec

## Why
需要在单台电脑上通过运行两个独立的 Electron 进程来验证 P2P 局域网通信功能，无需等待多台物理机器。利用 Electron 的 `--user-data-dir` 参数隔离两个实例的身份和数据目录。主持人/参会者的身份由房间行为自然决定（谁创建房间谁就是主持人），不需要命令行参数预设角色。

## What Changes
- 新增 `test:local` npm 脚本：一键构建并启动两个独立 Electron 实例
- 新增 `test:a` / `test:b` npm 脚本：单独启动实例A或实例B（按用户行为区分主持人/参会者）
- 两个实例使用独立的 `userData` 目录（`.test-data/a` 和 `.test-data/b`），实现数据隔离和身份隔离
- 启动时两个实例窗口标题均为默认标题，由用户自行在某个实例中创建房间（成为主持人），在另一个实例中输入房间号加入（成为参会者）
- **BREAKING** 无破坏性变更

## Impact
- Affected specs: `peer-voice-meeting`（补充 Task 9 中待验证的局域网 P2P 测试项）
- Affected code: `package.json`（新增测试脚本），`.test-data/README.txt`（测试说明）

## ADDED Requirements

### Requirement: 双实例启动
系统 SHALL 提供一键启动两个独立 Electron 进程的能力，两个进程使用不同的 `--user-data-dir` 实现完全隔离，可在同一台电脑上完成 P2P 通信测试。

#### Scenario: 一键启动双实例测试
- **WHEN** 用户执行 `npm run test:local`
- **THEN** 先执行构建，然后自动启动两个 Electron 窗口：窗口A 和窗口B，两个窗口使用独立的 userData 目录（`.test-data/a` 和 `.test-data/b`）

#### Scenario: 单独启动实例 A
- **WHEN** 用户执行 `npm run test:a`
- **THEN** 启动一个 Electron 窗口，使用 `.test-data/a` 作为 userData 目录

#### Scenario: 单独启动实例 B
- **WHEN** 用户执行 `npm run test:b`
- **THEN** 启动一个 Electron 窗口，使用 `.test-data/b` 作为 userData 目录

### Requirement: 实例身份隔离
系统 SHALL 通过独立的 userData 目录确保两个实例之间完全隔离，互不干扰。

#### Scenario: 数据隔离
- **WHEN** 实例A 创建房间后
- **THEN** 该房间信息存储在实例A 的 userData 中，实例B 无法访问实例A 的数据文件

#### Scenario: 音频设备隔离
- **WHEN** 两个实例同时请求麦克风权限
- **THEN** 两个实例的音频流互相独立，操作系统将两个进程视为独立的音频源

#### Scenario: 进程独立性
- **WHEN** 关闭任一个实例
- **THEN** 另一个实例不受影响，继续正常运行

### Requirement: 测试说明
系统 SHALL 在 `.test-data/` 目录提供 README 说明测试流程，引导用户完成 P2P 通信验证。

#### Scenario: 测试步骤文件
- **WHEN** 用户查看 `.test-data/` 目录
- **THEN** 存在 README 文件，说明测试步骤（实例A 创建房间 → 输入显示名 → 获得房间号 → 实例B 输入房间号加入 → 输入显示名 → 验证语音/屏幕共享/标注功能）