import type { HomeAggregateResponse } from '@/api/homeService'
import { STATIC_HOME_AGGREGATE } from './generated/publicSnapshots'
import { clonePublicSnapshot } from './publicPageFallback'

export function buildHomepageBootstrapFallback(): HomeAggregateResponse {
  return clonePublicSnapshot(STATIC_HOME_AGGREGATE)
}
