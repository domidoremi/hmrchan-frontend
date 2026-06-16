function truncate(value, max = 140) {
  const text = String(value ?? '')
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1))}…`
}

export function maskEmail(email) {
  if (!email) return ''
  const [local, domain] = String(email).split('@')
  if (!local || !domain) return truncate(String(email), 60)
  const visible = local.length <= 2 ? local : local.slice(0, 2)
  return `${visible}***@${domain}`
}

export function maskIdentifier(value) {
  if (!value) return ''
  if (String(value).includes('@')) return maskEmail(value)
  const text = String(value)
  if (text.length <= 4) return `${text[0] ?? ''}***`
  return `${text.slice(0, 2)}***${text.slice(-2)}`
}

export function sanitizeCode(raw) {
  return String(raw ?? '')
    .replace(/\D/g, '')
    .slice(0, 6)
}

export function maskUrl(raw) {
  if (!raw) return ''
  try {
    const url = new URL(raw)
    const paramKeys = [...url.searchParams.keys()]
    return `${url.origin}${url.pathname}${paramKeys.length > 0 ? `?[${paramKeys.join(',')}]` : ''}`
  } catch {
    return truncate(String(raw), 120)
  }
}
