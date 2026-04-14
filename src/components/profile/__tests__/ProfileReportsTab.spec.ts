import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  getMyReports: vi.fn(),
  getSummary: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    te: (key: string) => key.startsWith('profile.report') || key.startsWith('comment.reportReason'),
  }),
}))

vi.mock('@/api', () => {
  class MockApiError extends Error {}

  return {
    ApiError: MockApiError,
    reportService: {
      getMyReports: state.getMyReports,
      getSummary: state.getSummary,
    },
  }
})

vi.mock('@/api/summaryCounts', () => ({
  normalizeReportsSummaryCount: vi.fn(
    (value: { reports?: number | null }) => value.reports ?? null
  ),
}))

vi.mock('@/composables/usePreferredPageSize', () => ({
  usePreferredPageSize: () => ref(20),
}))

vi.mock('@/utils/date', () => ({
  formatRelativeTime: vi.fn((value: string | null | undefined) => `relative:${value ?? 'none'}`),
}))

vi.mock('@/components/ui/LoadMoreSection.vue', () => ({
  default: {
    template: '<div class="load-more-section-stub" />',
  },
}))

vi.mock('@/components/ui/StateIndicator.vue', () => ({
  default: {
    props: ['variant', 'description'],
    emits: ['action'],
    template:
      '<button type="button" class="state-indicator-stub" :data-variant="variant" :data-description="description" @click="$emit(\'action\')" />',
  },
}))

vi.mock('@/components/ui/Skeleton.vue', () => ({
  default: {
    template: '<div class="skeleton-stub" />',
  },
}))

import ProfileReportsTab from '../ProfileReportsTab.vue'

describe('ProfileReportsTab', () => {
  beforeEach(() => {
    state.getMyReports.mockReset()
    state.getSummary.mockReset()
  })

  it('renders report records with translated status and reason labels plus summary count', async () => {
    state.getMyReports.mockResolvedValue({
      items: [
        {
          id: 'report-1',
          target_type: 'comment',
          target_id: 'comment-1',
          reason: 'spam',
          status: 'resolved',
          description: null,
          created_at: '2026-04-14T07:00:00.000Z',
          updated_at: '2026-04-14T08:00:00.000Z',
        },
      ],
      has_more: false,
      next_cursor: null,
    })
    state.getSummary.mockResolvedValue({ reports: 7 })

    const wrapper = mount(ProfileReportsTab, {
      props: {
        showHeader: true,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('profile.tabs.reports')
    expect(wrapper.text()).toContain('7')
    expect(wrapper.text()).toContain('profile.reportTargetTypes.comment')
    expect(wrapper.text()).toContain('profile.reportStatuses.resolved')
    expect(wrapper.text()).toContain('comment.reportReason.spam')
    expect(wrapper.text()).toContain('profile.reportDescriptionEmpty')
    expect(wrapper.text()).toContain('profile.reportIdLabel #report-1')
  })

  it('shows an error state and retries the page fetch when the retry action is clicked', async () => {
    state.getMyReports.mockRejectedValueOnce(new Error('reports-down')).mockResolvedValueOnce({
      items: [],
      has_more: false,
      next_cursor: null,
    })
    state.getSummary.mockResolvedValue({ reports: 0 })

    const wrapper = mount(ProfileReportsTab, {
      props: {
        showHeader: false,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    await flushPromises()
    expect(wrapper.get('.state-indicator-stub').attributes('data-variant')).toBe('error')

    await wrapper.get('.state-indicator-stub').trigger('click')
    await flushPromises()

    expect(state.getMyReports).toHaveBeenCalledTimes(2)
    expect(wrapper.get('.state-indicator-stub').attributes('data-variant')).toBe('empty')
  })
})
