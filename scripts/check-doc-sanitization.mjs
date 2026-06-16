import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const bannedPatterns = [
  {
    name: 'windows-absolute-path',
    regex: /\b[A-Za-z]:\\[^\r\n`]*/g,
  },
  {
    name: 'workspace-absolute-path',
    regex: /G:\\Project\\[^\r\n`]*/g,
  },
  {
    name: 'public-site-domain',
    regex: /\b(?:https?:\/\/)?momichan\.com\b/g,
  },
  {
    name: 'public-api-domain',
    regex: /\b(?:https?:\/\/)?api\.momichan\.com\b/g,
  },
  {
    name: 'admin-domain',
    regex: /\b(?:https?:\/\/)?ops\.momichan\.com\b/g,
  },
]

function getTrackedMarkdownFiles() {
  const stdout = execFileSync('git', ['ls-files', '*.md'], { encoding: 'utf8' })
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function lineNumberForIndex(content, index) {
  return content.slice(0, index).split(/\r?\n/).length
}

const issues = []

for (const file of getTrackedMarkdownFiles()) {
  const absolutePath = join(process.cwd(), file)
  if (!existsSync(absolutePath)) {
    continue
  }

  const content = readFileSync(absolutePath, 'utf8')

  for (const pattern of bannedPatterns) {
    for (const match of content.matchAll(pattern.regex)) {
      issues.push({
        file,
        line: lineNumberForIndex(content, match.index ?? 0),
        rule: pattern.name,
        value: match[0],
      })
    }
  }
}

if (issues.length > 0) {
  console.error('Markdown sanitization check failed:')
  for (const issue of issues) {
    console.error(`- ${issue.file}:${issue.line} [${issue.rule}] ${issue.value}`)
  }
  process.exit(1)
}

console.log('Markdown sanitization check passed.')
