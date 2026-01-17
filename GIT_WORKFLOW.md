# Git 工作流程与推送清单

本文档详细说明了项目的 Git 工作流程、分支策略、提交规范和推送前检查清单。

## 📋 目录

- [分支策略](#分支策略)
- [提交规范](#提交规范)
- [推送前检查](#推送前检查)
- [常用命令](#常用命令)
- [发布流程](#发布流程)
- [紧急修复](#紧急修复)

## 🌳 分支策略

### 主要分支

```
main (生产环境)
  ├── 始终保持可部署状态
  ├── 只接受来自 release 或 hotfix 的合并
  └── 每次合并都应打 tag

develop (开发环境)
  ├── 最新的开发代码
  ├── 功能分支的合并目标
  └── 定期合并到 release 分支
```

### 辅助分支

```
feature/* (功能分支)
  ├── 从 develop 创建
  ├── 完成后合并回 develop
  └── 命名: feature/功能名称

fix/* (修复分支)
  ├── 从 develop 创建
  ├── 完成后合并回 develop
  └── 命名: fix/问题描述

hotfix/* (紧急修复)
  ├── 从 main 创建
  ├── 完成后合并到 main 和 develop
  └── 命名: hotfix/版本号-问题描述

release/* (发布分支)
  ├── 从 develop 创建
  ├── 完成后合并到 main 和 develop
  └── 命名: release/版本号
```

## 📝 提交规范

### Conventional Commits

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 提交类型 (type)

| 类型       | 说明                         | 示例                         |
| ---------- | ---------------------------- | ---------------------------- |
| `feat`     | 新功能                       | `feat: 添加用户收藏功能`     |
| `fix`      | Bug 修复                     | `fix: 修复移动端布局错位`    |
| `docs`     | 文档更新                     | `docs: 更新 API 文档`        |
| `style`    | 代码格式（不影响功能）       | `style: 统一缩进为 2 空格`   |
| `refactor` | 重构（不增加功能或修复 bug） | `refactor: 优化图片加载逻辑` |
| `perf`     | 性能优化                     | `perf: 减少首屏加载时间`     |
| `test`     | 测试相关                     | `test: 添加搜索组件测试`     |
| `chore`    | 构建工具或辅助工具变更       | `chore: 升级 Vite 到 7.2`    |
| `revert`   | 回滚提交                     | `revert: 回滚 feat: xxx`     |

### 作用域 (scope)

可选，表示影响的范围：

```bash
feat(auth): 添加 OAuth 登录
fix(search): 修复搜索结果排序
docs(api): 更新接口文档
perf(image): 优化图片加载
```

### 主题 (subject)

- 使用祈使句，现在时态
- 首字母小写
- 结尾不加句号
- 简洁明了，不超过 50 字符

### 正文 (body)

可选，详细说明：

- 为什么做这个改动
- 改动的影响范围
- 与之前行为的对比

### 页脚 (footer)

可选，用于：

- 关闭 Issue: `Closes #123`
- 破坏性变更: `BREAKING CHANGE: xxx`

### 提交示例

**简单提交：**

```bash
git commit -m "feat: 添加用户收藏功能"
git commit -m "fix: 修复移动端布局错位问题"
git commit -m "docs: 更新部署指南"
```

**详细提交：**

```bash
git commit -m "feat(search): 支持按作者筛选" \
  -m "- 添加作者筛选下拉菜单" \
  -m "- 实现作者搜索 API 调用" \
  -m "- 更新搜索结果展示逻辑" \
  -m "" \
  -m "Closes #456"
```

**破坏性变更：**

```bash
git commit -m "feat!: 重构认证系统" \
  -m "BREAKING CHANGE: 旧的 token 格式不再支持" \
  -m "需要用户重新登录"
```

## ✅ 推送前检查

### 自动检查（Git Hooks）

项目配置了 Husky，会在提交时自动运行：

```bash
# pre-commit hook
- ESLint 检查并修复暂存文件
- Prettier 格式化暂存文件

# commit-msg hook
- 验证提交信息格式
```

### 手动检查清单

#### 基础检查（每次推送）

```bash
# 1. 类型检查
bun run type-check
# ✅ 无类型错误

# 2. 代码规范检查（零警告）
bun run lint:strict
# ✅ 无 ESLint 错误和警告

# 3. 代码格式检查
bun run format:check
# ✅ 代码格式正确

# 4. 单元测试
bun run test:unit
# ✅ 所有测试通过
```

#### 功能分支检查

- [ ] 功能已完整实现
- [ ] 已添加必要的单元测试
- [ ] 已测试多种屏幕尺寸（375px, 768px, 1920px）
- [ ] 已测试明暗主题切换
- [ ] 已测试多语言切换（中文、英文、日文）
- [ ] 性能指标符合要求（LCP < 2.5s）
- [ ] 已更新相关文档
- [ ] 代码已经过自我审查
- [ ] 提交信息清晰明确

#### 发布前检查

- [ ] 所有自动化测试通过
- [ ] 代码已经过 Code Review
- [ ] 已在预览环境验证
- [ ] 已更新版本号（package.json）
- [ ] 已更新 CHANGELOG.md
- [ ] 已创建 Git tag
- [ ] 已通知相关团队成员
- [ ] 已准备回滚方案

## 🔧 常用命令

### 创建分支

```bash
# 功能分支
git checkout develop
git pull origin develop
git checkout -b feature/user-favorites

# 修复分支
git checkout develop
git pull origin develop
git checkout -b fix/mobile-layout

# 紧急修复
git checkout main
git pull origin main
git checkout -b hotfix/v1.2.1-auth-bug
```

### 提交代码

```bash
# 查看状态
git status

# 添加文件
git add .
# 或选择性添加
git add src/components/UserFavorites.vue

# 提交（会触发 pre-commit hook）
git commit -m "feat: 添加用户收藏功能"

# 修改最后一次提交
git commit --amend
```

### 推送代码

```bash
# 首次推送新分支
git push -u origin feature/user-favorites

# 后续推送
git push

# 强制推送（谨慎使用）
git push --force-with-lease
```

### 合并分支

```bash
# 更新目标分支
git checkout develop
git pull origin develop

# 合并功能分支
git merge --no-ff feature/user-favorites

# 推送合并结果
git push origin develop

# 删除已合并的分支
git branch -d feature/user-favorites
git push origin --delete feature/user-favorites
```

### 同步远程分支

```bash
# 获取远程更新
git fetch origin

# 查看所有分支
git branch -a

# 拉取并合并
git pull origin develop

# 变基（保持提交历史线性）
git pull --rebase origin develop
```

### 撤销操作

```bash
# 撤销工作区修改
git checkout -- <file>

# 撤销暂存
git reset HEAD <file>

# 撤销最后一次提交（保留修改）
git reset --soft HEAD^

# 撤销最后一次提交（丢弃修改）
git reset --hard HEAD^

# 回滚到指定提交
git revert <commit-hash>
```

## 🚀 发布流程

### 1. 准备发布

```bash
# 从 develop 创建发布分支
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# 更新版本号
# 编辑 package.json: "version": "1.2.0"

# 更新 CHANGELOG.md
# 记录本次发布的所有变更
```

### 2. 测试验证

```bash
# 完整测试套件
bun run type-check
bun run lint:strict
bun run test:unit
bun run build

# 本地预览
bun run preview

# 性能审计
bun run perf:lighthouse
```

### 3. 合并到 main

```bash
# 切换到 main
git checkout main
git pull origin main

# 合并发布分支（保留合并记录）
git merge --no-ff release/v1.2.0

# 打标签
git tag -a v1.2.0 -m "Release version 1.2.0"

# 推送
git push origin main
git push origin v1.2.0
```

### 4. 合并回 develop

```bash
# 切换到 develop
git checkout develop
git pull origin develop

# 合并发布分支
git merge --no-ff release/v1.2.0

# 推送
git push origin develop
```

### 5. 清理

```bash
# 删除本地发布分支
git branch -d release/v1.2.0

# 删除远程发布分支（如果推送过）
git push origin --delete release/v1.2.0
```

### 6. 部署验证

- 等待 Cloudflare Pages 自动部署
- 访问生产环境: `https://momichan.xyz`
- 验证核心功能
- 监控错误日志
- 检查性能指标

## 🚨 紧急修复

### 1. 创建 hotfix 分支

```bash
# 从 main 创建
git checkout main
git pull origin main
git checkout -b hotfix/v1.2.1-auth-bug
```

### 2. 修复并测试

```bash
# 修复代码
# ...

# 测试
bun run type-check
bun run lint:strict
bun run test:unit
bun run build

# 提交
git commit -m "fix: 修复认证 token 刷新失败"
```

### 3. 合并到 main

```bash
# 更新版本号（patch 版本）
# package.json: "version": "1.2.1"

# 合并到 main
git checkout main
git merge --no-ff hotfix/v1.2.1-auth-bug

# 打标签
git tag -a v1.2.1 -m "Hotfix: 修复认证 token 刷新失败"

# 推送
git push origin main
git push origin v1.2.1
```

### 4. 合并到 develop

```bash
# 同步到 develop
git checkout develop
git merge --no-ff hotfix/v1.2.1-auth-bug
git push origin develop
```

### 5. 清理

```bash
git branch -d hotfix/v1.2.1-auth-bug
```

## 📊 分支管理最佳实践

### 分支命名规范

```bash
# 功能分支
feature/user-profile
feature/search-filters
feature/image-upload

# 修复分支
fix/mobile-layout
fix/api-timeout
fix/memory-leak

# 紧急修复
hotfix/v1.2.1-security-patch
hotfix/v1.3.2-critical-bug

# 发布分支
release/v1.2.0
release/v2.0.0
```

### 分支生命周期

1. **创建** - 从正确的源分支创建
2. **开发** - 频繁提交，保持小步快跑
3. **同步** - 定期从源分支拉取更新
4. **测试** - 推送前完整测试
5. **审查** - 创建 Pull Request
6. **合并** - 使用 `--no-ff` 保留合并记录
7. **清理** - 删除已合并的分支

### 提交频率建议

- **功能开发**: 每完成一个小功能就提交
- **Bug 修复**: 每修复一个问题就提交
- **重构**: 每完成一个重构步骤就提交
- **文档**: 随代码一起提交

### 避免的做法

❌ 直接在 main 或 develop 上开发  
❌ 提交信息不清晰（如 "fix bug", "update"）  
❌ 一次提交包含多个不相关的改动  
❌ 推送前不运行测试  
❌ 强制推送到共享分支  
❌ 长期不合并的功能分支

## 🔍 故障排查

### 提交被拒绝

```bash
# 原因：pre-commit hook 失败
# 解决：修复 ESLint 或 Prettier 错误

bun run lint
bun run format
git add .
git commit -m "fix: 修复代码规范问题"
```

### 合并冲突

```bash
# 1. 拉取最新代码
git pull origin develop

# 2. 解决冲突
# 编辑冲突文件，保留正确的代码

# 3. 标记为已解决
git add <conflicted-files>

# 4. 完成合并
git commit
```

### 误提交敏感信息

```bash
# 1. 立即从历史中删除
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch <file>" \
  --prune-empty --tag-name-filter cat -- --all

# 2. 强制推送
git push origin --force --all

# 3. 通知团队成员
# 4. 更换泄露的密钥/密码
```

## 📚 参考资源

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Semantic Versioning](https://semver.org/)

---

**最后更新**: 2025-01-18  
**文档版本**: 1.0.0
