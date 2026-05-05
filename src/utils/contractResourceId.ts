export type PublicResourceId = string & { readonly __publicResourceId: unique symbol }

const UUIDV7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isContractResourceId(value: unknown): value is PublicResourceId {
  return typeof value === 'string' && UUIDV7_PATTERN.test(value)
}

export function assertUuidV7String(value: unknown, label = 'resource id'): PublicResourceId {
  if (!isContractResourceId(value)) {
    throw new TypeError(`${label} must be a UUIDv7 public resource id`)
  }
  return value
}

export function getContractResourceId(value: unknown): PublicResourceId | null {
  return isContractResourceId(value) ? value : null
}
