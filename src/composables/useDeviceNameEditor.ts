/**
 * Device Name Editor Composable
 * Manages inline editing state for device names
 */

import { ref } from 'vue'
import type { Session } from '@/api'

export function useDeviceNameEditor() {
  const editingSessionId = ref<string | null>(null)
  const editingDeviceName = ref('')

  function startEditing(session: Session) {
    editingSessionId.value = session.id
    editingDeviceName.value = session.device_name
  }

  function cancelEditing() {
    editingSessionId.value = null
    editingDeviceName.value = ''
  }

  function isEditing(sessionId: string): boolean {
    return editingSessionId.value === sessionId
  }

  return {
    editingSessionId,
    editingDeviceName,
    startEditing,
    cancelEditing,
    isEditing,
  }
}
