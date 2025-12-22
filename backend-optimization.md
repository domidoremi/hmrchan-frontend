# 后端优化建议文档

**部署环境**: AWS EC2 (无 CDN)  
**前端部署**: Cloudflare Pages (HTTPS + HTTP/3)  
**生成日期**: 2024-12-22

---

## 🔴 **高优先级 - 必须实现**

### 1. **修复收藏功能 502 错误**

**问题**: 收藏/取消收藏接口频繁返回 502 Bad Gateway

**必须实现**:
```python
# app/api/v1/favorites.py
from tenacity import retry, stop_after_attempt, wait_exponential
from fastapi import HTTPException, status

@router.post("/favorites")
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    reraise=True
)
async def create_favorite(
    post_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        # 添加超时控制
        async with asyncio.timeout(5):  # 5秒超时
            favorite = await db.execute(
                insert(favorites_table).values(
                    user_id=current_user.id,
                    post_id=post_id
                )
            )
            await db.commit()
            return {"success": True, "id": favorite.inserted_primary_key[0]}
    
    except asyncio.TimeoutError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="收藏服务暂时不可用，请稍后重试"
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"Create favorite failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="创建收藏失败"
        )
```

**检查点**:
- [ ] 检查数据库连接池配置（是否耗尽）
- [ ] 检查数据库索引（`user_id`, `post_id` 复合索引）
- [ ] 添加数据库查询日志，定位慢查询
- [ ] 检查是否存在死锁或长事务

---

### 2. **返回媒体文件尺寸信息（消除前端 CLS）**

**问题**: 前端无法预知图片尺寸，导致布局偏移（CLS 0.17）

**必须实现**:
```python
# app/schemas/post.py
class MediaFile(BaseModel):
    id: str
    file_type: str  # "image" | "video"
    thumbnail_url: Optional[str] = None
    # 新增字段
    width: Optional[int] = None
    height: Optional[int] = None
    aspect_ratio: Optional[float] = None  # width / height

class PostListItem(BaseModel):
    id: str
    title: str
    thumbnail_url: Optional[str] = None
    # 新增字段
    thumbnail_width: Optional[int] = None
    thumbnail_height: Optional[int] = None
    # ... 其他字段
```

**实现步骤**:
1. 在媒体上传时使用 Pillow 或 ffmpeg 获取尺寸
```python
from PIL import Image
import subprocess
import json

def get_image_dimensions(file_path: str) -> tuple[int, int]:
    """获取图片尺寸"""
    with Image.open(file_path) as img:
        return img.size  # (width, height)

def get_video_dimensions(file_path: str) -> tuple[int, int]:
    """获取视频尺寸"""
    result = subprocess.run(
        [
            'ffprobe', '-v', 'quiet', '-print_format', 'json',
            '-show_streams', file_path
        ],
        capture_output=True,
        text=True
    )
    data = json.loads(result.stdout)
    video_stream = next(s for s in data['streams'] if s['codec_type'] == 'video')
    return video_stream['width'], video_stream['height']
```

2. 存储尺寸到数据库
```sql
ALTER TABLE media_files 
ADD COLUMN width INTEGER,
ADD COLUMN height INTEGER,
ADD COLUMN aspect_ratio FLOAT;

CREATE INDEX idx_media_dimensions ON media_files(width, height);
```

3. 在 API 响应中包含尺寸
```python
@router.get("/posts", response_model=PostList)
async def list_posts(db: AsyncSession = Depends(get_db)):
    posts = await db.execute(
        select(
            posts_table.c.id,
            posts_table.c.title,
            posts_table.c.thumbnail_url,
            media_files.c.width.label('thumbnail_width'),
            media_files.c.height.label('thumbnail_height')
        )
        .join(media_files, posts_table.c.thumbnail_id == media_files.c.id)
    )
    return {"items": [dict(row) for row in posts]}
```

**预期效果**: 前端 CLS 从 0.17 降至 0.05 以下

---

### 3. **数据库索引优化**

