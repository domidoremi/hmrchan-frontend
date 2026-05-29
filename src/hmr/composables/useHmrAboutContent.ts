export interface HmrAboutTextItem {
  index?: string
  metric?: string
  title: string
  body: string
}

const ABOUT_COLOR_PAIRS = [
  ['#ff7722', '#3d2fa9'],
  ['#ff3c34', '#ffc765'],
  ['#3d2fa9', '#171412'],
  ['#ffc765', '#ff7722'],
  ['#171412', '#ff3c34'],
]

const tornadoItems = ['精选内容', '创作者', '社区回应', '发布日程', '反馈通道']

const principles: HmrAboutTextItem[] = [
  { index: '01', title: '上下文优先', body: '让用户知道内容从哪里来、为什么值得打开。' },
  { index: '02', title: '尊重创作', body: '保护作者信息、引用来源和社区讨论秩序。' },
  { index: '03', title: '减少噪音', body: '把重复提醒和低价值卡片压到最低。' },
  { index: '04', title: '持续刷新', body: '用日程和反馈保持内容更新。' },
]

const systemMap: HmrAboutTextItem[] = [
  {
    metric: 'Home',
    title: '内容发现',
    body: '首页、探索、作者、媒体、搜索和趋势组成内容主线。',
  },
  {
    metric: 'Community',
    title: '社区互动',
    body: '讨论、评论、收藏、关系、反馈和收件箱合成社区互动面。',
  },
  {
    metric: 'Auth',
    title: '身份安全',
    body: '登录、注册、Google、Passkey 和 2FA 保护账号安全。',
  },
  {
    metric: '日程',
    title: '发布日程',
    body: '日程列表、日历聚合和亮点显示发布安排。',
  },
]

export function aboutCardStyle(index: number): Record<string, string> {
  const pair = ABOUT_COLOR_PAIRS[index % ABOUT_COLOR_PAIRS.length] ?? ABOUT_COLOR_PAIRS[0]
  return {
    '--hmr-card-start': pair?.[0] ?? '#ff7722',
    '--hmr-card-end': pair?.[1] ?? '#3d2fa9',
  }
}

export function useHmrAboutContent() {
  return {
    cardStyle: aboutCardStyle,
    principles,
    systemMap,
    tornadoItems,
  }
}
