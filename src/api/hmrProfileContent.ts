import { fallbackCommunity } from './hmrContentFallbacks'
import { mapCommunityItem } from './hmrContentMappers'
import { extractList, isRecord, pickNumber, pickString } from './hmrContentUtils'
import type { HmrInboxSummary, HmrSecuritySummary } from '@/hmr/types'
import type {
  HmrCommunityItem,
  HmrProfileSectionContent,
  HmrProfileSectionKey,
  HmrSettingsContent,
  HmrSupportContent,
} from './hmrContentTypes'

function normalizeProfileSection(section: string): HmrProfileSectionKey {
  if (
    section === 'security' ||
    section === 'preferences' ||
    section === 'favorites' ||
    section === 'history' ||
    section === 'inbox'
  ) {
    return section
  }

  return 'overview'
}

function makeSummaryItem(
  id: string,
  title: string,
  excerpt: string,
  metric: string
): HmrCommunityItem {
  return { id, title, excerpt, metric }
}

function mapProfileRows(payload: unknown, fallback: HmrCommunityItem[]): HmrCommunityItem[] {
  const rows = extractList(payload, [
    'items',
    'results',
    'messages',
    'favorites',
    'sessions',
    'devices',
  ])
  return (rows.length ? rows : fallback).map(mapCommunityItem).slice(0, 8)
}

function summarizeSecurity(
  twoFactor: unknown,
  sessions: unknown,
  devices: unknown
): HmrSecuritySummary {
  const twoFactorRecord = isRecord(twoFactor) ? twoFactor : {}
  const sessionRows = extractList(sessions, ['items', 'sessions', 'results'])
  const deviceRows = extractList(devices, ['items', 'devices', 'results'])
  const credentials = extractList(twoFactor, ['webauthn_credentials', 'passkeys', 'credentials'])

  return {
    passkeys: credentials.length,
    sessions: sessionRows.length,
    devices: deviceRows.length,
    twoFactorEnabled: Boolean(twoFactorRecord.enabled ?? twoFactorRecord.totp_enabled),
    updatedAt: pickString(twoFactorRecord, ['updated_at', 'last_used_at'], '已更新'),
  }
}

export async function mapProfileSectionContent(
  rawSection: string,
  reader: <T>(path: string) => Promise<T | null>
): Promise<HmrProfileSectionContent> {
  const section = normalizeProfileSection(rawSection)

  if (section === 'security') {
    const [twoFactor, sessions, devices] = await Promise.all([
      reader<unknown>('/2fa/status'),
      reader<unknown>('/auth/sessions'),
      reader<unknown>('/devices'),
    ])
    const security = summarizeSecurity(twoFactor, sessions, devices)
    return {
      section,
      title: '安全状态',
      summary: [
        makeSummaryItem(
          'passkeys',
          'Passkey',
          '已绑定的 WebAuthn 凭据数量。',
          `${security.passkeys}`
        ),
        makeSummaryItem(
          'sessions',
          '活跃会话',
          '当前账号保持登录的浏览器或设备。',
          `${security.sessions}`
        ),
        makeSummaryItem('devices', '可信设备', '设备列表来自安全状态。', `${security.devices}`),
      ],
      rows: mapProfileRows(sessions, fallbackCommunity),
      security,
    }
  }

  if (section === 'preferences') {
    const preferences = await reader<unknown>('/preferences')
    return {
      section,
      title: '偏好设置',
      summary: [
        makeSummaryItem('theme', '界面偏好', '主题、语言、通知和内容密度会在这里收束。', '偏好'),
        makeSummaryItem('refresh', '刷新状态', '页面需要重新载入时会在这里提示。', '状态'),
      ],
      rows: mapProfileRows(preferences, fallbackCommunity),
    }
  }

  if (section === 'favorites') {
    const [summary, favorites] = await Promise.all([
      reader<unknown>('/favorites/summary'),
      reader<unknown>('/favorites'),
    ])
    return {
      section,
      title: '收藏索引',
      summary: extractList(summary, ['items', 'summary', 'stats'])
        .map(mapCommunityItem)
        .slice(0, 3),
      rows: mapProfileRows(favorites, fallbackCommunity),
    }
  }

  if (section === 'history') {
    const [summary, browsing] = await Promise.all([
      reader<unknown>('/history/summary'),
      reader<unknown>('/history/browsing'),
    ])
    return {
      section,
      title: '浏览历史',
      summary: extractList(summary, ['items', 'summary', 'stats'])
        .map(mapCommunityItem)
        .slice(0, 3),
      rows: mapProfileRows(browsing, fallbackCommunity),
    }
  }

  if (section === 'inbox') {
    const [summary, inbox] = await Promise.all([
      reader<unknown>('/inbox/summary'),
      reader<unknown>('/inbox'),
    ])
    const summaryRecord = isRecord(summary) ? summary : {}
    const inboxSummary: HmrInboxSummary = {
      unreadCount: pickNumber(summaryRecord, ['unread_count', 'unread']),
      latestLabel: pickString(summaryRecord, ['latest_label', 'updated_at'], '已更新'),
    }
    return {
      section,
      title: '收件箱',
      summary: [
        makeSummaryItem(
          'unread',
          '未读消息',
          '评论、回复、系统通知和审核结果。',
          `${inboxSummary.unreadCount}`
        ),
        makeSummaryItem(
          'latest',
          '最近更新',
          '评论、回复、系统通知和审核结果。',
          inboxSummary.latestLabel
        ),
      ],
      rows: mapProfileRows(inbox, fallbackCommunity),
      inbox: inboxSummary,
    }
  }

  const [me, profile] = await Promise.all([
    reader<unknown>('/auth/me'),
    reader<unknown>('/users/me/profile'),
  ])
  const meRecord = isRecord(me) ? me : {}
  const profileRecord = isRecord(profile) ? profile : {}
  return {
    section,
    title: '个人概览',
    summary: [
      makeSummaryItem(
        'identity',
        pickString(meRecord, ['username', 'full_name', 'email'], 'MomiChan member'),
        pickString(profileRecord, ['bio', 'description'], '当前会话由登录状态恢复。'),
        pickString(meRecord, ['id'], 'session')
      ),
      makeSummaryItem('profile', '公开资料', '头像、简介和个人主页会在这里展示。', 'Profile'),
      makeSummaryItem('loop', '个人循环', '收藏、历史、收件箱和安全状态共同组成个人入口。', 'Loop'),
    ],
    rows: mapProfileRows(profile, fallbackCommunity),
  }
}

