# i18n 快速参考指南

## 语言切换

```typescript
import { useI18nOptimized } from '@/composables/useI18nOptimized'

const { changeLocale, isSwitching, averageSwitchDelay } = useI18nOptimized()

// 切换语言（带性能监控和动画）
await changeLocale('zh-CN')

// 检查是否正在切换
if (isSwitching.value) {
  console.log('Switching language...')
}

// 查看平均切换延迟
console.log(`Average delay: ${averageSwitchDelay.value}ms`)
```

## 日期时间格式化

```typescript
import {
  formatRelativeTime,
  formatDateTime,
  formatDate,
  formatTime,
  formatCalendar,
  formatSmart,
} from '@/utils/dateFormat'

// 相对时间（"2 hours ago"）
const relative = await formatRelativeTime(date, 'zh-CN')

// 完整日期时间
const dateTime = await formatDateTime(date, 'zh-CN')

// 仅日期
const dateOnly = await formatDate(date, 'zh-CN')

// 仅时间
const timeOnly = await formatTime(date, 'zh-CN')

// 日历格式（Today, Yesterday）
const calendar = await formatCalendar(date, 'zh-CN')

// 智能格式（自动选择最合适的格式）
const smart = await formatSmart(date, 'zh-CN')
```

## 数字格式化

```typescript
import {
  formatNumberWithLocale,
  formatCurrency,
  formatPercentage,
  formatCompactNumber,
  formatFileSize,
} from '@/utils/numberFormat'

// 千分位分隔符
const num = formatNumberWithLocale(1234567, 'zh-CN') // "1,234,567"

// 货币
const price = formatCurrency(1234.56, 'CNY', 'zh-CN') // "¥1,234.56"

// 百分比
const percent = formatPercentage(0.1234, 'zh-CN', 2) // "12.34%"

// 紧凑数字（K, M, B）
const compact = formatCompactNumber(1234567, 'zh-CN') // "1.2M"

// 文件大小
const size = formatFileSize(1234567, 'zh-CN') // "1.18 MB"
```

## 翻译回退

```typescript
import { useI18nFallback } from '@/composables/useI18nFallback'

const { t, te, translationCoverage } = useI18nFallback()

// 安全的翻译（带默认值）
const text = t('common.loading', 'Loading...')

// 检查翻译是否存在
if (te('common.loading')) {
  // 翻译存在
}

// 查看翻译覆盖率
console.log(`Coverage: ${translationCoverage.value}%`)
```

## 开发工具（仅开发环境）

在浏览器控制台中使用 `window.__I18N_DEV__`：

```javascript
// 显示命名规范
__I18N_DEV__.guide()

// 验证键值
__I18N_DEV__.validate('page.home.title')

// 列出所有键
__I18N_DEV__.listKeys('zh-CN')

// 搜索键
__I18N_DEV__.searchKeys('button')

// 比较语言覆盖率
__I18N_DEV__.compareLocales()

// 导出翻译
__I18N_DEV__.exportTranslations('en')
```

## 键值命名规范

格式：`category.subcategory.key`

**示例：**

- ✅ `page.home.title`
- ✅ `common.button.save`
- ✅ `error.network.timeout`
- ❌ `homeTitle`
- ❌ `page_home_title`

**标准前缀：**
`app`, `nav`, `platform`, `post`, `posts`, `search`, `filter`, `auth`, `favorite`, `settings`, `common`, `author`, `profile`, `access`, `upload`, `error`, `errors`, `aria`, `cookies`, `preferences`, `offline`, `privacy`
