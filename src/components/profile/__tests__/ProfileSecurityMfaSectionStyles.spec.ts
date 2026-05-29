import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const sectionSource = readFileSync(
  resolve(process.cwd(), 'src/components/profile/ProfileSecurityMfaSection.vue'),
  'utf8'
)
const sectionStyles = readFileSync(
  resolve(process.cwd(), 'src/styles/page-systems/profile-security-mfa-section.css'),
  'utf8'
)
const stylesIndex = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8')

describe('ProfileSecurityMfaSection styles', () => {
  it('keeps MFA presentation in the layered profile stylesheet', () => {
    expect(sectionSource).not.toContain('<style')
    expect(stylesIndex).toContain(
      "@import './page-systems/profile-security-mfa-section.css' layer(page-systems);"
    )
    expect(sectionStyles).toContain('.security-mfa-panel .settings-section {')
    expect(sectionStyles).toContain('.security-mfa-panel .passkey-item__actions {')
  })

  it('keeps migrated selectors scoped under the MFA panel root', () => {
    expect(sectionStyles).toContain('.security-mfa-panel .field-hint,')
    expect(sectionStyles).toContain('.security-mfa-panel .two-factor-actions > .btn {')
    expect(sectionStyles).toContain('@media (max-width: 768px)')
    expect(sectionStyles).not.toContain('\n.settings-section {')
    expect(sectionStyles).not.toContain('\n.field-hint')
    expect(sectionStyles).not.toContain('\n.two-factor-actions {')
  })
})
