import { Cake, Calendar, Film, LayoutGrid, Radio } from '@lucide/vue'

export const categories = [
  { value: 'all' as const, label: 'schedule.categories.all', icon: LayoutGrid },
  { value: 'live' as const, label: 'schedule.categories.live', icon: Radio },
  { value: 'media' as const, label: 'schedule.categories.media', icon: Film },
  { value: 'birth' as const, label: 'schedule.categories.birth', icon: Cake },
  { value: 'other' as const, label: 'schedule.categories.other', icon: Calendar },
]

export const plannerViews = [
  { value: 'week' as const, label: 'schedule.view.week' },
  { value: 'day' as const, label: 'schedule.view.day' },
  { value: 'month' as const, label: 'schedule.view.month' },
]
