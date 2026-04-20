#!/usr/bin/env node

import process from 'node:process'
import { spawn } from 'node:child_process'

const child = spawn('node', ['scripts/validate-release.mjs', '--mode', 'candidate'], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
  shell: false,
})

child.on('error', (error) => {
  console.error('Failed to start release validation candidate runner:', error)
  process.exit(1)
})

child.on('close', (code) => {
  process.exit(code ?? 1)
})
