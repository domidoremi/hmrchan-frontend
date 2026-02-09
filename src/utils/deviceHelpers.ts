/**
 * Device Helper Utilities
 * Formatting and mapping functions for device management
 */

import { Monitor, Smartphone, Tablet } from 'lucide-vue-next'
import type { Component } from 'vue'

/**
 * Get the appropriate icon component for a device type
 */
export function getDeviceIcon(type: string): Component {
  switch (type) {
    case 'desktop':
      return Monitor
    case 'mobile':
      return Smartphone
    case 'tablet':
      return Tablet
    default:
      return Monitor
  }
}

/**
 * Format a date string into a relative time description
 * @param dateString ISO date string
 * @param t i18n translation function
 */
export function formatRelativeTime(
  dateString: string | null | undefined,
  t: (key: string, params?: Record<string, unknown>) => string
): string {
  if (!dateString) return t('devices.time.unknown')
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return t('devices.time.unknown')
  const now = new Date()
  const diff = Math.max(0, now.getTime() - date.getTime())
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return t('devices.time.justNow')
  if (minutes < 60) return t('devices.time.minutesAgo', { count: minutes })
  if (minutes < 1440) return t('devices.time.hoursAgo', { count: Math.floor(minutes / 60) })
  return t('devices.time.daysAgo', { count: Math.floor(minutes / 1440) })
}
