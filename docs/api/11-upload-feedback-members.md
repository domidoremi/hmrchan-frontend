# 上传、反馈、联系、成员

## 上传 (Upload)

### POST /api/v1/upload/avatar

上传头像。

- 权限: required
- Content-Type: `multipart/form-data`
- Form field: `file` — JPG/PNG/WebP，最大 5MB
- 服务端自动缩放至 512×512 以内，转为 JPEG (quality 85)
- 同时校验文件 magic number（不仅依赖 Content-Type header）
- 响应:

```json
{
  "filename": "string",
  "url": "string",
  "size": 0,
  "content_type": "image/jpeg",
  "hash": "sha256hex",
  "uploaded_at": "datetime"
}
```

### POST /api/v1/upload/users/:user_id/avatar

为指定用户上传头像。

- 权限: admin
- 其余同 `/upload/avatar`

---

## 反馈 (Feedback)

### POST /api/v1/feedback

提交反馈。支持 JSON 和 form-data 两种格式。

- 权限: optional（可匿名）
- Body (JSON):

```json
{
  "message": "string (必填, max 2000)",
  "content"?: "string (message 的别名)",
  "contact"?: "string",
  "category"?: "string (default: general)",
  "type"?: "string (category 的别名)",
  "fingerprint"?: "string"
}
```

- 响应 (201): `{ "id": "uuid", "message": "string", "category"?: "string", "created_at": "datetime" }`

---

## 联系 (Contact)

### POST /api/v1/contact/send

发送联系表单。内部存储为 Feedback 记录。

- 权限: optional（可匿名）
- Body:

```json
{
  "name"?: "string",
  "email"?: "string",
  "subject"?: "string",
  "message": "string (必填, max 2000)"
}
```

- 响应: `{ "success": true, "message": "Contact form submitted successfully" }`

---

## 成员 (Members)

静态数据端点，返回预定义的成员资料。

### GET /api/v1/members

成员列表。

- 权限: optional（可匿名）
- 响应: MemberProfile 数组

```json
[{
  "id": "string", "name_ja": "string", "name_en": "string",
  "blood_type"?: "string", "zodiac": "string",
  "height_cm": 0, "birthday": "YYYY-MM-DD",
  "birthplace": "string", "hobbies": "string",
  "skills": "string", "message": "string",
  "photo_url": "string", "profile_url": "string"
}]
```

### GET /api/v1/members/:id

成员详情。

- 权限: optional（可匿名）
- Path: `id` — 成员 ID（如 `kizuki_nao`）
- 响应: MemberProfile 对象
