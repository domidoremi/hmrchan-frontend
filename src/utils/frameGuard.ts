/**
 * Frame Guard - 前端点击劫持防御（第二阶段）
 *
 * 防御架构（三层纵深）：
 * L1 服务端: X-Frame-Options: SAMEORIGIN + CSP frame-ancestors 'self'  (public/_headers)
 * L2 内联 JS: 检测 iframe 时隐藏 + 同步脚本跳出                        (index.html)
 * L3 模块 JS: 本文件 — 跨域 iframe 降级清理                            (main.ts)
 *
 * 第一阶段（L2）在 index.html 中以内联 <script> 实现：
 * - 顶层访问：不做额外处理（避免影响首屏渲染）
 * - iframe 访问：立即隐藏 html，并尝试 top.location 跳出
 *
 * 第二阶段（L3，本文件）在 ES module 加载后执行：
 * - 非 iframe → 确保隐藏样式已移除（兜底）
 * - 跨域 iframe 跳出失败 → 清空 body + 阻断指针事件
 */

/**
 * 第二阶段 frame guard
 * 在 main.ts 中同步调用，处理内联脚本未能解决的场景
 */
export function initFrameGuard(): void {
  if (window.self === window.top) {
    // 正常访问 — 防御性兜底，确保未残留隐藏样式
    document.documentElement.style.removeProperty('display')
    return
  }

  window.dispatchEvent(
    new CustomEvent('security:tamper-suspected', {
      detail: {
        signal: 'iframe-context',
        timestamp: Date.now(),
      },
    })
  )

  // 仍在 iframe 内（跨域跳出失败）— 彻底阻断页面
  // 保持 html 隐藏，额外清空 DOM 防止通过 DevTools 恢复
  if (document.body) {
    nukeBody()
  } else {
    document.addEventListener('DOMContentLoaded', nukeBody, { once: true })
  }
}

function nukeBody(): void {
  document.body.innerHTML = ''
  document.body.style.pointerEvents = 'none'
  document.body.style.userSelect = 'none'
}
