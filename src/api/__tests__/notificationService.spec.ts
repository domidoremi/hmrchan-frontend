import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listInboxMessages, listInboxSummary, listNotifications } from '@/api/notificationService'

const mockGet = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  apiClient: {
    get: mockGet,
  },
}))

describe('notificationService', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('uses authenticated inbox and notification facade endpoints', async () => {
    mockGet.mockResolvedValue({})

    await listInboxSummary()
    await listInboxMessages()
    await listNotifications()

    expect(mockGet).toHaveBeenNthCalledWith(1, '/inbox/summary')
    expect(mockGet).toHaveBeenNthCalledWith(2, '/inbox')
    expect(mockGet).toHaveBeenNthCalledWith(3, '/notifications')
  })
})