**必须添加的索引**:
```sql
-- 评论查询优化
CREATE INDEX idx_comments_post_created 
ON comments(post_id, created_at DESC);

CREATE INDEX idx_comments_parent 
ON comments(parent_id) 
WHERE parent_id IS NOT NULL;

-- 收藏查询优化
CREATE INDEX idx_favorites_user_created 
ON favorites(user_id, created_at DESC);

CREATE INDEX idx_favorites_post_user 
ON favorites(post_id, user_id);

-- 帖子查询优化
CREATE INDEX idx_posts_created_published 
ON posts(created_at DESC) 
WHERE is_published = true;

CREATE INDEX idx_posts_author_created 
ON posts(author_id, created_at DESC);

-- 用户查询优化
CREATE INDEX idx_users_username_lower 
ON users(LOWER(username));

CREATE INDEX idx_users_email_lower 
ON users(LOWER(email));
```

**验证方法**:
```sql
-- 检查索引是否生效
EXPLAIN ANALYZE 
SELECT * FROM comments 
WHERE post_id = 'xxx' 
ORDER BY created_at DESC 
LIMIT 20;
```

---

## 🟡 **中优先级 - 强烈建议**

### 4. **API 响应压缩**

```python
# app/main.py
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(
    GZipMiddleware, 
    minimum_size=1000,  # 仅压缩 >1KB 的响应
    compresslevel=6     # 压缩级别 1-9，6 为平衡
)
```

**预期效果**: 减少 60-80% 的传输数据量

---

### 5. **Redis 缓存热门数据**

```python
# app/cache.py
import redis.asyncio as redis
from typing import Optional
import json

redis_client = redis.Redis(
    host='localhost',
    port=6379,
    db=0,
    decode_responses=True
)

async def cache_get(key: str) -> Optional[dict]:
    """从缓存获取数据"""
    data = await redis_client.get(key)
    return json.loads(data) if data else None

async def cache_set(key: str, value: dict, expire: int = 300):
    """存储数据到缓存，默认5分钟过期"""
    await redis_client.setex(key, expire, json.dumps(value))

# 使用示例
@router.get("/posts/{post_id}")
async def get_post(post_id: str, db: AsyncSession = Depends(get_db)):
    # 1. 尝试从缓存获取
    cache_key = f"post:{post_id}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    
    # 2. 从数据库查询
    post = await db.execute(
        select(posts_table).where(posts_table.c.id == post_id)
    )
    result = dict(post.one())
    
    # 3. 写入缓存
    await cache_set(cache_key, result, expire=600)  # 10分钟
    return result
```

**缓存策略**:
- 帖子详情: 10分钟
- 帖子列表: 5分钟
- 作者信息: 30分钟
- 评论列表: 2分钟

---

### 6. **数据库连接池配置**

```python
# app/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=20,              # 连接池大小
    max_overflow=10,           # 最大溢出连接数
    pool_timeout=30,           # 连接超时（秒）
    pool_recycle=3600,         # 连接回收时间（1小时）
    pool_pre_ping=True,        # 连接前测试
)

AsyncSessionLocal = sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)
```

---

### 7. **分页优化（游标分页）**

**问题**: `OFFSET` 分页在大数据量时性能差

**改进方案**:
```python
# 传统 OFFSET 分页（慢）
@router.get("/posts")
async def list_posts(page: int = 1, limit: int = 20):
    offset = (page - 1) * limit
    posts = await db.execute(
        select(posts_table)
        .order_by(posts_table.c.created_at.desc())
        .limit(limit)
        .offset(offset)  # ❌ 大数据量时很慢
    )

# 游标分页（快）
@router.get("/posts")
async def list_posts(
    cursor: Optional[str] = None,  # 上一页最后一条记录的 ID
    limit: int = 20
):
    query = select(posts_table).order_by(posts_table.c.created_at.desc())
    
    if cursor:
        # 从游标位置继续查询
        cursor_post = await db.get(Post, cursor)
        query = query.where(
            posts_table.c.created_at < cursor_post.created_at
        )
    
    posts = await db.execute(query.limit(limit + 1))
    results = posts.all()
    
    has_next = len(results) > limit
    items = results[:limit]
    
    return {
        "items": items,
        "next_cursor": items[-1].id if has_next else None,
        "has_next": has_next
    }
```

---

### 8. **API 限流（防止滥用）**

```python
# app/middleware/rate_limit.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 使用示例
@app.get("/api/v1/posts")
@limiter.limit("100/minute")  # 每分钟最多100次请求
async def list_posts():
    return ...

@app.post("/api/v1/auth/login")
@limiter.limit("5/minute")  # 登录限制更严格
async def login():
    return ...
```

---

## 🟢 **低优先级 - 长期优化**

### 9. **静态资源优化（媒体文件）**

