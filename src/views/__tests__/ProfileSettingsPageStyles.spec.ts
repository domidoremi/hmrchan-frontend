import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const profileSettingsSource = readFileSync(
  resolve(process.cwd(), 'src/views/ProfileSettingsPage.vue'),
  'utf8'
)
const profileSettingsStyles = readFileSync(
  resolve(process.cwd(), 'src/styles/page-systems/profile-settings-page-view.css'),
  'utf8'
)

describe('ProfileSettingsPage styles', () => {
  it('keeps page presentation in an external scoped stylesheet', () => {
    expect(profileSettingsSource).toContain(
      '<style scoped src="../styles/page-systems/profile-settings-page-view.css"></style>'
    )
    expect(profileSettingsSource).not.toContain('<style scoped>\n')
    expect(profileSettingsStyles).toContain('.settings-page {')
    expect(profileSettingsStyles).toContain('.settings-section {')
  })

  it('preserves responsive layout contracts in the migrated stylesheet', () => {
    expect(profileSettingsStyles).toContain('.settings-section {')
    expect(profileSettingsStyles).toContain('inline-size: 100%')
    expect(profileSettingsStyles).toContain('max-inline-size: 100%')
    expect(profileSettingsStyles).toContain('.field-hint-row {')
    expect(profileSettingsStyles).toContain('flex-wrap: wrap')
    expect(profileSettingsStyles).toContain('@media (max-width: 768px)')
  })
})
