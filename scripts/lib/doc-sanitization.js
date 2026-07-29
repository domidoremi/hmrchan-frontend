const bannedPatterns = [
  {
    name: 'windows-absolute-path',
    regex:
      /(?<![A-Za-z0-9:/])(?:\\\\\\?\\[A-Za-z]:\\|\/?[A-Za-z]:[\\/])[^\r\n`)\]}]*/g,
  },
  {
    name: 'file-uri',
    regex: /\bfile:\/\/\/?[^\s`)\]}]+/gi,
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

function lineNumberForIndex(content, index) {
  return content.slice(0, index).split(/\r?\n/).length
}

export function findMarkdownSanitizationIssues(content) {
  const issues = []

  for (const pattern of bannedPatterns) {
    for (const match of content.matchAll(pattern.regex)) {
      issues.push({
        line: lineNumberForIndex(content, match.index ?? 0),
        rule: pattern.name,
      })
    }
  }

  return issues
}
