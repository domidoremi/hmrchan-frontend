export const SITE_NAME = 'Photos'

export function buildTitle(pageTitle: string): string {
  return pageTitle.trim() || SITE_NAME
}
