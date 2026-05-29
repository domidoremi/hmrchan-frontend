export interface HmrJoinItem {
  title: string
  body: string
  metric: string
}

const joinItems: HmrJoinItem[] = [
  { title: '浏览精选', body: '从首页和探索入口找到值得打开的内容。', metric: '01' },
  { title: '参与讨论', body: '查看回复、反馈和社区上下文。', metric: '02' },
  { title: '持续发布', body: '用日程查看内容准备和发布时间。', metric: '03' },
]

export function useHmrJoinContent() {
  return {
    joinItems,
  }
}
