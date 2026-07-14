type PrivateSessionReset = () => void

const resetters = new Set<PrivateSessionReset>()

export function registerPrivateSessionReset(reset: PrivateSessionReset): () => void {
  resetters.add(reset)
  return () => resetters.delete(reset)
}

export function resetPrivateSessionState(): void {
  for (const reset of resetters) {
    reset()
  }
}
