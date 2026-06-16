import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import textStyleAudit from '../../../scripts/audit/text-style'

describe('text-style audit', () => {
  it('passes implementation-oriented markdown and ignores generated output paths', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'text-style-audit-pass-'))

    try {
      writeFileSync(
        join(projectRoot, 'README.md'),
        ['# Execution Policy', '', '- The runner must record observable failures.', ''].join('\n'),
        'utf8'
      )
      mkdirSync(join(projectRoot, 'dist'), { recursive: true })
      writeFileSync(join(projectRoot, 'dist', 'generated.md'), '# Recommendations\n', 'utf8')

      await expect(
        textStyleAudit.run({
          fix: false,
          verbose: false,
          projectRoot,
        })
      ).resolves.toMatchObject({
        module: 'text-style',
        status: 'pass',
        issues: [],
      })
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  it('fails markdown with discussion headings or advisory wording', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'text-style-audit-fail-'))

    try {
      writeFileSync(
        join(projectRoot, 'README.md'),
        ['# Recommendations', '', 'We should maybe update this later.', ''].join('\n'),
        'utf8'
      )

      await expect(
        textStyleAudit.run({
          fix: false,
          verbose: false,
          projectRoot,
        })
      ).resolves.toMatchObject({
        module: 'text-style',
        status: 'fail',
        summary: 'Found 2 documentation wording issue(s).',
        issues: [
          {
            severity: 'error',
            rule: 'no-discussion-heading',
            file: 'README.md',
            line: 1,
          },
          {
            severity: 'error',
            rule: 'no-advisory-wording',
            file: 'README.md',
            line: 3,
          },
        ],
      })
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })
})
