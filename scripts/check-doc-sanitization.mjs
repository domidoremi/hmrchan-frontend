import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { findMarkdownSanitizationIssues } from './lib/doc-sanitization.js'

function getTrackedMarkdownFiles() {
  const stdout = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '*.md'],
    { encoding: 'utf8' }
  )
  return [
    ...new Set(
      stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    ),
  ]
}

const issues = []

for (const file of getTrackedMarkdownFiles()) {
  const absolutePath = join(process.cwd(), file)
  if (!existsSync(absolutePath)) {
    continue
  }

  const content = readFileSync(absolutePath, 'utf8')

  for (const issue of findMarkdownSanitizationIssues(content)) {
    issues.push({ file, ...issue })
  }
}

if (issues.length > 0) {
  console.error('Markdown sanitization check failed:')
  for (const issue of issues) {
    console.error(`- ${issue.file}:${issue.line} [${issue.rule}]`)
  }
  process.exit(1)
}

console.log('Markdown sanitization check passed.')
