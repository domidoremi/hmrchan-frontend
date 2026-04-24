import type { AuditIssue, AuditModule, AuditOptions, AuditResult, AuditStatus } from './types'
import { validateFrontendContractAudit } from '../lib/frontend-contract-audit.js'

const frontendContractAudit: AuditModule = {
  name: 'frontend-contract',

  async run(options: AuditOptions): Promise<AuditResult> {
    const start = Date.now()
    const issues = validateFrontendContractAudit(options.projectRoot).map(
      (issue): AuditIssue => ({
        severity: 'error',
        message: issue.message,
        file: issue.file,
        rule: issue.code,
        suggestion:
          issue.code === 'numeric-public-id-contract-drift'
            ? 'Use PublicResourceId and assertUuidV7String for frontend public resource IDs'
            : 'Align frontend auth service/proxy references with the backend OpenAPI and frontend contract',
      })
    )

    const status: AuditStatus = issues.length > 0 ? 'fail' : 'pass'

    return {
      module: 'frontend-contract',
      status,
      issues,
      summary:
        issues.length === 0
          ? 'Frontend auth surface and UUIDv7 public ID guards are aligned'
          : `Found ${issues.length} frontend contract issue(s)`,
      duration: Date.now() - start,
    }
  },
}

export default frontendContractAudit
