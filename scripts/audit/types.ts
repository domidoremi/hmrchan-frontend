export type Severity = 'error' | 'warning' | 'info'

export type AuditStatus = 'pass' | 'warn' | 'fail'

export interface AuditIssue {
  severity: Severity
  message: string
  file?: string
  line?: number
  rule?: string
  suggestion?: string
}

export interface AuditResult {
  module: string
  status: AuditStatus
  issues: AuditIssue[]
  summary: string
  duration: number
}

export interface AuditOptions {
  fix: boolean
  verbose: boolean
  projectRoot: string
}

export interface AuditModule {
  name: string
  run(options: AuditOptions): Promise<AuditResult>
}

export interface AuditReport {
  timestamp: string
  results: AuditResult[]
  totalIssues: number
  passCount: number
  warnCount: number
  failCount: number
  totalDuration: number
}
