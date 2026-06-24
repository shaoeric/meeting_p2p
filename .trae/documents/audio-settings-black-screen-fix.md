# 音频设置面板黑屏问题 — 修复计划

## 根因分析

经过逐文件逐行排查，确认以下 **3 个 Bug** 共同导致黑屏：

| # | 严重度 | 文件:行号 | 问题 |
|---|--------|----------|------|
| 1 | 🔴 | [App.css:11](file:///d:/Users/shenw1/meeting/src/renderer/src/App.css#L11) | `body { overflow: hidden }` — 关键根因 |
| 2 | 🔴 | [HomePage.tsx:1-7](file:///d:/Users/shenw1/meeting/src/renderer/src/components/HomePage.tsx#L1-L7) | 缺少 `import AudioSettings` — 运行时 ReferenceError |
| 3 | 🟡 | [App.css:263](file:///d:/Users/shenw1/meeting/src/renderer/src/App.css#L263) | `.meeting-main { overflow: hidden }` — 叠加裁剪 |

### Bug 1 详细解释（核心根因）

根据 CSS 规范 (§11.1.1)，当 `<html>` 保持默认 `overflow: visible` 而 `<body>` 设置 `overflow: hidden` 时，用户代理必须将 `overflow` 属性从 `<body>` **传播到视口 (viewport)**。这意味着整个视口获得 `overflow: hidden`。

`.audio-settings-overlay { position: fixed; inset: 0; }` 相对于视口定位。当视口有 `overflow: hidden` 时，Chromium 的 Compositor 层会将 fixed 定位的覆盖层标记为不可见/被裁剪，直接跳过渲染——表现为完全黑屏。

这解释了为什么之前移除 `backdrop-filter` 没有效果：问题根本不在滤镜，而在视口的 overflow 属性。

### Bug 2 详细解释

[HomePage.tsx](file:///d:/Users/shenw1/meeting/src/renderer/src/components/HomePage.tsx) 第 259 行使用了 `<AudioSettings />`：

```tsx
{store.showAudioSettings && <AudioSettings />}
```

但文件头部没有任何 `import AudioSettings from './AudioSettings'`。React 运行到此处会抛出 `ReferenceError: AudioSettings is not defined`，整个组件树崩溃。

---

## 修复方案

### 修复 1: 解决 viewport overflow 裁剪

**文件**: [App.css](file:///d:/Users/shenw1/meeting/src/renderer/src/App.css)

将 `overflow: hidden` 从 `body` 移到 `html` 上（html 的 overflow 不会传播到 viewport）：

```css
/* 修改前 */
body {
  ...
  overflow: hidden;
}

/* 修改后 */
html {
  overflow: hidden;
}
body {
  ...  /* 删除 overflow: hidden */
}
```

### 修复 2: 补齐 HomePage 缺失的 import

**文件**: [HomePage.tsx](file:///d:/Users/shenw1/meeting/src/renderer/src/components/HomePage.tsx)

在第 7 行后添加：

```tsx
import AudioSettings from './AudioSettings'
```

### 修复 3: 移除 `.meeting-main` 上的 overflow hidden

**文件**: [App.css](file:///d:/Users/shenw1/meeting/src/renderer/src/App.css)

```css
/* 修改前 */
.meeting-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 修改后 */
.meeting-main {
  display: flex;
  flex: 1;
}
```

`.meeting-main` 的 `overflow: hidden` 虽然理论上不影响 `position: fixed` 元素，但在 Chromium 多层 compositing 场景下可能产生叠加裁剪 Bug。考虑到其子元素都已经有各自的 overflow 控制（如 `.participants-sidebar` 已有 `overflow-y: auto`，`.screen-share-area` 已有 `overflow: hidden`），移除它是安全的。

---

## 涉及文件

| 文件 | 操作 | 行数 |
|------|------|------|
| [App.css](file:///d:/Users/shenw1/meeting/src/renderer/src/App.css) | 移动 overflow: hidden 到 html；删除 .meeting-main 的 overflow | L7-L12, L260-L263 |
| [HomePage.tsx](file:///d:/Users/shenw1/meeting/src/renderer/src/components/HomePage.tsx) | 添加 import AudioSettings | L7 |

---

## 验证步骤

1. `npm run build` — 确保构建 0 错误
2. `npm run test:local` — 启动双实例
3. 在实例 A（创建房间 → 进入会议），点击底部栏 ⚙️ 按钮 → 确认弹出面板显示"音频设置"标题 + "麦克风"区域 + "扬声器"区域 + 音量调节
4. 返回首页，点击"音频设置"按钮 → 确认弹出同样的面板
5. 关闭面板 → 确认恢复正常
6. `npx vitest run` — 确保 115 tests 通过
7. `git commit` + `git push`
