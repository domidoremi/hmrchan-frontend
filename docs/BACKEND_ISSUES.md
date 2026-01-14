# 后端 API 问题汇总

> 前端版本: 2025-01-14
> 生产环境: https://momichan.xyz/
> API 基础路径: https://api.momichan.xyz/api/v1/

## 1. API 错误

### 1.1 POST /api/v1/history/browsing - 422 Unprocessable Content

**触发场景**: 用户浏览帖子详情页时，前端调用浏览历史记录接口

**请求示例**:

```http
POST /api/v1/history/browsing
Content-Type: application/json
Authorization: Bearer <token>

{
  "post_id": "123"
}
```

**错误响应**: 422 Unprocessable Content

**建议**: 检查请求体参数验证逻辑，确认 `post_id` 字段类型要求（字符串/数字）

---

### 1.2 POST /api/v1/discussions/ - 404 Not Found

**触发场景**: 社区页面创建新讨论

**请求示例**:

```http
POST /api/v1/discussions/
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "讨论标题",
  "content": "讨论内容"
}
```

**错误响应**: 404 Not Found

**建议**: 确认该 API 端点是否已实现并部署

---

## 2. 外部资源错误

### 2.1 Twitter 头像 404

**触发场景**: 显示作者头像时，部分 Twitter 头像 URL 返回 404

**示例 URL**:

- `https://pbs.twimg.com/profile_images/1990736764563304448/P10_8s_q.jpg`
- `https://pbs.twimg.com/profile_images/1873716222233341952/ytP02nMC.jpg`
- `https://pbs.twimg.com/profile_images/1941761364084633600/WPftFLFA.jpg`
- `https://pbs.twimg.com/profile_images/.../H3p_S7z_.jpg`
- `https://pbs.twimg.com/profile_images/.../gvpuEIBu.jpg`
- `https://pbs.twimg.com/profile_images/.../REDJRSnL.jpg`
- `https://pbs.twimg.com/profile_images/.../RZZDmM9G.jpg`
- `https://pbs.twimg.com/profile_images/.../9ldXwqJv.jpg`
- `https://pbs.twimg.com/profile_images/.../iXaKjTPT.jpg`
- `https://pbs.twimg.com/profile_images/.../zhnq0Jyb.jpg`
- `https://pbs.twimg.com/profile_images/.../ppQJyDpD.jpg`
- `https://pbs.twimg.com/profile_images/.../ZwtcCXCZ.jpg`
- `https://pbs.twimg.com/profile_images/.../n5pshklx.jpg`
- `https://pbs.twimg.com/profile_images/.../qRHiz8ew.jpg`
- `https://pbs.twimg.com/profile_images/.../NsxBYcU4.jpg`
- `https://pbs.twimg.com/profile_images/.../bAsRvl0G.jpg`
- `https://pbs.twimg.com/profile_images/.../QIcmFbO6.jpg`

**影响范围**: 大量作者头像失效，严重影响用户体验

**原因**: Twitter 用户更换头像后，旧 URL 失效

**建议**:

1. 定期更新作者头像 URL
2. 或在后端实现头像代理/缓存机制

---

## 3. 功能建议

### 3.1 平台筛选支持

前端已支持以下平台筛选:

- YouTube
- TikTok
- Twitter/X
- Instagram (新增)

请确认后端 API 支持 `platform=instagram` 参数

### 3.2 排序参数

前端使用的排序参数:

- `sort_by`: `published_at` | `like_count` | `view_count` | `relevance`
- `sort_order`: `asc` | `desc`

---

## 4. 前端已处理的问题

以下问题已在前端修复，无需后端处理:

- ✅ 密码表单 autocomplete 属性
- ✅ 密码表单隐藏用户名字段（无障碍）
- ✅ CLS 布局偏移优化
- ✅ 动画 GPU 加速

---

## 联系方式

如有疑问，请联系前端开发团队。
