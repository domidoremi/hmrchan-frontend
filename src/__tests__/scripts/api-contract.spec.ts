import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import apiContractAudit from '../../../scripts/audit/api-contract'

describe('api-contract audit', () => {
  it('reads endpoints from backend-handoff OpenAPI artifacts', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'api-contract-audit-'))
    const openApiDir = join(projectRoot, 'docs', 'backend-handoff', 'contracts', 'openapi')
    const apiDir = join(projectRoot, 'src', 'api')

    mkdirSync(openApiDir, { recursive: true })
    mkdirSync(apiDir, { recursive: true })

    writeFileSync(
      join(openApiDir, 'identity-account-security.openapi.yaml'),
      `openapi: 3.1.0
paths:
  /api/v1/posts:
    get:
      responses:
        "200":
          description: ok
  /api/v1/auth/sessions/{session_id}:
    delete:
      responses:
        "200":
          description: ok
`,
      'utf8'
    )

    writeFileSync(
      join(apiDir, 'exampleService.ts'),
      `import { apiClient } from './client'

export function listPosts() {
  return apiClient.get('/posts')
}

export function revokeSession(sessionId: string) {
  return apiClient.delete(\`/auth/sessions/\${sessionId}\`)
}
`,
      'utf8'
    )

    const result = await apiContractAudit.run({
      fix: false,
      verbose: false,
      projectRoot,
    })

    expect(result.status).toBe('pass')
    expect(result.issues).toHaveLength(0)
    expect(result.summary).toContain('frontend endpoints match contract')
  })
})
