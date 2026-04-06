import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('../client', () => ({
  apiClient: {
    get: clientMocks.get,
  },
}))

import { reportService } from '../reportService'

describe('reportService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds cursor-based my reports queries', async () => {
    vi.mocked(clientMocks.get).mockResolvedValueOnce({
      items: [],
      next_cursor: null,
      has_more: false,
    })

    await reportService.getMyReports(
      {
        limit: 14,
        cursor: 'reports-cursor-1',
      },
      { skipErrorToast: true }
    )

    expect(clientMocks.get).toHaveBeenCalledWith('/reports/my?limit=14&cursor=reports-cursor-1', {
      skipErrorToast: true,
    })
  })
})
