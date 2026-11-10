import type { HtmlDocumentConfig, HtmlDocumentShellLink } from './htmlDocument.ts'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function publicLinks(links: HtmlDocumentShellLink[]): string {
  if (!links.length) return ''
  return `<nav class="prerender-shell__links" aria-label="Public route shortcuts">${links.map((link, index) => `<a href="${escapeHtml(link.href)}"><span class="prerender-shell__link-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span>${escapeHtml(link.label)}</span><span aria-hidden="true">↗</span></a>`).join('')}</nav>`
}

function archiveDetails(config: HtmlDocumentConfig): string {
  const summary = config.shellSummary.length
    ? `<ol class="prerender-shell__summary">${config.shellSummary.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ol>`
    : ''
  const stats = config.shellStats.length
    ? `<dl class="prerender-shell__stats">${config.shellStats.map((stat) => `<div><dt>${escapeHtml(stat.label)}</dt><dd>${escapeHtml(stat.value)}</dd></div>`).join('')}</dl>`
    : ''
  const visual =
    config.ogImage && config.shellVariant !== 'home'
      ? `<figure class="prerender-shell__visual"><img src="${escapeHtml(config.ogImage)}" alt="${escapeHtml(config.shellTitle)}" loading="eager" decoding="async" /></figure>`
      : ''
  if (!summary && !stats && !visual) return ''
  return `<aside class="prerender-shell__record"><h2>${config.shellVariant === 'home' ? 'Start here' : 'In this record'}</h2>${summary}${visual}${stats}</aside>`
}

export function renderPublicShell(
  config: HtmlDocumentConfig,
  edition: 'editorial' | 'archive'
): string {
  const archive = edition === 'archive'
  return `<section class="prerender-shell" data-prerender-shell="true" data-prerender-shell-variant="${config.shellVariant}" data-edition="${edition}" aria-label="MomiChan">
    <header class="prerender-shell__header"><a class="prerender-shell__brand" href="/" aria-label="${archive ? 'm. MomiChan home' : 'MomiChan home'}">${archive ? 'm.' : 'MomiChan'}</a><span>${archive ? 'INDEX / COLLECTION' : 'THE JOURNAL'}</span></header>
    <div class="prerender-shell__body" data-prerender-shell-content="true">
      <div class="prerender-shell__intro"><p class="prerender-shell__eyebrow">${escapeHtml(config.shellEyebrow)}</p><h1>${escapeHtml(config.shellTitle)}</h1><p class="prerender-shell__description">${escapeHtml(config.shellBody)}</p>
        <span class="prerender-shell__loading" role="status" aria-live="polite"><i aria-hidden="true"></i><span>Opening this page</span></span>
        <noscript><p class="prerender-shell__note" lang="en">JavaScript is disabled. You can follow the public links below. Search, account actions and other interactive features need JavaScript.</p></noscript>
        ${publicLinks(config.shellLinks)}
      </div>
      ${archive ? archiveDetails(config) : ''}
    </div>
    <footer class="prerender-shell__footer"><span>MOMICHAN</span><span>${archive ? 'POSTS / PEOPLE / MOMENTS' : 'PHOTOS · POSTS · PEOPLE'}</span></footer>
  </section>`
}
