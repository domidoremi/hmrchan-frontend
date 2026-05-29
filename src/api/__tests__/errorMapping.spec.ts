import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  extractApiErrorMeta,
  handleErrorResponse,
  normalizeResponse,
} from '../client/error-mapping'

const toastError = vi.hoisted(() => vi.fn())
const translate = vi.hoisted(() =>
  vi.fn((key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key
  )
)

vi.mock('@/i18n', () => ({
  default: {
    global: {
      t: translate,
    },
  },
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    error: toastError,
  }),
}))

describe('api error mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes wrapped responses and paginated payloads', () => {
    expect(
      normalizeResponse({ success: true, data: { id: 1 }, meta: { api_version: '1' } })
    ).toEqual({
      id: 1,
    })
    expect(
      normalizeResponse({
        success: true,
        data: [{ id: 1 }],
        pagination: { page: 1, total: 1 },
      })
    ).toEqual({
      items: [{ id: 1 }],
      page: 1,
      total: 1,
    })
  })

  it('extracts error metadata from envelopes and validation details', () => {
    expect(
      extractApiErrorMeta({
        error: { code: 'RATE_LIMITED', message: 'Too many requests' },
      })
    ).toEqual({
      code: 'RATE_LIMITED',
      message: 'Too many requests',
    })

    expect(
      extractApiErrorMeta({
        detail: [{ loc: ['body', 'email'], msg: 'Invalid email' }, 'Password is required'],
      })
    ).toEqual({
      message: 'Invalid email; Password is required',
    })
  })

  it('preserves response code, details, and raw server message on detail-object errors', async () => {
    const response = Response.json(
      {
        detail: {
          code: 'INVALID_CLIENT_TOKEN',
          message: 'Invalid client token',
          details: { reason: 'expired' },
        },
      },
      { status: 400 }
    )

    await expect(handleErrorResponse(response, true)).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      code: 'INVALID_CLIENT_TOKEN',
      message: 'error.server.invalidClientToken',
      details: {
        reason: 'expired',
        rawMessage: 'Invalid client token',
      },
    } satisfies Partial<ApiError>)
    expect(toastError).not.toHaveBeenCalled()
  })

  it('uses retry-after seconds for rate-limit errors and reports the mapped toast', async () => {
    const response = Response.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests',
        },
      },
      {
        status: 429,
        headers: { 'Retry-After': '12' },
      }
    )

    await expect(handleErrorResponse(response)).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
      message: 'error.tooManyRequestsWithTime:{"seconds":12}',
    } satisfies Partial<ApiError>)
    expect(toastError).toHaveBeenCalledWith('error.tooManyRequestsWithTime:{"seconds":12}')
  })

  it('maps Cloudflare tunnel HTML failures to service unavailable errors', async () => {
    const response = new Response('<h1>Error 1033</h1><p>Cloudflare Tunnel error</p>', {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    })

    await expect(handleErrorResponse(response, true)).rejects.toMatchObject({
      status: 530,
      message: 'error.serviceUnavailable',
    } satisfies Partial<ApiError>)
  })
})