**由于不使用 CDN，建议**:
```nginx
# /etc/nginx/nginx.conf
http {
    # 启用 gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    
    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|svg|webp)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
    
    location ~* \.(mp4|webm)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # API 响应不缓存
    location /api/ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        proxy_pass http://localhost:8000;
    }
}
```

---

### 10. **异步任务队列（Celery）**

**用于耗时操作**:
- 视频转码
- 缩略图生成
- 邮件发送
- 统计数据计算

```python
# app/tasks.py
from celery import Celery

celery_app = Celery(
    'tasks',
    broker='redis://localhost:6379/1',
    backend='redis://localhost:6379/2'
)

@celery_app.task
def generate_thumbnail(media_id: str):
    """异步生成缩略图"""
    # ... 缩略图生成逻辑
    pass

# 调用
@router.post("/media/upload")
async def upload_media(file: UploadFile):
    media_id = save_media(file)
    # 异步处理，不阻塞请求
    generate_thumbnail.delay(media_id)
    return {"id": media_id}
```

---

### 11. **数据库查询优化**

**避免 N+1 查询**:
```python
# ❌ N+1 查询（慢）
posts = await db.execute(select(posts_table))
for post in posts:
    author = await db.execute(
        select(users_table).where(users_table.c.id == post.author_id)
    )

# ✅ JOIN 查询（快）
posts = await db.execute(
    select(posts_table, users_table)
    .join(users_table, posts_table.c.author_id == users_table.c.id)
)
```

---

### 12. **健康检查端点**

```python
@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """健康检查，用于监控和负载均衡"""
    try:
        # 检查数据库连接
        await db.execute(text("SELECT 1"))
        
        # 检查 Redis（如果使用）
        await redis_client.ping()
        
        return {
            "status": "healthy",
            "database": "ok",
            "cache": "ok",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e)
            }
        )
```

---

## 📊 **监控与日志**

### 13. **结构化日志**

```python
# app/logging_config.py
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
        }
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)

# 配置
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger = logging.getLogger("app")
logger.addHandler(handler)
logger.setLevel(logging.INFO)
```

---

### 14. **性能监控（APM）**

**建议使用** Sentry 或 New Relic:
```python
# app/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="YOUR_SENTRY_DSN",
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,  # 10% 的请求进行追踪
    profiles_sample_rate=0.1,
)
```

---

## 🎯 **实施优先级总结**

| 优先级 | 任务 | 预计工时 | 预期效果 |
|--------|------|----------|----------|
| 🔴 P0 | 修复收藏 502 错误 | 4小时 | 功能稳定性 ✅ |
| 🔴 P0 | 返回媒体尺寸信息 | 8小时 | CLS 0.17→0.05 |
| 🔴 P0 | 数据库索引优化 | 2小时 | 查询速度 +50% |
| 🟡 P1 | API 响应压缩 | 1小时 | 带宽节省 70% |
| 🟡 P1 | Redis 缓存 | 16小时 | 响应时间 -60% |
| 🟡 P1 | 数据库连接池 | 2小时 | 并发能力 +100% |
| 🟡 P1 | 游标分页 | 4小时 | 大数据量性能 +200% |
| 🟡 P1 | API 限流 | 4小时 | 防止滥用 ✅ |
| 🟢 P2 | Nginx 静态资源优化 | 2小时 | 缓存命中率 +80% |
| 🟢 P2 | 异步任务队列 | 16小时 | 用户体验提升 |
| 🟢 P2 | N+1 查询优化 | 持续 | 查询性能提升 |
| 🟢 P2 | 健康检查 | 2小时 | 可监控性 ✅ |

**总计**: P0 (14h) + P1 (31h) + P2 (20h+) = **65+ 小时**

---

## 📝 **后端团队 Action Items**

### Sprint 1 (本周)
- [ ] 修复收藏功能 502 错误
- [ ] 添加数据库索引
- [ ] 实现 API 响应压缩
- [ ] 配置数据库连接池

### Sprint 2 (下周)
- [ ] 实现媒体文件尺寸返回
- [ ] 部署 Redis 并实现基础缓存
- [ ] 实现游标分页
- [ ] 添加 API 限流

### Sprint 3 (长期)
- [ ] Nginx 配置优化
- [ ] 异步任务队列
- [ ] 性能监控部署
- [ ] N+1 查询重构

---

**生成工具**: Cascade AI  
**前端版本**: v2.0  
**最后更新**: 2024-12-22
