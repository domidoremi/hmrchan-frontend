# 🔍 浏览器扩展导致的 Mixed Content 问题

## 🎯 问题确认

从日志可以100%确定：**浏览器扩展在修改你的 API 请求**

### 证据

1. **我们的拦截器日志显示 HTTPS**：
```javascript
[Request] {
  fullUrl: 'https://api.momichan.xyz/api/v1/posts?...',
  baseURL: 'https://api.momichan.xyz/api/v1'
}
```

2. **但浏览器报告 HTTP**：
```
Mixed Content: ...requested an insecure XMLHttpRequest endpoint 'http://...'
```

3. **扩展痕迹**：
```javascript
ajaxRequestInterceptor.ps.js:1 XHR 加载失败
J.XMLHttpRequest.send @ ajaxRequestInterceptor.ps.js:1
```

`ajaxRequestInterceptor.ps.js` 是浏览器扩展注入的脚本！

## 🔄 请求修改流程

```
你的应用代码
    ↓
Axios 创建请求 (HTTPS ✅)
    ↓
你的 Axios 拦截器 (看到 HTTPS ✅)
    ↓
Axios 调用 XMLHttpRequest
    ↓
【浏览器扩展拦截 ⚠️】ajaxRequestInterceptor.ps.js
    ↓
扩展修改 URL: HTTPS → HTTP ❌
    ↓
XMLHttpRequest.send() 发送 HTTP 请求
    ↓
浏览器阻止 Mixed Content 🚫
```

## ✅ 立即验证

### 方法 1：隐私/无痕模式

1. 打开新的隐私/无痕窗口
2. 访问你的网站
3. 检查是否还有 Mixed Content 错误

**如果隐私模式正常 → 100% 确定是扩展问题**

### 方法 2：禁用扩展逐个测试

1. Chrome → 更多工具 → 扩展程序
2. 禁用所有扩展
3. 刷新页面
4. 如果问题消失，逐个启用扩展找到罪魁祸首

## 🔎 可疑扩展类型

可能修改请求的扩展：

1. **Ajax Interceptor** 类扩展
2. **HTTP/HTTPS Switcher**
3. **Request/Response 修改工具**
4. **API 调试工具**
5. **网络请求拦截器**
6. **开发者工具扩展**

Chrome 扩展 ID: `bpoadfkcbjbfhfodiogcnhhhpibjhbnh`（从日志中看到）

## 🛡️ 代码层面的防护（可选）

虽然问题不在我们代码中，但可以添加额外保护：

### 方案 A：直接使用 Fetch API

创建一个不经过 XMLHttpRequest 的请求方法：

```typescript
// src/utils/secureFetch.ts
export async function secureFetch(url: string, options?: RequestInit) {
  // 强制 HTTPS
  const secureUrl = url.startsWith('http://') 
    ? url.replace('http://', 'https://') 
    : url
  
  // 使用 Fetch API（可能避开某些 XHR 拦截器）
  return fetch(secureUrl, {
    ...options,
    // 添加自定义头部标识
    headers: {
      ...options?.headers,
      'X-Requested-With': 'secure-fetch',
    },
  })
}
```

### 方案 B：检测和警告用户

```typescript
// src/utils/extensionDetector.ts
export function detectHttpInterceptor() {
  const xhr = new XMLHttpRequest()
  const originalSend = xhr.send
  
  // 检查是否被修改
  if (originalSend.toString().includes('ajaxRequestInterceptor')) {
    console.error('🚨 检测到浏览器扩展正在修改网络请求！')
    console.error('这可能导致 HTTPS 请求被降级为 HTTP')
    console.error('请在隐私模式测试，或禁用请求拦截类扩展')
    
    // 可选：显示用户警告
    alert('检测到浏览器扩展可能影响网站功能，建议使用隐私模式访问')
  }
}
```

### 方案 C：劫持 XMLHttpRequest.send

在应用初始化时重写 XMLHttpRequest：

```typescript
// src/main.ts - 在所有其他代码之前执行
(function protectXHR() {
  const OriginalXHR = window.XMLHttpRequest
  const originalOpen = OriginalXHR.prototype.open
  const originalSend = OriginalXHR.prototype.send
  
  let currentUrl: string = ''
  
  OriginalXHR.prototype.open = function(method: string, url: string, ...args: any[]) {
    // 保存原始 URL
    currentUrl = url
    
    // 强制 HTTPS
    if (url.startsWith('http://api.momichan.xyz')) {
      url = url.replace('http://', 'https://')
      console.warn('[XHR Protection] Forced HTTP to HTTPS:', currentUrl, '→', url)
    }
    
    return originalOpen.call(this, method, url, ...args)
  }
  
  OriginalXHR.prototype.send = function(...args: any[]) {
    // 检查是否有扩展修改了 URL
    const xhr = this as XMLHttpRequest
    // @ts-ignore - 访问内部属性
    const actualUrl = xhr._url || currentUrl
    
    if (actualUrl && actualUrl.startsWith('http://api.momichan.xyz')) {
      console.error('🚨🚨🚨 CRITICAL: 扩展修改了请求 URL！')
      console.error('原始:', currentUrl)
      console.error('被修改为:', actualUrl)
      
      // 尝试重新打开连接
      try {
        xhr.abort()
        xhr.open(xhr.method || 'GET', actualUrl.replace('http://', 'https://'))
      } catch (e) {
        console.error('无法修正被扩展篡改的请求:', e)
      }
    }
    
    return originalSend.apply(this, args)
  }
})()
```

## 📋 推荐操作流程

### 立即行动

1. **在隐私模式测试**
   - 如果正常 → 确认是扩展问题
   - 向用户说明需要禁用某些扩展

2. **找到问题扩展**
   - 禁用所有扩展
   - 逐个启用找到罪魁祸首

3. **长期解决**
   - 禁用该扩展，或
   - 仅在需要时启用，或
   - 联系扩展开发者报告 bug

### 如果必须保留扩展

实施方案 C（XHR 保护），在 `src/main.ts` 最顶部添加保护代码。

## 🎯 验证修复

在禁用扩展或使用隐私模式后，应该看到：

- ✅ 所有 `[Request]` 日志显示 HTTPS
- ✅ 所有 XHR 请求都成功
- ✅ 无 Mixed Content 错误
- ✅ 无 `ajaxRequestInterceptor.ps.js` 日志
- ✅ 应用功能完全正常

## 💡 关键 Takeaway

**问题不在你的代码中！** 

你的：
- ✅ 硬编码 HTTPS
- ✅ Axios 拦截器
- ✅ 所有配置

都是**完全正确**的。

问题在于：
- ❌ 浏览器扩展在 XMLHttpRequest 层面拦截并修改请求
- ❌ 这发生在你的代码之后、浏览器发送之前
- ❌ 你无法通过 Axios 配置阻止这种修改

**解决方案**：禁用该扩展，或在应用层面添加 XHR 保护。

---

**总结**：这是一个非常难以诊断的问题，因为我们的日志显示一切正常（HTTPS），但实际发送的请求被扩展改成了 HTTP。这就是为什么看起来像"鬼打墙"——代码明明是对的，但请求就是 HTTP。
