function readBooleanEnv(value: string | undefined): boolean | undefined {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return undefined
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
    return true
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
    return false
  }
  return undefined
}

export function shouldUseApiFallback(): boolean {
  if (readBooleanEnv(import.meta.env.VITE_HMRCHAN_FORCE_FALLBACK) === true) {
    return true
  }

  return readBooleanEnv(import.meta.env.VITE_HMRCHAN_ENABLE_API) === false
}

export function shouldUseScheduleApi(): boolean {
  if (shouldUseApiFallback()) return false
  return readBooleanEnv(import.meta.env.VITE_ENABLE_SCHEDULE_API) !== false
}
