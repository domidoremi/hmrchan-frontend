export function getScreenResolution(): string {
  return `${window.screen.width}x${window.screen.height}`
}

export function getTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
