/**
 * 图标注册表 - 只导出项目实际使用的图标
 *
 * 优化说明：
 * - 从 lucide-vue-next 按需导入，避免加载所有 1500+ 图标
 * - 在开发模式下可减少约 1500 个 HTTP 请求
 * - 生产环境会通过 tree-shaking 自动优化
 *
 * 使用方式：
 * import { Heart, Home, User } from '@/components/icons'
 */

// 导航和通用
export {
  Home,
  Compass,
  Search,
  Settings,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  MoreHorizontal,
  // 用户和认证
  User,
  Users,
  UserPlus,
  LogIn,
  LogOut,
  Eye,
  EyeOff,
  Camera,
  // 交互
  Heart,
  HeartOff,
  ThumbsUp,
  Bookmark,
  Share2,
  Flag,
  // 消息和评论
  MessageSquare,
  MessageCircle,
  Bell,
  // 状态和提示
  AlertTriangle,
  AlertCircle,
  Info,
  HelpCircle,
  CheckCircle,
  XCircle,
  Check,
  CheckCheck,
  Inbox,
  // 操作
  Trash2,
  Clock,
  Flame,
  // 主题
  Sun,
  Moon,
  Monitor,
  // 媒体查看器
  ZoomIn,
  ZoomOut,
  Maximize2,
  // 形状（图片裁剪）
  Circle,
  Square,
  // 社交平台（通用）
  Globe,
} from 'lucide-vue-next'

// 品牌图标（Lucide 无官方品牌图标，使用自定义 SVG）
export { default as IconYoutube } from './IconYoutube.vue'
export { default as IconX } from './IconX.vue'
export { default as IconTiktok } from './IconTiktok.vue'
export { default as IconInstagram } from './IconInstagram.vue'
export { default as IconGoogle } from './IconGoogle.vue'
