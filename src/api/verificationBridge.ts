import { readonly, ref } from 'vue'
import i18nInstance from '@/i18n'
import { authService, ApiError, type VerificationTokenResponse } from './authService'

export type VerificationAction =
  | 'delete_account'
  | 'change_email'
  | 'change_password'
  | 'update_security_settings'
  | 'export_data'
  | 'revoke_sessions'
  | 'delete_content'
  | 'manage_api_keys'
  | 'admin_operation'
  | (string & {})

export interface VerificationRequest {
  action: VerificationAction
  resourceId?: string
  title?: string
  description?: string
  confirmLabel?: string
}

export interface VerificationOptions extends VerificationRequest {
  forceRefresh?: boolean
  password?: string
}

export interface VerificationResolution {
  verificationToken: string
  expiresIn?: number
  action: VerificationAction
  resourceId?: string
  stepUpRequired?: boolean
  currentDeviceTrusted?: boolean
}

const DEFAULT_TOKEN_TTL_SECONDS = 300

const isOpen = ref(false)
const currentRequest = ref<VerificationRequest | null>(null)

let currentPromise: Promise<VerificationResolution | null> | null = null
let settleCurrent: ((value: VerificationResolution | null) => void) | null = null

const verificationTokenCache = new Map<string, { token: string; expiresAt: number }>()

function buildCacheKey(action: VerificationAction, resourceId?: string): string {
  return `${action}:${resourceId ?? ''}`
}

function clearExpiredVerificationToken(action: VerificationAction, resourceId?: string) {
  const cacheKey = buildCacheKey(action, resourceId)
  const cached = verificationTokenCache.get(cacheKey)
  if (cached && cached.expiresAt <= Date.now()) {
    verificationTokenCache.delete(cacheKey)
  }
}

function cacheVerificationToken(result: VerificationResolution) {
  const expiresIn = result.expiresIn ?? DEFAULT_TOKEN_TTL_SECONDS
  verificationTokenCache.set(buildCacheKey(result.action, result.resourceId), {
    token: result.verificationToken,
    expiresAt: Date.now() + expiresIn * 1000,
  })
}

function normalizeVerificationResponse(
  response: VerificationTokenResponse,
  request: Pick<VerificationRequest, 'action' | 'resourceId'>
): VerificationResolution {
  const verificationToken = response.verification_token?.trim()

  if (!verificationToken || response.verified === false) {
    throw createVerificationFailedError(request.action, request.resourceId)
  }

  return {
    verificationToken,
    expiresIn: response.expires_in,
    action: request.action,
    resourceId: request.resourceId,
    stepUpRequired: response.step_up_required,
    currentDeviceTrusted: response.current_device_trusted,
  }
}

function cleanupVerificationState() {
  isOpen.value = false
  currentRequest.value = null
  currentPromise = null
  settleCurrent = null
}

function createVerificationFailedError(action: VerificationAction, resourceId?: string) {
  const { t } = i18nInstance.global
  return new ApiError(t('auth.stepUp.invalidPassword'), 401, 'VERIFICATION_FAILED', {
    action,
    resource_id: resourceId,
  })
}

async function verifyWithPassword(
  action: VerificationAction,
  password: string,
  resourceId?: string
): Promise<VerificationResolution> {
  try {
    const response = await authService.verifyIdentity(password, action, resourceId, {
      skipErrorToast: true,
    })
    const result = normalizeVerificationResponse(response, { action, resourceId })
    cacheVerificationToken(result)
    return result
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw createVerificationFailedError(action, resourceId)
    }
    throw error
  }
}

export const verificationDialogState = {
  isOpen: readonly(isOpen),
  currentRequest: readonly(currentRequest),
}

export function getCachedVerificationToken(
  action: VerificationAction,
  resourceId?: string
): string | null {
  clearExpiredVerificationToken(action, resourceId)
  return verificationTokenCache.get(buildCacheKey(action, resourceId))?.token ?? null
}

export function clearVerificationToken(action?: VerificationAction, resourceId?: string) {
  if (!action) {
    verificationTokenCache.clear()
    return
  }

  verificationTokenCache.delete(buildCacheKey(action, resourceId))
}

export async function ensureVerificationToken(
  action: VerificationAction,
  options: Omit<VerificationOptions, 'action'> = {}
): Promise<string> {
  if (!options.forceRefresh) {
    const cachedToken = getCachedVerificationToken(action, options.resourceId)
    if (cachedToken) {
      return cachedToken
    }
  }

  if (options.password?.trim()) {
    const result = await verifyWithPassword(action, options.password.trim(), options.resourceId)
    return result.verificationToken
  }

  const result = await requestVerification({
    action,
    resourceId: options.resourceId,
    title: options.title,
    description: options.description,
    confirmLabel: options.confirmLabel,
  })

  if (!result) {
    throw new ApiError('Verification cancelled', 400, 'VERIFICATION_CANCELLED')
  }

  return result.verificationToken
}

export function requestVerification(
  request: VerificationRequest
): Promise<VerificationResolution | null> {
  if (!currentPromise) {
    currentRequest.value = request
    isOpen.value = true
    currentPromise = new Promise<VerificationResolution | null>((resolve) => {
      settleCurrent = resolve
    })
    return currentPromise
  }

  return currentPromise
}

export function resolveVerification(result: VerificationResolution) {
  cacheVerificationToken(result)
  settleCurrent?.(result)
  cleanupVerificationState()
}

export function dismissVerification() {
  settleCurrent?.(null)
  cleanupVerificationState()
}

export function isVerificationCancelledError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === 'VERIFICATION_CANCELLED'
}
