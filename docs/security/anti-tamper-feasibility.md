---
description: 前端 anti-tamper 八类手段可行性评估与项目落地
---

# 前端 Anti-Tamper 八类手段评估与落地（2026-02）

## 1. 范围与原则

- 本文聚焦“提高逆向与篡改成本”，不承诺“不可破解”。
- 前端方案全部是软防护，真正安全边界仍在后端（签名验证、风控、限流、封禁）。
- 高成本手段均以环境变量开关落地，默认保守关闭。

## 2. 八类手段可行性评估 + 已落地映射

| 手段 | 可行性 | 风险/成本 | 项目落地映射 | 默认策略 |
|---|---|---|---|---|
| 代码压缩与丑化 (Minification & Uglify) | 高 | 低 | `vite.config.ts` 的 Oxc `minify` + `mangle` + `drop_console/drop_debugger` | 默认开启 |
| 控制流平坦化 (Control Flow Flattening) | 中 | 运行时性能损耗、调试困难 | `VITE_OBFUSCATION_CONTROL_FLOW` | 默认关闭，仅关键 chunk 开 |
| 字符串阵列化 (String Array) | 中高 | 体积上涨、解码开销 | `VITE_OBFUSCATION_STRING_ARRAY` + `VITE_OBFUSCATION_STRING_ARRAY_ENCODING` | 默认开启 `base64` |
| 废代码注入 (Dead Code Injection) | 中低 | 体积膨胀、构建变慢 | `VITE_OBFUSCATION_DEAD_CODE` | 默认关闭 |
| 无限 Debugger | 低 | 用户体验差、易绕过 | `VITE_OBFUSCATION_INFINITE_DEBUGGER` + `..._INTERVAL`（映射 obfuscator `debugProtection`） | 默认关闭，仅实验 |
| 检测控制台打开 | 中 | 有误判，不能当硬拦截 | `consoleGuard.ts`（`balanced/strict` 下发出 `security:tamper-suspected`） | 默认启用信号，不做唯一拦截 |
| 代码防格式化检测 (Anti-formatting) | 中低 | 脆弱、兼容性与维护成本高 | `VITE_OBFUSCATION_ANTI_FORMATTING`（映射 `selfDefending`） | 默认关闭 |
| 前端代码加密 | 低（安全价值） | 客户端可提取密钥，难形成真正保密 | `VITE_OBFUSCATION_CODE_ENCRYPTION`（RC4 字符串包裹，属“伪加密”） | 默认关闭，不替代后端校验 |

## 3. 已落地实现

### 3.1 运行时 anti-tamper

- `src/utils/consoleGuard.ts`
  - 模式化：`off | warn | balanced | strict`
  - 信号事件：`security:tamper-suspected`（`devtools-open` / `shortcut-blocked` / `contextmenu-blocked`）
  - 开发环境可选开启：`VITE_ANTI_TAMPER_ALLOW_DEV=true`
- `src/main.ts` 已接入，并处理 HMR dispose，避免重复注册。

### 3.2 构建期 anti-tamper / obfuscation

- `vite-plugin-obfuscation.ts` 已支持以下开关：
  - `VITE_OBFUSCATION_STRING_ARRAY`
  - `VITE_OBFUSCATION_STRING_ARRAY_ENCODING`
  - `VITE_OBFUSCATION_CONTROL_FLOW`
  - `VITE_OBFUSCATION_DEAD_CODE`
  - `VITE_OBFUSCATION_ANTI_FORMATTING`
  - `VITE_OBFUSCATION_INFINITE_DEBUGGER`
  - `VITE_OBFUSCATION_INFINITE_DEBUGGER_INTERVAL`
  - `VITE_OBFUSCATION_CODE_ENCRYPTION`

> 启用混淆前先安装依赖：
>
> ```bash
> bun add -d javascript-obfuscator
> ```

## 4. 推荐配置

### 4.1 稳态生产（默认推荐）

```env
VITE_ANTI_TAMPER_MODE=balanced
VITE_ANTI_TAMPER_ALLOW_DEV=false
VITE_DISABLE_CONTEXT_MENU=false

VITE_ENABLE_OBFUSCATION=false
VITE_OBFUSCATION_PROFILE=safe
VITE_OBFUSCATION_STRING_ARRAY=true
VITE_OBFUSCATION_STRING_ARRAY_ENCODING=base64
VITE_OBFUSCATION_ANTI_FORMATTING=false
VITE_OBFUSCATION_INFINITE_DEBUGGER=false
VITE_OBFUSCATION_INFINITE_DEBUGGER_INTERVAL=0
VITE_OBFUSCATION_CODE_ENCRYPTION=false
VITE_OBFUSCATION_CONTROL_FLOW=false
VITE_OBFUSCATION_DEAD_CODE=false
```

### 4.2 高风险灰度（仅关键模块）

```env
VITE_ENABLE_OBFUSCATION=true
VITE_OBFUSCATION_PROFILE=safe
VITE_OBFUSCATION_CONTROL_FLOW=true
VITE_OBFUSCATION_DEAD_CODE=false
VITE_OBFUSCATION_ANTI_FORMATTING=false
VITE_OBFUSCATION_INFINITE_DEBUGGER=false
```

### 4.3 对抗实验（短期）

```env
VITE_ENABLE_OBFUSCATION=true
VITE_OBFUSCATION_PROFILE=aggressive
VITE_OBFUSCATION_ANTI_FORMATTING=true
VITE_OBFUSCATION_INFINITE_DEBUGGER=true
VITE_OBFUSCATION_INFINITE_DEBUGGER_INTERVAL=2000
VITE_OBFUSCATION_CODE_ENCRYPTION=true
```

## 5. 验收与回归建议

1. 对关键页面做基线与开关后的性能对比（LCP、TBT、长任务占比）。
2. 若性能退化明显，按顺序回退：`INFINITE_DEBUGGER` -> `DEAD_CODE` -> `CONTROL_FLOW`。
3. 保持后端签名与风控为强制安全面；前端仅作为成本抬升层。
