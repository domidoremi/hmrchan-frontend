import ts from 'typescript'

const NON_ENGLISH_SCRIPT = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff]/
const SCRIPT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx'])
const STYLE_EXTENSIONS = new Set(['.css', '.scss'])

function collectScriptComments(source, offset = 0) {
  const sourceFile = ts.createSourceFile(
    'comment-language.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const excludedRanges = []
  const excludedKinds = new Set([
    ts.SyntaxKind.JsxText,
    ts.SyntaxKind.NoSubstitutionTemplateLiteral,
    ts.SyntaxKind.RegularExpressionLiteral,
    ts.SyntaxKind.StringLiteral,
    ts.SyntaxKind.TemplateHead,
    ts.SyntaxKind.TemplateMiddle,
    ts.SyntaxKind.TemplateTail,
  ])

  function visit(node) {
    if (excludedKinds.has(node.kind)) {
      excludedRanges.push({ start: node.getStart(sourceFile), end: node.end })
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return collectPatternComments(source, /\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g, offset).filter(
    (range) =>
      !excludedRanges.some(
        (excluded) => range.start - offset >= excluded.start && range.start - offset < excluded.end
      )
  )
}

function collectPatternComments(source, pattern, offset = 0) {
  return [...source.matchAll(pattern)]
    .filter((match) => NON_ENGLISH_SCRIPT.test(match[0]))
    .map((match) => ({
      start: offset + (match.index ?? 0),
      end: offset + (match.index ?? 0) + match[0].length,
    }))
}

function collectVueComments(source) {
  const ranges = [
    ...collectPatternComments(source, /<!--[\s\S]*?-->/g),
    ...collectPatternComments(source, /\/\*[\s\S]*?\*\//g),
  ]

  for (const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const content = match[1]
    const contentOffset = (match.index ?? 0) + match[0].indexOf(content)
    ranges.push(...collectScriptComments(content, contentOffset))
  }

  return ranges
}

function collectHtmlComments(source) {
  const ranges = collectPatternComments(source, /<!--[\s\S]*?-->/g)

  for (const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const content = match[1]
    const contentOffset = (match.index ?? 0) + match[0].indexOf(content)
    ranges.push(...collectScriptComments(content, contentOffset))
  }

  for (const match of source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    const content = match[1]
    const contentOffset = (match.index ?? 0) + match[0].indexOf(content)
    ranges.push(...collectPatternComments(content, /\/\*[\s\S]*?\*\//g, contentOffset))
  }

  return ranges
}

export function findNonEnglishCommentRanges(source, extension) {
  const normalizedExtension = extension.toLowerCase()
  const ranges =
    normalizedExtension === '.vue'
      ? collectVueComments(source)
      : SCRIPT_EXTENSIONS.has(normalizedExtension)
        ? collectScriptComments(source)
        : STYLE_EXTENSIONS.has(normalizedExtension)
          ? [
              ...collectPatternComments(source, /\/\*[\s\S]*?\*\//g),
              ...collectPatternComments(source, /\/\/[^\r\n]*/g),
            ]
          : normalizedExtension === '.html'
            ? collectHtmlComments(source)
            : []

  return ranges
    .sort((left, right) => left.start - right.start || left.end - right.end)
    .filter((range, index, allRanges) => index === 0 || range.start >= allRanges[index - 1].end)
}

export function findNonEnglishCommentIssues(source, extension) {
  return findNonEnglishCommentRanges(source, extension).map((range) => ({
    line: source.slice(0, range.start).split(/\r?\n/).length,
    rule: 'english-code-comments',
  }))
}
