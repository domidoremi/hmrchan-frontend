export type UuidV7String = string & { readonly __uuidV7: unique symbol }
export type PublicResourceId = UuidV7String

const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuidV7String(value: unknown): value is UuidV7String {
  return typeof value === 'string' && UUID_V7_PATTERN.test(value)
}

export function assertUuidV7String(value: unknown, label = 'resource id'): UuidV7String {
  if (isUuidV7String(value)) {
    return value
  }

  throw new TypeError(`${label} must be a UUIDv7 string`)
}
