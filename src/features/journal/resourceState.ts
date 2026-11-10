export type JournalResourceState = 'idle' | 'loading' | 'ready' | 'error'
export type JournalResource = 'posts' | 'events' | 'discussions'
export type JournalResourceStates = Record<JournalResource, JournalResourceState>
