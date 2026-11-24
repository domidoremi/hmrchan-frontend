const bannedPatterns = [
  {
    name: 'windows-absolute-path',
    regex: /(?<![A-Za-z0-9:/])(?:\\\\\\?\\[A-Za-z]:\\|\/?[A-Za-z]:[\\/])[^\r\n`)\]}]*/g,
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

const publicReadmePaths = new Set(['README.md', 'docs/en/README.md'])

function publicHomepageLinkRanges(content, relativePath) {
  if (!publicReadmePaths.has(relativePath.replaceAll('\\', '/'))) {
    return []
  }

  return [...content.matchAll(/\[[^\]\r\n]+\]\((https:\/\/momichan\.com\/)\)/g)].map((match) => {
    const start = match.index + match[0].indexOf(match[1])
    return { start, end: start + match[1].length }
  })
}

function lineNumberForIndex(content, index) {
  return content.slice(0, index).split(/\r?\n/).length
}

export function findMarkdownSanitizationIssues(content, relativePath = '') {
  const issues = []
  const homepageLinks = publicHomepageLinkRanges(content, relativePath)

  for (const pattern of bannedPatterns) {
    for (const match of content.matchAll(pattern.regex)) {
      if (
        pattern.name === 'public-site-domain' &&
        homepageLinks.some(
          ({ start, end }) => match.index >= start && match.index + match[0].length <= end
        )
      ) {
        continue
      }

      issues.push({
        line: lineNumberForIndex(content, match.index ?? 0),
        rule: pattern.name,
      })
    }
  }

  return issues
}
