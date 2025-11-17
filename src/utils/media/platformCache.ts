/**
 * 平台差异化缓存工具
 * 支持基于平台的媒体文件URL构建和缓存策略
 */

import { getRuntimeApiBaseUrl } from '@/config/runtime'
import type { MediaFile } from '@/types'

/**
 * 构建媒体文件流URL
 * 自动添加platform参数以支持Service Worker的差异化缓存
 *
 * @param mediaFile - 媒体文件对象
 * @param platform - 平台标识（youtube, tiktok, twitter, instagram等）
 * @returns 完整的媒体流URL
 */
export function buildMediaStreamUrl(mediaFile: MediaFile, platform?: string): string {
  const baseUrl = getRuntimeApiBaseUrl()
  const streamUrl = `${baseUrl}/media/${mediaFile.id}/stream`

  // 添加platform参数用于Service Worker差异化缓存
  if (platform) {
    const url = new URL(streamUrl)
    url.searchParams.set('platform', platform.toLowerCase())
    return url.toString()
  }

  return streamUrl
}

/**
 * 构建媒体文件缩略图URL
 *
 * @param mediaFile - 媒体文件对象
 * @returns 缩略图URL
 */
export function buildMediaThumbnailUrl(mediaFile: MediaFile): string {
  const baseUrl = getRuntimeApiBaseUrl()
  return `${baseUrl}/media/${mediaFile.id}/thumbnail`
}

/**
 * 根据平台获取推荐的缓存时长（天）
 *
 * @param platform - 平台标识
 * @returns 缓存天数
 */
export function getPlatformCacheDays(platform: string): number {
  const cacheDaysMap: Record<string, number> = {
    youtube: 7, // YouTube视频较大，7天
    tiktok: 14, // TikTok视频适中，14天
    twitter: 14, // Twitter媒体，14天
    instagram: 14, // Instagram媒体，14天
  }

  return cacheDaysMap[platform.toLowerCase()] || 30 // 默认30天
}

/**
 * 从媒体URL中提取媒体ID
 *
 * @param url - 媒体URL
 * @returns 媒体ID或null
 */
export function extractMediaIdFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/media\/([^/]+)\//)
    return match?.[1] ?? null
  } catch {
    return null
  }
}
