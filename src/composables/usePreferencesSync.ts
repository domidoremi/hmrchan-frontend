import { usePreferencesSyncService } from '@/services/preferencesSyncService'

export function usePreferencesSync() {
  return usePreferencesSyncService()
}
