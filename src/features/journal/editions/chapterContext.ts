import type { InjectionKey, Ref } from 'vue'

export type ChapterContext = {
  enabled: Readonly<Ref<boolean>>
  height: Readonly<Ref<number>>
  progress: Readonly<Ref<number>>
  travel: Ref<number>
  overlay?: Ref<HTMLElement | undefined>
  seek: (progress: number, smooth?: boolean) => void
}
export const chapterKey: InjectionKey<ChapterContext> = Symbol('journal-chapter')
