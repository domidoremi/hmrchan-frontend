import { readonly, ref } from 'vue'

export interface VerificationDialogRequest {
  action: string
  resourceId?: string
  title?: string
  description?: string
  confirmLabel?: string
}

const isOpen = ref(false)
const currentRequest = ref<VerificationDialogRequest | null>(null)

export const verificationDialogState = {
  isOpen: readonly(isOpen),
  currentRequest: readonly(currentRequest),
}

export function openVerificationDialog(request: VerificationDialogRequest): void {
  currentRequest.value = request
  isOpen.value = true
}

export function closeVerificationDialog(): void {
  isOpen.value = false
  currentRequest.value = null
}
