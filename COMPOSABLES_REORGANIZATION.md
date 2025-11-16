# Composables 目录重组计划

## 📊 当前状态

- 35个 composables 文件
- 平坦结构，难以维护
- 缺乏逻辑分组

## 🎯 新的目录结构

### 📁 core/ (核心功能 - 7个文件)

系统级功能，与具体业务无关

```
core/
├── useResponsive.ts          # 响应式布局检测
├── useI18nFallback.ts         # 国际化降级
├── useI18nOptimized.ts        # 国际化优化
├── usePerformanceMonitoring.ts # 性能监控
├── useEventListener.ts        # 事件监听器
├── useDebounce.ts             # 防抖
└── useThrottle.ts             # 节流
```

### 📁 ui/ (UI交互 - 9个文件)

用户界面交互相关

```
ui/
├── useAnimation.ts            # 动画控制
├── useModal.ts                # 模态框
├── useToast.ts                # Toast通知
├── useFocusTrap.ts            # 焦点捕获
├── useKeyboardShortcuts.ts    # 键盘快捷键
├── useLongPress.ts            # 长按检测
├── useAccessibility.ts        # 无障碍支持
├── useLazyComponent.ts        # 组件懒加载
└── useClipboard.ts            # 剪贴板
```

### 📁 form/ (表单相关 - 3个文件)

表单验证和输入处理

```
form/
├── useFormValidation.ts       # 表单验证
├── useAutoSave.ts             # 自动保存
└── useInputMethod.ts          # 输入法处理
```

### 📁 data/ (数据处理 - 4个文件)

数据获取、分页、搜索

```
data/
├── usePagination.ts           # 分页
├── useInfiniteScroll.ts       # 无限滚动
├── useOptimisticUpdate.ts     # 乐观更新
└── useSearch.ts               # 搜索功能
```

### 📁 media/ (媒体处理 - 7个文件)

图片、视频等媒体资源处理

```
media/
├── useImageLazyLoad.ts        # 图片懒加载
├── useImagePreload.ts         # 图片预加载
├── useImageUpload.ts          # 图片上传
├── useSmartPreload.ts         # 智能预加载
├── useMediaErrorRecovery.ts   # 媒体错误恢复
├── useVirtualScroll.ts        # 虚拟滚动
└── useWaterfallLayout.ts      # 瀑布流布局
```

### 📁 business/ (业务逻辑 - 3个文件)

特定业务功能

```
business/
├── useFavorites.ts            # 收藏功能
├── usePostCard.ts             # 帖子卡片
└── usePostCardAnimation.ts    # 帖子卡片动画
```

## 🔄 迁移步骤

### Step 1: 创建新目录结构

```bash
mkdir -p src/composables/{core,ui,form,data,media,business}
```

### Step 2: 移动文件

按分类将文件移动到对应目录

### Step 3: 更新导入路径

全局搜索替换导入语句：

```typescript
// 旧路径
from '@/composables/useResponsive'

// 新路径
from '@/composables/core/useResponsive'
```

### Step 4: 更新 index.ts

重新组织导出，按分类导出

### Step 5: 测试验证

确保所有导入正常工作

## 📈 预期收益

✅ **可发现性提升**

- 按功能快速定位需要的 composable
- 清晰的目录结构

✅ **可维护性提升**

- 相关功能集中管理
- 更容易理解代码组织

✅ **可扩展性提升**

- 新功能有明确的归属
- 避免目录混乱

## ⚠️ 注意事项

1. **向后兼容**
   - 在 `index.ts` 中保留旧的导出路径
   - 逐步迁移使用者

2. **导入路径**
   - 更新所有组件的导入
   - 检查 TypeScript 编译是否通过

3. **文档更新**
   - 更新 README
   - 更新开发文档

## 📝 迁移检查清单

- [ ] 创建新目录结构
- [ ] 移动 core/ 文件 (7个)
- [ ] 移动 ui/ 文件 (9个)
- [ ] 移动 form/ 文件 (3个)
- [ ] 移动 data/ 文件 (4个)
- [ ] 移动 media/ 文件 (7个)
- [ ] 移动 business/ 文件 (3个)
- [ ] 更新 index.ts
- [ ] 全局搜索替换导入路径
- [ ] 运行 TypeScript 检查
- [ ] 测试关键功能
- [ ] 提交并推送

## 🔧 自动化脚本

可以创建一个迁移脚本来自动处理大部分工作：

```bash
#!/bin/bash
# migrate-composables.sh

# 创建目录
mkdir -p src/composables/{core,ui,form,data,media,business}

# 移动文件 (示例)
mv src/composables/useResponsive.ts src/composables/core/
mv src/composables/useAnimation.ts src/composables/ui/
# ... 更多文件

# 更新导入 (需要配合全局搜索替换)
```

---

**预计工作量**: 2-3小时  
**风险等级**: 低（主要是文件移动）  
**影响范围**: 所有使用 composables 的组件
