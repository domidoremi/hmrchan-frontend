import { describe, expect, it } from 'vitest'
import { findMarkdownSanitizationIssues } from '../../../scripts/lib/doc-sanitization.js'

describe('documentation sanitization', () => {
  it('detects Windows absolute paths with slash variants without retaining matched values', () => {
    const issues = findMarkdownSanitizationIssues(
      [
        '[workspace](/C:/Users/example/project/README.md)',
        String.raw`D:\work\private\VALIDATION.md`,
        String.raw`\\?\E:\build\artifact.txt`,
        'file:///F:/reports/private.html',
      ].join('\n')
    )

    expect(issues).toEqual(
      expect.arrayContaining([
        { line: 1, rule: 'windows-absolute-path' },
        { line: 2, rule: 'windows-absolute-path' },
        { line: 3, rule: 'windows-absolute-path' },
        { line: 4, rule: 'file-uri' },
      ])
    )
    expect(issues.every((issue) => !('value' in issue))).toBe(true)
  })

  it('does not treat a drive-like segment inside a normal URL as a local path', () => {
    expect(findMarkdownSanitizationIssues('https://example.com/C:/public/document')).toEqual([])
  })
})
