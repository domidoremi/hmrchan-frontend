# 快速测试参考

## 一键运行所有验收测试

```bash
node scripts/acceptance-test.js
```

## 分项测试命令

### 代码质量检查

```bash
# TypeScript 类型检查
npm run type-check

# ESLint 代码规范检查
npm run lint

# 自动修复 ESLint 问题
npm run lint -- --fix

# 代码格式化
npm run format
```

### 性能测试

```bash
# 构建生产版本
npm run build

# 构建并分析打包体积
npm run build:analyze

# 测量构建时间
npm run build:measure

# 测试开发服务器启动速度
npm run perf:dev

# 测试热更新性能
npm run perf:hmr

# 比较构建配置
npm run perf:compare
```

### 单元测试 (可选)

```bash
# 运行单元测试
npm run test:unit

# 运行测试并生成覆盖率报告
npm run test:unit -- --coverage
```

## 测试结果解读

### 验收测试输出

```
============================================================
总体结果:
  总测试数: 65
  通过: 63
  失败: 2
  通过率: 96.9%
============================================================
```

- **通过率 100%**: ✅ 完美，可以部署
- **通过率 90-99%**: ⚠️ 良好，建议修复失败项后部署
- **通过率 < 90%**: ❌ 需要改进，不建议部署

### TypeScript 检查

```bash
# 成功输出
✓ No errors found

# 失败输出
Found X errors.
```

### ESLint 检查

```bash
# 成功输出
✓ No problems found

# 失败输出
✖ X problems (Y errors, Z warnings)
```

## 常见问题修复

### 问题 1: TypeScript 类型错误

**症状**: `npm run type-check` 报错

**解决方案**:

1. 查看错误详情
2. 添加缺失的类型导入
3. 修复类型不匹配问题
4. 重新运行检查

### 问题 2: ESLint 错误

**症状**: `npm run lint` 报错

**解决方案**:

```bash
# 自动修复大部分问题
npm run lint -- --fix

# 手动修复剩余问题
# 查看具体错误并逐一修复
```

### 问题 3: 打包体积过大

**症状**: 主包 > 500KB

**解决方案**:

1. 运行 `npm run build:analyze` 查看详情
2. 检查是否有未使用的依赖
3. 优化代码分割配置
4. 使用动态导入

### 问题 4: 性能指标不达标

**症状**: FCP > 1.5s 或 LCP > 2.5s

**解决方案**:

1. 使用 Lighthouse 分析瓶颈
2. 优化关键资源加载
3. 启用资源预加载
4. 优化图片和字体

## 性能目标

| 指标 | 目标值  | 说明         |
| ---- | ------- | ------------ |
| FCP  | < 1.5s  | 首次内容绘制 |
| LCP  | < 2.5s  | 最大内容绘制 |
| TTI  | < 3.5s  | 可交互时间   |
| CLS  | < 0.1   | 累积布局偏移 |
| 主包 | < 500KB | gzip 后大小  |

## 代码质量目标

| 指标              | 目标值 | 说明            |
| ----------------- | ------ | --------------- |
| TypeScript 覆盖率 | > 90%  | TS/Vue 文件占比 |
| ESLint 错误       | = 0    | 无代码规范错误  |
| 代码重复率        | < 5%   | 重复代码比例    |

## 用户体验目标

| 指标       | 目标值  | 说明            |
| ---------- | ------- | --------------- |
| 页面切换   | < 500ms | 路由切换时间    |
| 交互响应   | < 100ms | 用户操作响应    |
| 无障碍评分 | > 90    | Lighthouse 评分 |
| 移动端适配 | 100%    | 所有页面适配    |

## 持续集成建议

### Git Hooks

在 `.git/hooks/pre-commit` 中添加:

```bash
#!/bin/sh
# 提交前运行 lint 和类型检查
npm run lint && npm run type-check
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run build
      - run: node scripts/acceptance-test.js
```

## 相关文档

- 📖 [完整验收测试指南](./acceptance-testing-guide.md)
- 📊 [验收测试总结](./acceptance-testing-summary.md)
- 🚀 [性能优化总结](./performance-optimization-summary.md)

## 联系支持

如果遇到测试问题，请查看:

1. 项目 README.md
2. 相关文档目录 (`docs/`)
3. 提交 Issue 到项目仓库
