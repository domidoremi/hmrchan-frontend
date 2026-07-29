import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { extname } from 'node:path'

import { findNonEnglishCommentIssues } from './lib/comment-language.js'

const SUPPORTED_EXTENSIONS = new Set([
  '.css',
  '.cjs',
  '.html',
  '.js',
  '.mjs',
  '.scss',
  '.ts',
  '.tsx',
  '.vue',
])

function getTrackedCodeFiles() {
  return execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '-z'], {
    encoding: 'utf8',
  })
    .split('\0')
    .filter((file) => file && SUPPORTED_EXTENSIONS.has(extname(file).toLowerCase()))
}

const issues = []

for (const file of getTrackedCodeFiles()) {
  if (!existsSync(file)) continue
  const source = readFileSync(file, 'utf8')
  for (const issue of findNonEnglishCommentIssues(source, extname(file))) {
    issues.push({ file, ...issue })
  }
}

if (issues.length > 0) {
  console.error('Code comment language check failed:')
  for (const issue of issues) {
    console.error(`- ${issue.file}:${issue.line} [${issue.rule}]`)
  }
  process.exit(1)
}

console.log('Code comments use English consistently.')
