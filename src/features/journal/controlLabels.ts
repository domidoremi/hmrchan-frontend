type TranslateControl = (key: string) => string

const contentTypeKeys: Record<string, string> = {
  全部: 'common.all',
  写真: 'journal.content.photo',
  文字: 'journal.content.text',
  节目: 'journal.content.program',
}

// This is a presentation map for the fixed Browse options, not author taxonomy.
export function journalContentTypeLabel(value: string, translate: TranslateControl): string {
  const key = contentTypeKeys[value]
  return key ? translate(key) : value
}

export function journalSourceLabel(
  key: string,
  label: string,
  translate: TranslateControl
): string {
  if (key === 'all') return translate('common.all')
  if (key === 'official') return translate('journal.sources.official')
  return label
}
