export interface JournalRuntime {
  UI: {
    openDialog(
      content: string,
      className?: string,
      view?: { key: string; label?: string; render(): void }
    ): void
    icon(name: string): string
    hydrate(root?: ParentNode): void
    escape(value: unknown): string
    focusSelector(element: Element | null): string
    closeDialog(immediate?: boolean): void
    toast(message: string, action?: { label: string; run(): void }): void
  }
  Experience: { savedFeedback(button: Element, id: string, saved: boolean): void }
  SpatialMotion: { layout(root: Element, update: () => void | Promise<void>): void }
  getMotion(): 'full' | 'reduced'
  setMotion(value: 'full' | 'reduced'): void
  mount(root?: ParentNode): void
  transition(): void
  dispose(): void
}
export function createJournalRuntime(navigate: (path: string) => void): JournalRuntime
