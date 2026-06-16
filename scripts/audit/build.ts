import { readdirSync, statSync, existsSync } from 'fs'
import { join, relative } from 'path'
import { createLocalAuditEnv } from '../lib/audit-env.js'
import type { AuditModule, AuditIssue, AuditOptions, AuditResult } from './types'
import { getNodeCommand, runCommand, summarizeAuditIssues } from './utils'

const CHUNK_SIZE_WARN_KB = 500

interface FileEntry {
  name: string
  sizeKB: number
}

function collectFiles(dir: string, base: string): FileEntry[] {
  const entries: FileEntry[] = []
  if (!existsSync(dir)) return entries

  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, item.name)
    if (item.isDirectory()) {
      entries.push(...collectFiles(fullPath, base))
    } else {
      const stat = statSync(fullPath)
      entries.push({
        name: relative(base, fullPath).replace(/\\/g, '/'),
        sizeKB: Math.round((stat.size / 1024) * 100) / 100,
      })
    }
  }

  return entries
}

const buildAudit: AuditModule = {
  name: 'build',

  async run(options: AuditOptions): Promise<AuditResult> {
    const start = Date.now()
    const issues: AuditIssue[] = []
    const distDir = join(options.projectRoot, 'dist')

    // 1. Run the project build wrapper so production contract env is applied.
    const result = await runCommand(getNodeCommand(), ['scripts/build.mjs'], options.projectRoot, {
      env: createLocalAuditEnv(process.env, {
        cwd: options.projectRoot,
        includeContractFallback: true,
      }),
    })

    if (result.exitCode !== 0) {
      const errorOutput = (result.stderr || result.stdout).slice(0, 500)
      issues.push({
        severity: 'error',
        message: `project build failed (exit code ${result.exitCode}): ${errorOutput}`,
      })
      return {
        module: 'build',
        status: 'fail',
        issues,
        summary: 'Build failed',
        duration: Date.now() - start,
      }
    }

    // 2. Verify dist/index.html exists
    if (!existsSync(join(distDir, 'index.html'))) {
      issues.push({
        severity: 'error',
        message: 'dist/index.html not found after build',
        file: 'dist/index.html',
      })
    }

    // 3. Verify dist/assets/ contains JS and CSS
    const assetsDir = join(distDir, 'assets')
    if (!existsSync(assetsDir)) {
      issues.push({
        severity: 'error',
        message: 'dist/assets/ directory not found',
        file: 'dist/assets/',
      })
    } else {
      const assets = collectFiles(assetsDir, distDir)
      const hasJS = assets.some((f) => f.name.endsWith('.js'))
      const hasCSS = assets.some((f) => f.name.endsWith('.css'))

      if (!hasJS) {
        issues.push({
          severity: 'error',
          message: 'No JavaScript files found in dist/assets/',
          file: 'dist/assets/',
        })
      }
      if (!hasCSS) {
        issues.push({
          severity: 'error',
          message: 'No CSS files found in dist/assets/',
          file: 'dist/assets/',
        })
      }

      // 4. Scan Vite-emitted JS/CSS chunks for size warnings.
      const buildChunks = assets.filter((f) => /\.(?:css|js)$/i.test(f.name))

      if (options.verbose) {
        console.log('    Build chunks:')
        for (const f of buildChunks) {
          console.log(`      ${f.name} (${f.sizeKB} KB)`)
        }
      }

      // 5. Flag chunks exceeding threshold
      for (const f of buildChunks) {
        if (f.sizeKB > CHUNK_SIZE_WARN_KB) {
          issues.push({
            severity: 'warning',
            message: `Chunk exceeds ${CHUNK_SIZE_WARN_KB}KB: ${f.name} (${f.sizeKB} KB)`,
            file: `dist/${f.name}`,
            suggestion: 'Consider code splitting or lazy loading to reduce chunk size',
          })
        }
      }
    }

    const { status } = summarizeAuditIssues(issues)

    const summary =
      status === 'pass'
        ? 'Build succeeded with no issues'
        : `Build completed with ${issues.length} issue(s)`

    return {
      module: 'build',
      status,
      issues,
      summary,
      duration: Date.now() - start,
    }
  },
}

export default buildAudit
