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

  it.each(['README.md', 'docs/en/README.md', String.raw`docs\en\README.md`])(
    'allows the public homepage link in %s',
    (relativePath) => {
      expect(
        findMarkdownSanitizationIssues('[Live site](https://momichan.com/)', relativePath)
      ).toEqual([])
    }
  )

  it.each(['', 'docs/zh-CN/architecture.md', 'docs/en/validation.md', '../README.md'])(
    'keeps the public homepage restricted outside the public READMEs: %s',
    (relativePath) => {
      expect(
        findMarkdownSanitizationIssues('[Live site](https://momichan.com/)', relativePath)
      ).toEqual([{ line: 1, rule: 'public-site-domain' }])
    }
  )

  it('keeps bare domains, deep links, insecure URLs, and lookalike hosts restricted in READMEs', () => {
    const issues = findMarkdownSanitizationIssues(
      [
        '[Live site](https://momichan.com/)',
        'momichan.com',
        '[Account](https://momichan.com/profile)',
        '[Insecure site](http://momichan.com/)',
        '[Lookalike](https://momichan.com.evil.example/)',
        '[Query](https://momichan.com/?token=example)',
      ].join('\n'),
      'README.md'
    )

    expect(issues).toEqual([2, 3, 4, 5, 6].map((line) => ({ line, rule: 'public-site-domain' })))
  })

  it('continues to flag API and admin domains and local paths next to an allowed homepage', () => {
    const issues = findMarkdownSanitizationIssues(
      [
        '[Live site](https://momichan.com/)',
        'https://api.momichan.com',
        'https://ops.momichan.com',
        String.raw`D:\private\report.md`,
        'file:///E:/private/report.html',
      ].join('\n'),
      'README.md'
    )

    expect(issues).toEqual(
      expect.arrayContaining([
        { line: 2, rule: 'public-api-domain' },
        { line: 3, rule: 'admin-domain' },
        { line: 4, rule: 'windows-absolute-path' },
        { line: 5, rule: 'file-uri' },
      ])
    )
  })
})
