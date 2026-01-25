# Cloudflare Pages CSP 配置指南

## 问题背景

Cloudflare Pages 的 `_headers` 文件有时会被忽略或不完全生效，导致 Content Security Policy (CSP) 配置无法正确应用。当你在浏览器控制台看到以下错误时：

```
Note that 'script-src' was not explicitly set, so 'default-src' is used as a fallback.
```

这说明 CSP 策略没有正确应用。

## 解决方案：使用 Transform Rules

在 Cloudflare Dashboard 中手动配置 HTTP Response Headers Transform Rules，确保 CSP 策略始终生效。

### 步骤 1：进入 Cloudflare Dashboard

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择你的域名（例如 `momichan.xyz`）
3. 进入 **Rules** → **Transform Rules** → **Modify Response Header**

### 步骤 2：创建新规则

点击 **Create rule** 按钮，配置如下：

#### 规则名称

```
CSP Security Headers
```

#### 匹配条件 (When incoming requests match)

```
Hostname equals momichan.xyz
OR
Hostname ends with .pages.dev
```

#### 修改响应头 (Then)

添加以下 HTTP Response Headers：

##### 1. Content-Security-Policy

```
Set static
Header name: Content-Security-Policy
Value: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://api.momichan.xyz https://challenges.cloudflare.com https://static.cloudflareinsights.com https://cloudflareinsights.com https://pbs.twimg.com https://i.ytimg.com; media-src 'self' https: blob:; object-src 'none'; worker-src 'self' blob:; frame-src 'self' https://challenges.cloudflare.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests
```

##### 2. Strict-Transport-Security

```
Set static
Header name: Strict-Transport-Security
Value: max-age=31536000; includeSubDomains; preload
```

##### 3. X-Frame-Options

```
Set static
Header name: X-Frame-Options
Value: SAMEORIGIN
```

##### 4. X-Content-Type-Options

```
Set static
Header name: X-Content-Type-Options
Value: nosniff
```

##### 5. Referrer-Policy

```
Set static
Header name: Referrer-Policy
Value: strict-origin-when-cross-origin
```

##### 6. Permissions-Policy

```
Set static
Header name: Permissions-Policy
Value: camera=(), microphone=(), geolocation=(), fullscreen=(self), payment=()
```

### 步骤 3：保存并部署

点击 **Deploy** 按钮保存规则。规则会立即生效。

### 步骤 4：验证配置

1. 清除浏览器缓存
2. 访问你的网站
3. 打开浏览器开发者工具 → Network 标签
4. 刷新页面，点击主文档请求
5. 查看 Response Headers，确认 `Content-Security-Policy` 存在且正确

或者使用 curl 命令验证：

```bash
curl -I https://momichan.xyz
```

应该看到：

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com https://challenges.cloudflare.com; ...
```

## CSP 策略说明

### 各指令含义

| 指令                        | 值                                                                               | 说明                                            |
| --------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| `default-src`               | `'self'`                                                                         | 默认只允许同源资源                              |
| `script-src`                | `'self' https://static.cloudflareinsights.com https://challenges.cloudflare.com` | 允许自身脚本 + Cloudflare Analytics + Turnstile |
| `style-src`                 | `'self' 'unsafe-inline'`                                                         | 允许自身样式 + 内联样式（Vue SFC 需要）         |
| `img-src`                   | `'self' data: https: blob:`                                                      | 允许所有 HTTPS 图片 + data URI + blob           |
| `font-src`                  | `'self' data:`                                                                   | 允许自身字体 + data URI                         |
| `connect-src`               | `'self' https://api.momichan.xyz ...`                                            | 允许 API 请求 + 外部 CDN                        |
| `media-src`                 | `'self' https: blob:`                                                            | 允许 HTTPS 媒体 + blob                          |
| `object-src`                | `'none'`                                                                         | 禁止插件（Flash 等）                            |
| `worker-src`                | `'self' blob:`                                                                   | 允许 Service Worker                             |
| `frame-src`                 | `'self' https://challenges.cloudflare.com`                                       | 只允许 Turnstile iframe                         |
| `frame-ancestors`           | `'self'`                                                                         | 只允许同源嵌入                                  |
| `base-uri`                  | `'self'`                                                                         | 限制 base 标签                                  |
| `form-action`               | `'self'`                                                                         | 限制表单提交                                    |
| `upgrade-insecure-requests` | -                                                                                | 自动升级到 HTTPS                                |

### 为什么不使用 `'unsafe-inline'` for scripts？

使用 `'unsafe-inline'` 会显著降低安全性，使网站容易受到 XSS 攻击。我们通过域名白名单的方式允许 Cloudflare 的外部脚本，而不是开启 `'unsafe-inline'`。

## 常见问题

### Q: 为什么 `_headers` 文件不生效？

A: Cloudflare Pages 的 `_headers` 文件有以下限制：

- 只在静态资源上生效，动态路由可能被忽略
- 某些 header 可能被 Cloudflare 的全局配置覆盖
- 部署时可能没有正确读取文件

使用 Transform Rules 可以确保 100% 生效。

### Q: Transform Rules 和 `_headers` 文件冲突吗？

A: 不会。Transform Rules 的优先级更高，会覆盖 `_headers` 文件中的同名 header。建议同时保留两者，作为双重保障。

### Q: 如何测试 CSP 是否正确？

A: 使用以下工具：

- [CSP Evaluator](https://csp-evaluator.withgoogle.com/) - Google 的 CSP 评估工具
- [Security Headers](https://securityheaders.com/) - 检查所有安全 header
- 浏览器开发者工具 → Console - 查看 CSP 违规报告

### Q: Turnstile 验证码仍然报错怎么办？

A: 确保以下配置正确：

1. `script-src` 包含 `https://challenges.cloudflare.com`
2. `frame-src` 包含 `https://challenges.cloudflare.com`
3. `connect-src` 包含 `https://challenges.cloudflare.com`
4. Turnstile 后台配置的域名包含你的网站域名

## 参考资料

- [Cloudflare Transform Rules 文档](https://developers.cloudflare.com/rules/transform/)
- [Content Security Policy 参考](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Cloudflare Turnstile 文档](https://developers.cloudflare.com/turnstile/)
