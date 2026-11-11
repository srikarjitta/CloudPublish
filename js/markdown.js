/**
 * CloudPublish - Markdown Parser & Utilities
 * Lightweight, robust vanilla JavaScript Markdown parser with frontmatter support.
 */

const MarkdownParser = (function () {
  'use strict';

  /**
   * Escape HTML entities to prevent XSS
   */
  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Parse YAML-style frontmatter from markdown file contents
   * @param {string} text 
   * @returns {{ metadata: Object, body: string }}
   */
  function parseFrontmatter(text) {
    if (!text) return { metadata: {}, body: '' };

    const trimmed = text.trim();
    if (!trimmed.startsWith('---')) {
      const lines = trimmed.split('\n');
      let title = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('# ')) {
          title = line.replace(/^#\s+/, '').trim();
          break;
        }
      }

      return {
        metadata: {
          title: title || 'Untitled Article',
          slug: generateSlug(title || 'untitled-article'),
          category: 'General',
          author: 'Admin',
          status: 'draft',
          tags: '',
          excerpt: ''
        },
        body: trimmed
      };
    }

    const match = trimmed.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*([\s\S]*)$/);
    if (!match) {
      return { metadata: {}, body: trimmed };
    }

    const frontmatterBlock = match[1];
    const body = match[2].trim();
    const metadata = {};

    frontmatterBlock.split(/\r?\n/).forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const key = line.slice(0, colonIndex).trim().toLowerCase();
        let val = line.slice(colonIndex + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        metadata[key] = val;
      }
    });

    if (!metadata.title) {
      metadata.title = 'Untitled Article';
    }
    if (!metadata.slug) {
      metadata.slug = generateSlug(metadata.title);
    }
    if (!metadata.category) {
      metadata.category = 'Cloud Architecture';
    }
    if (!metadata.author) {
      metadata.author = 'Admin';
    }
    if (!metadata.status) {
      metadata.status = 'draft';
    }

    return { metadata, body };
  }

  /**
   * Slugify a text string
   */
  function generateSlug(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Calculate reading time in minutes
   */
  function calculateReadTime(text) {
    const words = countWords(text);
    const minutes = Math.ceil(words / 200);
    return minutes < 1 ? 1 : minutes;
  }

  /**
   * Count words in a text
   */
  function countWords(text) {
    if (!text) return 0;
    const clean = text.replace(/<[^>]*>/g, ' ').replace(/[#*_~`>-]/g, ' ');
    const matches = clean.trim().match(/\b\w+\b/g);
    return matches ? matches.length : 0;
  }

  /**
   * Parse Markdown string to clean, secure HTML
   * @param {string} md 
   * @returns {string} HTML
   */
  function render(md) {
    if (!md) return '<p class="empty-content">No content provided.</p>';

    let content = md;
    if (content.trim().startsWith('---')) {
      const parts = content.trim().match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*([\s\S]*)$/);
      if (parts && parts[2]) {
        content = parts[2];
      }
    }

    // Normalize line endings
    content = content.replace(/\r\n/g, '\n');

    // 1. Extract Fenced Code Blocks first using safe alphanumeric tokens (no underscores or special chars)
    const codeBlocks = [];
    content = content.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, function (_, lang, code) {
      const token = `TOKENCODEBLOCK${codeBlocks.length}END`;
      const language = lang ? lang.trim() : 'code';
      const escapedCode = escapeHtml(code.trim());
      const blockHtml = `
<div class="code-block-container">
  <div class="code-block-header">
    <span class="code-lang-tag">${escapeHtml(language.toUpperCase())}</span>
    <button type="button" class="btn-copy-code" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(code.trim())}')).then(() => { this.innerText = 'Copied!'; setTimeout(() => this.innerText = 'Copy', 1800); })">Copy</button>
  </div>
  <pre><code class="language-${escapeHtml(language)}">${escapedCode}</code></pre>
</div>`;
      codeBlocks.push(blockHtml);
      return `\n\n${token}\n\n`;
    });

    // 2. Extract Inline Code using safe tokens
    const inlineCodes = [];
    content = content.replace(/`([^`\n]+)`/g, function (_, code) {
      const token = `TOKENINLINECODE${inlineCodes.length}END`;
      inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
      return token;
    });

    // 3. Markdown Tables
    content = content.replace(/((\|[^\n]+\|\n)((?:\|[^\n]+(?:\n|$))+))/g, function (match) {
      const lines = match.trim().split('\n');
      if (lines.length < 2) return match;

      const headerLine = lines[0];
      const separatorLine = lines[1];

      if (!/^\|?\s*:?-+:?\s*(\|?\s*:?-+:?\s*)+\|?$/.test(separatorLine)) {
        return match;
      }

      const parseCells = (line) => {
        let trimmed = line.trim();
        if (trimmed.startsWith('|')) trimmed = trimmed.substring(1);
        if (trimmed.endsWith('|')) trimmed = trimmed.substring(0, trimmed.length - 1);
        return trimmed.split('|').map(c => c.trim());
      };

      const headers = parseCells(headerLine);
      let thead = '<thead><tr>';
      headers.forEach(h => {
        thead += `<th>${inlineFormat(h)}</th>`;
      });
      thead += '</tr></thead>';

      let tbody = '<tbody>';
      for (let i = 2; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const row = parseCells(lines[i]);
        tbody += '<tr>';
        row.forEach(c => {
          tbody += `<td>${inlineFormat(c)}</td>`;
        });
        tbody += '</tr>';
      }
      tbody += '</tbody>';

      return `\n\n<div class="table-responsive"><table class="markdown-table">${thead}${tbody}</table></div>\n\n`;
    });

    // 4. Headings (ensure isolated block lines)
    content = content.replace(/^######\s+(.*)$/gm, '\n\n<h6>$1</h6>\n\n');
    content = content.replace(/^#####\s+(.*)$/gm, '\n\n<h5>$1</h5>\n\n');
    content = content.replace(/^####\s+(.*)$/gm, '\n\n<h4>$1</h4>\n\n');
    content = content.replace(/^###\s+(.*)$/gm, '\n\n<h3>$1</h3>\n\n');
    content = content.replace(/^##\s+(.*)$/gm, '\n\n<h2>$1</h2>\n\n');
    content = content.replace(/^#\s+(.*)$/gm, '\n\n<h1>$1</h1>\n\n');

    // 5. Horizontal Rule
    content = content.replace(/^(?:---|\*\*\*|___)\s*$/gm, '\n\n<hr class="markdown-divider" />\n\n');

    // 6. Blockquotes
    content = content.replace(/^>\s+(.*)$/gm, '<blockquote><p>$1</p></blockquote>');
    content = content.replace(/<\/blockquote>\s*<blockquote>/g, '\n');

    // 7. Task lists
    content = content.replace(/^-\s+\[ \]\s+(.*)$/gm, '<li class="task-list-item"><input type="checkbox" disabled /> $1</li>');
    content = content.replace(/^-\s+\[x\]\s+(.*)$/gm, '<li class="task-list-item"><input type="checkbox" checked disabled /> $1</li>');

    // 8. Unordered Lists
    content = content.replace(/^[\*\-\+]\s+(.*)$/gm, '<li>$1</li>');
    content = content.replace(/((?:<li.*?>.*?<\/li>\s*)+)/g, function (match) {
      if (match.includes('task-list-item')) {
        return `\n\n<ul class="task-list">\n${match.trim()}\n</ul>\n\n`;
      }
      return `\n\n<ul>\n${match.trim()}\n</ul>\n\n`;
    });

    // 9. Ordered Lists
    content = content.replace(/^\d+\.\s+(.*)$/gm, '<oli>$1</oli>');
    content = content.replace(/((?:<oli.*?>.*?<\/oli>\s*)+)/g, function (match) {
      const fixed = match.replace(/<oli>/g, '<li>').replace(/<\/oli>/g, '</li>');
      return `\n\n<ol>\n${fixed.trim()}\n</ol>\n\n`;
    });

    // 10. Inline formatting (bold, italic, links, images)
    content = inlineFormat(content);

    // 11. Wrap paragraphs
    const blocks = content.split(/\n\s*\n/);
    const htmlBlocks = blocks.map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';

      // Skip wrapping if already a block element or code token
      if (
        trimmed.startsWith('<h1') ||
        trimmed.startsWith('<h2') ||
        trimmed.startsWith('<h3') ||
        trimmed.startsWith('<h4') ||
        trimmed.startsWith('<h5') ||
        trimmed.startsWith('<h6') ||
        trimmed.startsWith('<hr') ||
        trimmed.startsWith('<blockquote>') ||
        trimmed.startsWith('<ul>') ||
        trimmed.startsWith('<ol>') ||
        trimmed.startsWith('<div class="table-responsive">') ||
        trimmed.startsWith('<div class="code-block-container">') ||
        trimmed.startsWith('TOKENCODEBLOCK')
      ) {
        return trimmed;
      }

      return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
    });

    let html = htmlBlocks.filter(Boolean).join('\n\n');

    // 12. Restore inline codes
    inlineCodes.forEach((codeHtml, idx) => {
      html = html.split(`TOKENINLINECODE${idx}END`).join(codeHtml);
    });

    // 13. Restore code blocks
    codeBlocks.forEach((blockHtml, idx) => {
      html = html.split(`TOKENCODEBLOCK${idx}END`).join(blockHtml);
    });

    return html;
  }

  /**
   * Format inline spans (bold, italic, links, images)
   */
  function inlineFormat(text) {
    if (!text) return '';

    // 1. Temporarily extract images and links so URLs with underscores/asterisks are protected
    const linkMap = [];
    let processed = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_, alt, url) {
      const idx = linkMap.length;
      linkMap.push(`<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" class="markdown-image" loading="lazy" />`);
      return `TOKENLINKIMG${idx}END`;
    });

    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, anchorText, url) {
      const idx = linkMap.length;
      linkMap.push(`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="markdown-link">${anchorText}</a>`);
      return `TOKENLINKIMG${idx}END`;
    });

    // 2. Bold + Italic ***text*** or ___text___
    processed = processed.replace(/\*\*\*([^\*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    processed = processed.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');

    // 3. Bold **text** or __text__
    processed = processed.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // 4. Italic *text* or _text_ (use word boundary for underscore to avoid variable names like my_var)
    processed = processed.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
    processed = processed.replace(/\b_([^_]+)_\b/g, '<em>$1</em>');

    // 5. Strikethrough ~~text~~
    processed = processed.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // 6. Restore protected links and images
    linkMap.forEach((tag, idx) => {
      processed = processed.split(`TOKENLINKIMG${idx}END`).join(tag);
    });

    return processed;
  }

  return {
    render,
    parseFrontmatter,
    generateSlug,
    calculateReadTime,
    countWords,
    escapeHtml
  };
})();

// Export for Node testing or browser window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarkdownParser;
}
