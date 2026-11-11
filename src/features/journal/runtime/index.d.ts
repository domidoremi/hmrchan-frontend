export interface JournalToastAction {
  label: string
  run(): void | Promise<void>
}

export interface JournalToastOptions {
  type?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  duration?: number
}

export interface JournalFeedbackAdapter {
  show(message: string, action?: JournalToastAction, options?: JournalToastOptions): void
  dispose?(): void
}

export interface JournalRuntimeOptions {
  feedback?: JournalFeedbackAdapter
  translate?: (key: string, named?: Record<string, string | number>) => string
}

export interface JournalRuntime {
  UI: {
    openDialog(
      content: string,
      className?: string,
      view?: { key: string; label?: string; labelKey?: string; render(): void }
    ): void
    icon(name: string): string
    hydrate(root?: ParentNode): void
    escape(value: unknown): string
    focusSelector(element: Element | null): string
    refreshBackLabel(): void
    closeDialog(immediate?: boolean): void
    toast(message: string, action?: JournalToastAction, options?: JournalToastOptions): void
    dispose(): void
  }
  Experience: { savedFeedback(button: Element, id: string, saved: boolean): void }
  SpatialMotion: { layout(root: Element, update: () => void | Promise<void>): Promise<void> }
  getMotion(): 'full' | 'reduced'
  setMotion(value: 'full' | 'reduced'): void
  mount(root?: ParentNode): void
  refreshLocalizedControls(): void
  transition(): void
  dispose(): void
}
export function createJournalRuntime(
  navigate: (path: string) => void,
  options?: JournalRuntimeOptions
): JournalRuntime
