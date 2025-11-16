# Store 结构优化总结

## 概述

本次优化对项目中的 7 个 Pinia stores 进行了全面的规范化和增强，统一了代码结构、优化了持久化配置，并完善了错误处理机制。

## 优化内容

### 1. 统一 Store 结构 (任务 18.1)

所有 stores 现在遵循统一的结构规范：

```typescript
export const useXxxStore = defineStore('xxx', () => {
  // 设置日志上下文
  const logContext = { category: 'XxxStore' }

  // ==================== 状态 ====================
  const state1 = ref(...)
  const state2 = ref(...)

  // ==================== 计算属性 ====================
  const computed1 = computed(...)

  // ==================== 内部状态 ====================
  // 不需要暴露的内部变量

  // ==================== Actions ====================

  /**
   * Action 描述
   */
  function action1() {
    // 实现
  }

  return {
    // 状态
    state1,
    state2,

    // 计算属性
    computed1,

    // 方法
    action1,
  }
}, {
  // 持久化配置（如需要）
})
```

#### 具体改进：

**auth.ts**

- ✅ 已有良好结构
- ✅ 已使用统一错误处理
- ✅ 已集成 logger

**counter.ts**

- ✅ 添加了完整的文档注释（标记为示例 Store）
- ✅ 添加了 logger 集成
- ✅ 添加了 decrement 和 reset 方法
- ✅ 统一了代码结构

**network.ts**

- ✅ 添加了完整的文档注释
- ✅ 添加了 logger 集成
- ✅ 改进了网络状态变化日志
- ✅ 添加了 updateStatus 方法（用于测试）
- ✅ 添加了错误处理

**posts.ts**

- ✅ 已有良好结构
- ✅ 已使用统一错误处理
- ✅ 已集成 logger

**settings.ts**

- ✅ 添加了日志上下文
- ✅ 改进了所有方法的错误处理
- ✅ 统一了日志格式
- ✅ 为所有方法添加了 JSDoc 注释

**theme.ts**

- ✅ 添加了完整的文档注释
- ✅ 添加了 logger 集成
- ✅ 添加了全面的错误处理
- ✅ 改进了媒体查询监听器管理
- ✅ 统一了代码结构

**toast.ts**

- ✅ 添加了完整的文档注释
- ✅ 添加了 logger 集成
- ✅ 为所有方法添加了错误处理
- ✅ 统一了代码结构
- ✅ 改进了函数命名（使用 function 声明）

### 2. 优化 Store 持久化 (任务 18.2)

#### 持久化策略优化：

**auth.ts**

```typescript
persist: {
  key: 'auth',
  storage: sessionStorage,
  pick: ['user', 'token'], // 只持久化必要状态，不持久化 loading 和 error
}
```

**posts.ts**

```typescript
persist: {
  key: 'posts',
  storage: sessionStorage,
  pick: ['filters', 'pagination'], // 只持久化用户偏好，不持久化数据
}
```

**theme.ts**

```typescript
persist: {
  key: 'theme',
  storage: localStorage,
  pick: ['theme'], // 只持久化主题选择，isDark 是计算得出的
}
```

- 移除了手动 localStorage 操作，改用 Pinia persist 插件
- 简化了 initTheme 和 setTheme 方法

**settings.ts**

- 保持现有的手动 localStorage 管理（因为需要更复杂的同步逻辑）
- 优化了保存和加载的错误处理

**其他 stores**

- counter.ts - 无需持久化（示例 Store）
- network.ts - 无需持久化（运行时状态）
- toast.ts - 无需持久化（临时通知）

### 3. 统一错误处理 (任务 18.3)

所有 stores 现在都使用统一的错误处理机制：

#### 错误处理模式：

1. **API 调用错误**

```typescript
try {
  const response = await api.get(...)
  // 处理成功
} catch (err) {
  const errorResponse = handleError(err, 'StoreName.ActionName', {
    silent: false, // 是否显示 toast
  })
  error.value = errorResponse.message
  throw err // 如果需要向上传播
}
```

2. **本地操作错误**

```typescript
try {
  // 本地操作
  logger.debug('Operation completed', logContext)
} catch (err) {
  logger.error('Operation failed', {
    ...logContext,
    error: err instanceof Error ? err.message : 'Unknown error',
  })
}
```

#### 日志记录规范：

- **DEBUG**: 详细的操作日志（开发环境）
- **INFO**: 重要的状态变化
- **WARN**: 警告信息（如未认证）
- **ERROR**: 错误信息

所有日志都包含 `logContext` 对象，便于追踪和过滤。

## 代码质量改进

### 1. 类型安全

- 所有 stores 都有完整的 TypeScript 类型定义
- 移除了 any 类型的使用
- 改进了函数参数和返回值类型

### 2. 文档完善

- 为所有 stores 添加了文件级文档注释
- 为所有 actions 添加了 JSDoc 注释
- 添加了版本号和变更说明

### 3. 代码组织

- 使用注释分隔符清晰划分代码区域
- 统一了命名规范（使用 function 声明而非箭头函数）
- 改进了代码可读性

## 性能优化

### 1. 持久化优化

- 只持久化必要的状态，减少存储空间占用
- 避免持久化大型数据集（如 posts 数组）
- 使用 sessionStorage 存储临时状态

### 2. 错误处理优化

- 使用 silent 选项避免重复的 toast 通知
- 在列表获取失败时不显示 toast，只记录日志
- 优化了错误恢复机制

## 测试建议

### 1. 单元测试

建议为以下 stores 编写单元测试：

- auth.ts - 登录、注册、登出流程
- posts.ts - 数据获取和筛选逻辑
- settings.ts - 设置同步逻辑
- theme.ts - 主题切换逻辑

### 2. 集成测试

- 测试 stores 之间的交互（如 auth 登出时清空 posts）
- 测试持久化恢复逻辑
- 测试错误处理流程

## 迁移指南

### 对现有代码的影响

1. **theme store 使用者**
   - `initTheme()` 方法仍然需要调用，但不再需要手动从 localStorage 读取
   - `setTheme()` 方法不再需要手动保存到 localStorage

2. **其他 stores**
   - API 保持不变，无需修改使用代码
   - 错误处理更加健壮，减少了崩溃风险

### 升级步骤

1. 确保安装了 `pinia-plugin-persistedstate` 插件
2. 清除旧的 localStorage/sessionStorage 数据（如果键名有变化）
3. 测试所有使用 stores 的页面和组件
4. 检查浏览器控制台，确认没有错误

## 后续优化建议

### 1. 添加 Store 单元测试

为关键 stores 编写单元测试，确保逻辑正确性。

### 2. 性能监控

添加性能监控，跟踪 store 操作的耗时。

### 3. 状态管理优化

考虑使用 Pinia 的 `storeToRefs` 优化组件中的响应式引用。

### 4. 类型增强

考虑为 store 返回值创建专门的类型定义文件。

## 总结

本次优化显著提升了 stores 的代码质量和可维护性：

- ✅ 统一了代码结构和命名规范
- ✅ 优化了持久化配置，减少不必要的存储
- ✅ 完善了错误处理和日志记录
- ✅ 改进了文档和注释
- ✅ 提升了类型安全性

所有 7 个 stores 现在都遵循相同的最佳实践，为后续开发和维护奠定了良好的基础。
