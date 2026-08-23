#!/usr/bin/env node

import { spawn } from 'node:child_process'

const args = process.argv.slice(2)
const KNOWN_TOOLCHAIN_NOISE = [
  /\[baseline-browser-mapping\] The data in this module is over two months old/i,
]

const child = spawn(process.execPath, ['./node_modules/vitest/vitest.mjs', ...args], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: {
    ...process.env,
    // Node 26 exposes an experimental process-wide Web Storage implementation. Without a
    // persistence file its localStorage getter is unavailable, and Vitest can overwrite
    // jsdom's isolated storage globals with that value. Keep browser storage owned by jsdom.
    NODE_OPTIONS: [process.env.NODE_OPTIONS, '--no-experimental-webstorage']
      .filter(Boolean)
      .join(' '),
    // `baseline-browser-mapping` is pinned to the latest available release in this repo,
    // but upstream can still emit a stale-data warning when its published dataset ages past
    // two months. Keep CI output focused on real test failures by suppressing only that
    // known upstream notice for Vitest-based commands.
    BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA:
      process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA ?? 'true',
    BROWSERSLIST_IGNORE_OLD_DATA: process.env.BROWSERSLIST_IGNORE_OLD_DATA ?? 'true',
  },
})

function forwardStream(stream, target) {
  let buffer = ''

  stream.setEncoding('utf8')
  stream.on('data', (chunk) => {
    buffer += chunk
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (KNOWN_TOOLCHAIN_NOISE.some((pattern) => pattern.test(line))) {
        continue
      }
      target.write(`${line}\n`)
    }
  })

  stream.on('end', () => {
    if (buffer && !KNOWN_TOOLCHAIN_NOISE.some((pattern) => pattern.test(buffer))) {
      target.write(buffer)
    }
  })
}

if (child.stdout) {
  forwardStream(child.stdout, process.stdout)
}

if (child.stderr) {
  forwardStream(child.stderr, process.stderr)
}

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})

child.on('error', (error) => {
  console.error(error)
  process.exit(1)
})
