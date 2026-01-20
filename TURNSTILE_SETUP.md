# Cloudflare Turnstile 配置指南

## 概述

本项目集成了 Cloudflare Turnstile 人机验证，用于保护登录和注册接口。

## 当前配置

### Turnstile 设置

- **模式**: 托管（Managed）
- **预先许可**: 是（交互式级别）
- **行为**: Cloudflare 根据访问者信任度自动决定是否显示挑战

### 集成位置

- 登录页面: `src/views/LoginPage.vue`
- 注册页面: `src/views/RegisterPage.vue`
- 组件: `src/components/ui/TurnstileWidget.vue`

## 配置步骤

### 1. 获取 Site Key

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Turnstile** 页面
3. 选择你的站点
4. 复制 **Site Key**（公开密钥，可以暴露在前端代码中）

### 2. 本地开发环境配置

编辑 `.env.development` 文件：

```bash
# 方式 1: 使用测试密钥（总是通过，用于开发测试）
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA

# 方式 2: 使用真实密钥（从 Cloudflare Dashboard 获取）
VITE_TURNSTILE_SITE_KEY=你的真实Site Key
```

**Cloudflare 测试密钥：**

| 场景           | Site Key                   |
| -------------- | -------------------------- |
| 总是通过       | `1x00000000000000000000AA` |
| 总是阻止       | `2x00000000000000000000AB` |
| 强制交互式挑战 | `3x00000000000000000000FF` |

参考: https://developers.cloudflare.com/turnstile/troubleshooting/testing/

### 3. 生产环境配置

在 Cloudflare Pages Dashboard 中配置：

1. 进入 **Pages** → 你的项目 → **Settings** → **Environment variables**
2. 点击 **Add variable**
3. 配置：
   - **Variable name**: `VITE_TURNSTILE_SITE_KEY`
   - **Value**: 你的真实 Site Key
   - **Environment**: `Production` 和/或 `Preview`
4. 点击 **Save**
5. 重新部署项目

### 4. 重启开发服务器

```bash
bun run dev
```

## 工作原理

### 前端逻辑

```typescript
// 检查是否配置了 Site Key
const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim()
const turnstileEnabled = turnstileSiteKey.length > 0

// 只有配置了 Site Key 才显示 Turnstile 组件
<TurnstileWidget
  v-if="turnstileEnabled"
  :site-key="turnstileSiteKey"
  @verify="handleTurnstileVerify"
/>

// 提交时验证 token
if (turnstileEnabled && !turnstileToken.value) {
  toastStore.warning(t('auth.error.turnstileRequired'))
  return
}
```

### 托管模式行为

在托管模式下，Cloudflare 会根据访问者的信任评分决定：

1. **高信任度访问者**
   - 静默通过，不显示任何界面
   - 自动生成 token
   - 用户无感知

2. **中等信任度访问者**
   - 显示复选框："我不是机器人"
   - 无需识别图像或文字
   - 点击即可通过

3. **低信任度访问者**
   - 可能显示更复杂的挑战
   - 需要完成交互式验证

### 预先许可 Cookie

配置了"预先许可（交互式）"后：

- 用户通过验证后，Cloudflare 会设置一个许可 Cookie
- Cookie 有效期内，用户访问其他受保护页面时可以免除挑战
- 有效期在 Cloudflare 安全设置中配置

## 常见问题

### Q: 为什么登录时没有看到 Turnstile 组件？

**A: 可能的原因：**

1. **未配置 Site Key**
   - 检查 `.env.development` 或 Cloudflare Pages 环境变量
   - 确保 `VITE_TURNSTILE_SITE_KEY` 有值

2. **高信任度静默通过**
   - 托管模式下，高信任度访问者会静默通过
   - 打开浏览器开发者工具 → Network，查看是否有 `challenges.cloudflare.com` 的请求
   - 如果有请求但没有显示界面，说明是静默通过

3. **开发环境缓存**
   - 清除浏览器缓存
   - 重启开发服务器

### Q: 如何测试 Turnstile 是否正常工作？

**A: 使用测试密钥：**

```bash
# 强制显示交互式挑战
VITE_TURNSTILE_SITE_KEY=3x00000000000000000000FF
```

这会强制显示复选框，方便测试界面和交互逻辑。

### Q: 生产环境如何验证配置？

**A: 检查步骤：**

1. 访问生产环境登录页面
2. 打开浏览器开发者工具 → Console
3. 输入：`import.meta.env.VITE_TURNSTILE_SITE_KEY`
4. 应该显示你的 Site Key（不是 `undefined`）

或者查看页面源代码，搜索 `challenges.cloudflare.com`，应该能找到 Turnstile 脚本。

### Q: 后端如何验证 Turnstile token？

**A: 后端验证流程：**

1. 前端提交时携带 `turnstile_token`
2. 后端调用 Cloudflare Turnstile 验证 API：

```bash
POST https://challenges.cloudflare.com/turnstile/v0/siteverify
Content-Type: application/json

{
  "secret": "你的Secret Key（从Dashboard获取）",
  "response": "前端提交的token",
  "remoteip": "用户IP（可选）"
}
```

3. 验证响应：

```json
{
  "success": true,
  "challenge_ts": "2024-01-20T12:00:00Z",
  "hostname": "momichan.xyz"
}
```

参考: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

## 安全建议

1. **Secret Key 保密**
   - Secret Key 只能在后端使用
   - 不要提交到 Git 仓库
   - 使用环境变量管理

2. **Site Key 可以公开**
   - Site Key 可以暴露在前端代码中
   - 可以提交到 Git 仓库

3. **后端必须验证**
   - 前端验证只是 UX 优化
   - 后端必须调用 Cloudflare API 验证 token
   - 不要信任前端提交的任何数据

4. **设置域名白名单**
   - 在 Cloudflare Turnstile 设置中配置允许的域名
   - 防止 Site Key 被其他网站滥用

## 参考文档

- [Cloudflare Turnstile 官方文档](https://developers.cloudflare.com/turnstile/)
- [测试密钥](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
- [服务端验证](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [托管模式说明](https://developers.cloudflare.com/turnstile/concepts/widget-types/)
