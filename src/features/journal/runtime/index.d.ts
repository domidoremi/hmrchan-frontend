interface Collection {
  id: string
  title: string
  note: string
  cover: string
  second: string
  english: string
  index: string
  posts: string[]
}
export interface JournalRuntime {
  UI: {
    openDialog(content: string, className?: string, view?: { key: string; render(): void }): void
    icon(name: string): string
    hydrate(root?: ParentNode): void
    escape(value: unknown): string
    closeDialog(immediate?: boolean): void
    toast(message: string, action?: { label: string; run(): void }): void
  }
  Editorial: { collections: Collection[]; enhance(root?: ParentNode): void }
  Atelier: {
    hero(index: number): string
    index(): string
    collections(): string
    schedule(cards: string): string
    community(rows: string): string
    heading(number: string, title: string, english: string, action?: string): string
  }
  Experience: {
    panorama(): string
    communityFeature(): string
    mount(root?: ParentNode): void
    savedShelf(items: unknown[]): string
    savedFeedback(button: Element, id: string, saved: boolean): void
  }
  SpatialMotion: { layout(root: Element, update: () => void): void }
  mount(root?: ParentNode): void
  transition(): void
  dispose(): void
}
export function createJournalRuntime(navigate: (path: string) => void): JournalRuntime
