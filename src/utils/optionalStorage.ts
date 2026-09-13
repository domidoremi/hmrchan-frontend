// Preference storage is best-effort, never a prerequisite for rendering the app.
export const optionalLocalStorage: Pick<Storage, 'getItem' | 'setItem'> = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Pinia keeps the current session's preferences in memory.
    }
  },
}
