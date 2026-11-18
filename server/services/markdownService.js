const sanitizeHtml = require('sanitize-html');

/**
 * Server-side Markdown-to-HTML parser
 * @param {string} markdown - Raw Markdown text
 * @returns {string} - Rendered HTML
 */
function parseMarkdownToHtml(markdown) {
  if (!markdown || typeof markdown !== 'string') return '';

  let html = markdown.replace(/\r\n/g, '\n');

  // 1. Code blocks ```lang ... ```
  const codeBlocks = [];
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `CODEBLOCKTOKEN${codeBlocks.length}END`;
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const langClass = lang ? ` class="language-${lang.toLowerCase()}"` : '';
    codeBlocks.push(`<pre><code${langClass}>${escaped.trim()}</code></pre>`);
    return `\n\n${placeholder}\n\n`;
  });

  // 2. Inline code `code`
  const inlineCodes = [];
  html = html.replace(/`([^`\n]+)`/g, (match, code) => {
    const placeholder = `INLINECODETOKEN${inlineCodes.length}END`;
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    inlineCodes.push(`<code>${escaped}</code>`);
    return placeholder;
  });

  // 3. Extract images ![alt](url)
  const linksAndImgs = [];
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
    const placeholder = `MEDIAIMGTOKEN${linksAndImgs.length}END`;
    const cleanUrl = url.trim().replace(/"/g, '&quot;');
    const cleanAlt = alt.trim().replace(/"/g, '&quot;');
    linksAndImgs.push(`<img src="${cleanUrl}" alt="${cleanAlt}" loading="lazy" />`);
    return placeholder;
  });

  // 4. Extract links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    const placeholder = `MEDIALINKTOKEN${linksAndImgs.length}END`;
    const cleanUrl = url.trim().replace(/"/g, '&quot;');
    linksAndImgs.push(`<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`);
    return placeholder;
  });

  // 5. Headers (# H1 to ###### H6)
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // 6. Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote><p>$1</p></blockquote>');

  // 7. Horizontal rules
  html = html.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr />');

  // 8. Bold & Italic formatting
  html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  html = html.replace(/\b_([^_]+)_\b/g, '<em>$1</em>');

  // 9. Strikethrough
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // 10. Unordered Lists
  html = html.replace(/(?:^[ \t]*[-*+][ \t]+.+\n?)+/gm, (listBlock) => {
    const items = listBlock
      .trim()
      .split(/\n/)
      .map((line) => line.replace(/^[ \t]*[-*+][ \t]+/, ''))
      .map((item) => `<li>${item}</li>`)
      .join('');
    return `<ul>${items}</ul>\n`;
  });

  // 11. Ordered Lists
  html = html.replace(/(?:^[ \t]*\d+\.[ \t]+.+\n?)+/gm, (listBlock) => {
    const items = listBlock
      .trim()
      .split(/\n/)
      .map((line) => line.replace(/^[ \t]*\d+\.[ \t]+/, ''))
      .map((item) => `<li>${item}</li>`)
      .join('');
    return `<ol>${items}</ol>\n`;
  });

  // 12. Paragraphs: Split on double newlines
  const blocks = html.split(/\n{2,}/);
  html = blocks
    .map((block) => {
      block = block.trim();
      if (!block) return '';
      if (/^<(h[1-6]|ul|ol|pre|blockquote|hr|table|div)/i.test(block) || /^CODEBLOCKTOKEN/i.test(block)) {
        return block;
      }
      return `<p>${block.replace(/\n/g, '<br />')}</p>`;
    })
    .filter(Boolean)
    .join('\n');

  // 13. Restore code blocks
  codeBlocks.forEach((token, index) => {
    html = html.replace(new RegExp(`CODEBLOCKTOKEN${index}END`, 'g'), token);
  });

  // 14. Restore links and images
  linksAndImgs.forEach((token, index) => {
    html = html.replace(new RegExp(`MEDIA(LINK|IMG)TOKEN${index}END`, 'g'), token);
  });

  // 15. Restore inline code
  inlineCodes.forEach((token, index) => {
    html = html.replace(new RegExp(`INLINECODETOKEN${index}END`, 'g'), token);
  });

  return html;
}

/**
 * Strict HTML Sanitization against XSS vectors
 * @param {string} rawHtml - Unsanitized HTML string
 * @returns {string} - Clean, safe HTML
 */
function sanitizeRenderedHtml(rawHtml) {
  if (!rawHtml) return '';

  const sanitizeOptions = {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
      'li', 'b', 'i', 'strong', 'em', 'strike', 'del', 'code', 'hr', 'br',
      'div', 'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'img'
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'loading'],
      code: ['class'],
      pre: ['class'],
      th: ['colspan', 'rowspan', 'align'],
      td: ['colspan', 'rowspan', 'align'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    },
  };

  return sanitizeHtml(rawHtml, sanitizeOptions);
}

/**
 * Complete compilation: Markdown -> Raw HTML -> Sanitized Disinfected HTML
 * @param {string} markdown - Raw Markdown text
 * @returns {string} - Sanitized HTML
 */
function compileMarkdown(markdown) {
  const rawHtml = parseMarkdownToHtml(markdown);
  return sanitizeRenderedHtml(rawHtml);
}

module.exports = {
  parseMarkdownToHtml,
  sanitizeRenderedHtml,
  compileMarkdown,
};
