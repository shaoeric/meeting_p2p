# Tasks

- [x] Task 1: 添加 npm 测试脚本
  - [x] 添加 `test:a` 脚本：`npm run build && npx electron . --user-data-dir=./.test-data/a`
  - [x] 添加 `test:b` 脚本：`npm run build && npx electron . --user-data-dir=./.test-data/b`
  - [x] 添加 `test:local` 脚本：先构建，然后同时启动实例A 和实例B
  - [x] 验证：执行各脚本后能正确启动独立的 Electron 窗口

- [x] Task 2: 创建测试说明文件
  - [x] 创建 `.test-data/README.txt` 说明文件
  - [x] 包含完整测试步骤和操作指引
  - [x] 验证：README 内容清晰完整

# Task Dependencies
- Task 1 和 Task 2 无依赖，可并行