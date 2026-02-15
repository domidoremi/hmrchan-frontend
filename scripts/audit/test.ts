import type { AuditModule, AuditIssue, AuditOptions, AuditResult } from './types'
import { runCommand } from './utils'

interface VitestResult {
  numTotalTests: number
  numPassedTests: number
  numFailedTests: number
  testResults?: VitestFileResult[]
}

interface VitestFileResult {
  name: string
  assertionResults?: VitestAssertion[]
}

interface VitestAssertion {
  fullName: string
  status: string
  failureMessages?: string[]
}

function parseVitestJSON(output: string): VitestResult | null {
  try {
    // vitest JSON output may be preceded by non-JSON lines; find the object
    const start = output.indexOf('{')
    if (start === -1) return null
    return JSON.parse(output.slice(start)) as VitestResult
  } catch {
    return null
  }
}

const testAudit: AuditModule = {
  name: 'test',

  async run(options: AuditOptions): Promise<AuditResult> {
    const start = Date.now()
    const issues: AuditIssue[] = []

    const result = await runCommand(
      'npx',
      ['vitest', 'run', '--reporter=json'],
      options.projectRoot,
    )

    const parsed = parseVitestJSON(result.stdout)

    if (!parsed) {
      // Could not parse output — treat as failure
      const snippet = (result.stderr || result.stdout).slice(0, 500)
      issues.push({
        severity: 'error',
        message: `Failed to parse vitest output: ${snippet}`,
      })

      return {
        module: 'test',
        status: 'fail',
        issues,
        summary: 'Could not parse test results',
        duration: Date.now() - start,
      }
    }

    const { numTotalTests, numPassedTests, numFailedTests } = parsed

    // Collect failed test details
    if (parsed.testResults) {
      for (const file of parsed.testResults) {
        for (const assertion of file.assertionResults ?? []) {
          if (assertion.status === 'failed') {
            const errorMsg = assertion.failureMessages?.join('\n').slice(0, 300) ?? 'Unknown error'
            issues.push({
              severity: 'error',
              message: `${assertion.fullName}: ${errorMsg}`,
              file: file.name,
            })
          }
        }
      }
    }

    if (options.verbose) {
      console.log(`    Total: ${numTotalTests}  Passed: ${numPassedTests}  Failed: ${numFailedTests}`)
    }

    const status = numFailedTests > 0 ? 'fail' : 'pass'
    const summary =
      status === 'pass'
        ? `All ${numTotalTests} test(s) passed`
        : `${numFailedTests} of ${numTotalTests} test(s) failed`

    return {
      module: 'test',
      status,
      issues,
      summary,
      duration: Date.now() - start,
    }
  },
}

export default testAudit
