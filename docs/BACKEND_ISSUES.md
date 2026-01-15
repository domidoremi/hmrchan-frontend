# 后端 API 问题汇总

> 前端版本: 2026-01-15
> 生产环境: https://momichan.xyz/
> API 基础路径: https://api.momichan.xyz/api/v1/

## 1. API 错误

### 1.1 ~~POST /api/v1/history/browsing - 422 Unprocessable Content~~

**状态**: ✅ 已修复 (2026-01-15 前端验证通过)

~~**问题**: 后端期望 `post_id` 为整数类型，但前端发送的是 UUID 字符串~~

**修复**: 后端已支持 UUID 格式的 `post_id`，返回 201 Created

---

### 1.2 POST /api/v1/discussions/ - 404 Not Found

**状态**: ❌ 未修复

**问题**: 创建新讨论时返回 404 Not Found

**触发场景**: 在社区页面 `/community` 填写讨论标题和内容后点击发布

**请求**:

```
POST https://momichan.xyz/api/v1/discussions/
```

**响应**: 404 Not Found

**影响**: 用户无法发起新讨论

**前端验证时间**: 2026-01-15

---

## 2. 外部资源错误

### 2.1 Twitter 头像 404

**触发场景**: 显示作者头像时，部分 Twitter 头像 URL 返回 404

**示例 URL**:

- `https://pbs.twimg.com/profile_images/1990736764563304448/P10_8s_q.jpg`
- `https://pbs.twimg.com/profile_images/1873716222233341952/ytP02nMC.jpg`
- `https://pbs.twimg.com/profile_images/1941761364084633600/WPftFLFA.jpg`
- 等...

**影响范围**: 大量作者头像失效，严重影响用户体验

**原因**: Twitter 用户更换头像后，旧 URL 失效

**建议**:

1. 定期更新作者头像 URL
2. 或在后端实现头像代理/缓存机制

---

## 3. 数据问题

### 3.1 ~~缩略图尺寸字段缺失~~

**状态**: ✅ 已修复 (2026-01-15 前端验证通过)

~~**问题**: API 响应中缺少 `thumbnail_width` 和 `thumbnail_height` 字段~~

**修复**: API 已添加 `thumbnail_width` 和 `thumbnail_height` 字段到 `PostListItem` 响应

**验证结果**:

```json
{
  "id": "86c888fa-69b7-4b08-b947-e23f455ec843",
  "platform": "youtube",
  "thumbnail_width": 720,
  "thumbnail_height": 1280
}
```

---

### 3.2 ~~缩略图生成器 Bug~~

**状态**: ✅ 已修复 (2026-01-15)

**修复内容**:

- 修复递归创建 `.thumbnails` 目录的问题
- 修复文件名后缀叠加的问题
- 清理了 68.5 万条损坏的缩略图记录

---

## 4. 功能建议

### 4.1 ~~平台筛选支持~~

**状态**: ✅ 全部支持 (2026-01-15 前端验证通过)

前端已支持以下平台筛选:

- YouTube ✅
- TikTok ✅
- Twitter/X ✅
- Instagram ✅ (共 10 条记录)

### 4.2 排序参数

前端使用的排序参数:

- `sort_by`: `published_at` | `like_count` | `view_count` | `relevance`
- `sort_order`: `asc` | `desc`

---

## 5. 前端已处理的问题

以下问题已在前端修复，无需后端处理:

- ✅ 密码表单 autocomplete 属性
- ✅ 密码表单隐藏用户名字段（无障碍）
- ✅ CLS 布局偏移优化
- ✅ 动画 GPU 加速
- ✅ 平台宽高比修正 (TikTok 9:16, Pixiv 3:4, Instagram 4:5)

---

## 6. 社区功能测试结果 (2026-01-15)

### 6.1 正常工作的功能

| 功能                  | 状态 | 备注                   |
| --------------------- | ---- | ---------------------- |
| 社区页面加载          | ✅   | 讨论列表正常显示       |
| 最新讨论/热门话题切换 | ✅   | 排序切换正常           |
| 讨论详情页            | ✅   | 帖子详情、媒体轮播正常 |
| 发表评论              | ✅   | 评论发布成功           |
| 回复评论              | ✅   | 嵌套回复正常           |
| 收藏帖子              | ✅   | 收藏/取消收藏正常      |
| 评论排序              | ✅   | 最新/热门/最早排序     |
| 加载更多              | ✅   | 分页加载正常           |

### 6.2 存在问题的功能

| 功能       | 状态 | 问题描述                           |
| ---------- | ---- | ---------------------------------- |
| 发起新讨论 | ❌   | POST /api/v1/discussions/ 返回 404 |

---

## 联系方式

如有疑问，请联系前端开发团队。