export function endpointsForProfileSection(rawSection: string): string[] {
  const section = normalizeProfileSection(rawSection)

  if (section === 'security') return ['/2fa/status', '/auth/sessions', '/devices']
  if (section === 'preferences') return ['/preferences']
  if (section === 'favorites') return ['/favorites/summary', '/favorites']
  if (section === 'history') return ['/history/summary', '/history/browsing']
  if (section === 'inbox') return ['/inbox/summary', '/inbox']

  return ['/auth/me', '/users/me/profile']
}

export function mapSettingsContent(
  preferences: unknown,
  twoFactor: unknown,
  devices: unknown
): HmrSettingsContent {
  return {
    account: [
      makeSummaryItem('profile', '个人资料', '管理头像、简介和显示名称。', '/profile'),
      makeSummaryItem('feedback', '反馈通道', '发送产品建议和账号问题。', '/contact'),
    ],
    security: [
      ...mapProfileRows(twoFactor, [
        makeSummaryItem('2fa', '双重验证', '查看 TOTP、Passkey 和恢复状态。', 'Security'),
      ]).slice(0, 2),
      ...mapProfileRows(devices, [
        makeSummaryItem('devices', '设备', '查看可信设备和当前会话。', 'Devices'),
      ]).slice(0, 2),
    ],
    preferences: mapProfileRows(preferences, [
      makeSummaryItem('theme', '主题', '主题、语言和内容密度从这里调整。', '偏好'),
      makeSummaryItem('density', '内容密度', '后续可持久化内容密度。', 'Prefs'),
    ]).slice(0, 4),
  }
}

export function fallbackSupportContent(): HmrSupportContent {
  return {
    faqs: [
      makeSummaryItem(
        'contact',
        '反馈会发送到哪里？',
        '反馈会进入主提交流程，再进入处理队列。',
        '01'
      ),
      makeSummaryItem(
        'join',
        '可以提交合作或加入社区吗？',
        '可以。你也可以从加入页进入注册流程，再把账号状态带入个人页。',
        '02'
      ),
      makeSummaryItem(
        'local',
        '提交后会发生什么？',
        '提交后会进入感谢页，你可以继续浏览内容或回到社区。',
        '03'
      ),
    ],
    flows: [
      makeSummaryItem(
        'brief',
        '提交上下文',
        '产品、账号、社区或内容方向会进入同一个支持入口。',
        'Brief'
      ),
      makeSummaryItem('reply', '等待回应', '提交后会进入感谢页，系统会继续处理消息。', 'Reply'),
    ],
  }
}
