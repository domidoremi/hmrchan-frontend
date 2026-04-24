import { describe, expect, it } from 'vitest'

import { getContractResourceId, isContractResourceId } from '../contractResourceId'

describe('contractResourceId', () => {
  it('accepts UUIDv7 resource ids', () => {
    const validId = '0195fe30-6f9d-7f31-9e6f-c9a5c478a001'

    expect(isContractResourceId(validId)).toBe(true)
    expect(getContractResourceId(validId)).toBe(validId)
  })

  it('rejects numeric, v4, and placeholder route ids', () => {
    expect(isContractResourceId('42')).toBe(false)
    expect(isContractResourceId('4df78e2b-4a70-4df1-8956-2e249376a336')).toBe(false)
    expect(isContractResourceId('undefined')).toBe(false)
    expect(getContractResourceId('null')).toBeNull()
  })
})
