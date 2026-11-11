/**
 * CloudPublish - UI Rendering & Component Helpers
 * Modular presentation functions for tables, cards, preview, modals, and toasts.
 */

const UI = (function () {
  'use strict';

  /**
   * Format ISO date string into readable text (e.g., 'Nov 12, 2026')
   */
  function formatDate(isoString) {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  }

  /**
   * Format relative time (e.g. '2 hours ago', 'yesterday')
   */
  function formatRelativeTime(isoString) {
    if (!isoString) return '';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHr / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return formatDate(isoString);
    } catch {
      return '';
    }
  }

  /**
   * Get category color badge class
   */
  function getCategoryClass(category) {
    const cat = (category || '').toLowerCase();
    if (cat.includes('cloud') || cat.includes('arch')) return 'badge-cat-cloud';
    if (cat.includes('sec')) return 'badge-cat-security';
    if (cat.includes('devops') || cat.includes('ops')) return 'badge-cat-devops';
    if (cat.includes('front')) return 'badge-cat-frontend';
    if (cat.includes('back') || cat.includes('api')) return 'badge-cat-backend';
    return 'badge-cat-default';
  }

  /**
   * Render Dashboard KPI Stat Cards
   */
  function renderDashboardStats(stats) {
    const totalEl = document.getElementById('stat-total-articles');
    const publishedEl = document.getElementById('stat-published-articles');
    const draftsEl = document.getElementById('stat-draft-articles');
    const wordsEl = document.getElementById('stat-total-words');
    const rateEl = document.getElementById('stat-publish-rate');
    const rateBarEl = document.getElementById('stat-rate-bar');

    if (totalEl) totalEl.textContent = stats.total;
    if (publishedEl) publishedEl.textContent = stats.published;
    if (draftsEl) draftsEl.textContent = stats.drafts;
    if (wordsEl) wordsEl.textContent = stats.totalWords.toLocaleString();
    if (rateEl) rateEl.textContent = `${stats.publishRate}% Published`;
    if (rateBarEl) rateBarEl.style.width = `${stats.publishRate}%`;

    // Render Categories Breakdown Pill List
    const catListEl = document.getElementById('dashboard-categories-list');
    if (catListEl) {
      if (!stats.categories || stats.categories.length === 0) {
        catListEl.innerHTML = '<span class="text-muted">No categories recorded</span>';
      } else {
        catListEl.innerHTML = stats.categories.map(c => `
          <div class="category-breakdown-chip">
            <span class="cat-pill ${getCategoryClass(c.name)}">${MarkdownParser.escapeHtml(c.name)}</span>
            <span class="cat-count">${c.count}</span>
          </div>
        `).join('');
      }
    }
  }

  /**
   * Render Articles Table (All Content, Drafts, Published, or Dashboard Recent)
   */
  function renderArticlesTable(articles, containerEl, options = {}) {
    if (!containerEl) return;

    if (!articles || articles.length === 0) {
      const emptyMsg = options.emptyMessage || 'No articles found matching the current criteria.';
      containerEl.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
          <h3 class="empty-state-title">No Articles Here</h3>
          <p class="empty-state-text">${emptyMsg}</p>
          <div class="empty-state-actions">
            <a href="#/create" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Create New Article
            </a>
          </div>
        </div>
      `;
      return;
    }

    const rowsHtml = articles.map(article => {
      const isPublished = article.status === 'published';
      const statusBadge = isPublished
        ? `<span class="badge badge-published"><span class="badge-dot"></span>Published</span>`
        : `<span class="badge badge-draft"><span class="badge-dot"></span>Draft</span>`;

      const publishBtnTitle = isPublished ? 'Revert to Draft' : 'Publish Article';
      const publishBtnClass = isPublished ? 'btn-outline-warning' : 'btn-outline-success';
      const publishIcon = isPublished
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;

      const displayDate = isPublished 
        ? (article.publishedAt ? formatDate(article.publishedAt) : formatDate(article.createdAt))
        : formatDate(article.updatedAt || article.createdAt);

      const displayDateLabel = isPublished ? 'Published' : 'Updated';

      return `
        <tr data-article-id="${article.id}">
          <td class="col-article">
            <div class="article-info">
              <a href="#/preview?id=${article.id}" class="article-title-link" title="Preview article">${MarkdownParser.escapeHtml(article.title)}</a>
              <div class="article-meta-line">
                <span class="article-slug">/${MarkdownParser.escapeHtml(article.slug)}</span>
                <span class="article-read-time">• ${article.readTime || 1} min read</span>
              </div>
            </div>
          </td>
          <td class="col-category">
            <span class="cat-pill ${getCategoryClass(article.category)}">${MarkdownParser.escapeHtml(article.category || 'General')}</span>
          </td>
          <td class="col-author">
            <div class="author-cell">
              <div class="author-avatar">${(article.author || 'A').charAt(0).toUpperCase()}</div>
              <span class="author-name">${MarkdownParser.escapeHtml(article.author || 'Admin')}</span>
            </div>
          </td>
          <td class="col-status">
            ${statusBadge}
          </td>
          <td class="col-date">
            <span class="date-primary">${displayDate}</span>
            <span class="date-secondary">${displayDateLabel}</span>
          </td>
          <td class="col-actions">
            <div class="action-buttons-group">
              <button 
                type="button" 
                class="btn-icon ${publishBtnClass}" 
                data-action="toggle-publish" 
                data-id="${article.id}" 
                title="${publishBtnTitle}">
                ${publishIcon}
                <span class="btn-text">${isPublished ? 'Unpublish' : 'Publish'}</span>
              </button>

              <a href="#/preview?id=${article.id}" class="btn-icon btn-ghost" title="Preview Article">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </a>

              <a href="#/create?id=${article.id}" class="btn-icon btn-ghost" title="Edit Article">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </a>

              <button 
                type="button" 
                class="btn-icon btn-ghost btn-danger-hover" 
                data-action="delete-article" 
                data-id="${article.id}" 
                title="Delete Article">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    containerEl.innerHTML = `
      <div class="table-responsive">
        <table class="cms-table">
          <thead>
            <tr>
              <th class="col-article">Article</th>
              <th class="col-category">Category</th>
              <th class="col-author">Author</th>
              <th class="col-status">Status</th>
              <th class="col-date">Date</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render Content Preview page
   */
  function renderArticlePreview(article, containerEl) {
    if (!containerEl) return;

    if (!article) {
      containerEl.innerHTML = `
        <div class="empty-state-card">
          <h3>Article Not Found</h3>
          <p class="text-muted">The requested article could not be located or may have been deleted.</p>
          <a href="#/all-content" class="btn btn-primary">Return to All Content</a>
        </div>
      `;
      return;
    }

    const isPublished = article.status === 'published';
    const statusBadge = isPublished
      ? `<span class="badge badge-published"><span class="badge-dot"></span>Published</span>`
      : `<span class="badge badge-draft"><span class="badge-dot"></span>Draft</span>`;

    const renderedHtml = MarkdownParser.render(article.content || '');
    const wordCount = MarkdownParser.countWords(article.content || '');
    const tagsList = (article.tags || []).map(tag => `<span class="article-tag">#${MarkdownParser.escapeHtml(tag)}</span>`).join(' ');

    containerEl.innerHTML = `
      <div class="preview-header-card">
        <div class="preview-nav-bar">
          <a href="#/all-content" class="btn btn-secondary btn-sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back to Articles
          </a>
          
          <div class="preview-actions">
            <button 
              type="button" 
              class="btn ${isPublished ? 'btn-outline-warning' : 'btn-success'}" 
              id="preview-toggle-publish-btn"
              data-id="${article.id}">
              ${isPublished 
                ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line></svg> Switch to Draft' 
                : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Publish Article'}
            </button>

            <a href="#/create?id=${article.id}" class="btn btn-primary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Edit Content
            </a>
          </div>
        </div>

        <div class="preview-metadata-banner">
          <div class="preview-meta-top">
            <span class="cat-pill ${getCategoryClass(article.category)}">${MarkdownParser.escapeHtml(article.category || 'General')}</span>
            ${statusBadge}
            <span class="meta-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${article.readTime || 1} min read</span>
            <span class="meta-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg> ${wordCount} words</span>
          </div>

          <h1 class="preview-title">${MarkdownParser.escapeHtml(article.title)}</h1>

          <div class="preview-slug-box">
            <span class="slug-label">Endpoint:</span>
            <code class="slug-code">GET /api/v1/content/${MarkdownParser.escapeHtml(article.slug)}</code>
            <button type="button" class="btn-copy-slug" onclick="navigator.clipboard.writeText('/api/v1/content/${MarkdownParser.escapeHtml(article.slug)}').then(() => UI.showToast('API path copied to clipboard!'))">Copy</button>
          </div>

          ${article.excerpt ? `<p class="preview-excerpt">${MarkdownParser.escapeHtml(article.excerpt)}</p>` : ''}

          <div class="preview-author-bar">
            <div class="author-cell">
              <div class="author-avatar author-avatar-lg">${(article.author || 'A').charAt(0).toUpperCase()}</div>
              <div>
                <div class="author-name font-semibold">${MarkdownParser.escapeHtml(article.author || 'Admin')}</div>
                <div class="text-muted text-xs">Author & Content Contributor</div>
              </div>
            </div>
            <div class="preview-dates text-xs text-muted">
              <div>Created: ${formatDate(article.createdAt)}</div>
              <div>Last Updated: ${formatDate(article.updatedAt)}</div>
              ${article.publishedAt ? `<div>Published: ${formatDate(article.publishedAt)}</div>` : ''}
            </div>
          </div>

          ${tagsList ? `<div class="preview-tags-row">${tagsList}</div>` : ''}
        </div>
      </div>

      <div class="preview-content-card">
        <div class="preview-view-toggle">
          <button type="button" class="preview-tab active" id="btn-tab-rendered" onclick="UI.togglePreviewMode('rendered')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20"></path><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"></path><path d="M4 6h16a2 2 0 0 1 2 2v4H2V8a2 2 0 0 1 2-2z"></path></svg>
            Rendered Article
          </button>
          <button type="button" class="preview-tab" id="btn-tab-raw" onclick="UI.togglePreviewMode('raw')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            Raw Markdown
          </button>
        </div>

        <div class="preview-body markdown-rendered" id="preview-body-rendered">
          ${renderedHtml}
        </div>

        <div class="preview-body-raw hidden" id="preview-body-raw">
          <pre><code>${MarkdownParser.escapeHtml(article.content || '')}</code></pre>
        </div>
      </div>
    `;
  }

  /**
   * Switch between rendered and raw markdown views in preview
   */
  function togglePreviewMode(mode) {
    const renderedBody = document.getElementById('preview-body-rendered');
    const rawBody = document.getElementById('preview-body-raw');
    const tabRendered = document.getElementById('btn-tab-rendered');
    const tabRaw = document.getElementById('btn-tab-raw');

    if (!renderedBody || !rawBody) return;

    if (mode === 'raw') {
      renderedBody.classList.add('hidden');
      rawBody.classList.remove('hidden');
      tabRendered?.classList.remove('active');
      tabRaw?.classList.add('active');
    } else {
      renderedBody.classList.remove('hidden');
      rawBody.classList.add('hidden');
      tabRendered?.classList.add('active');
      tabRaw?.classList.remove('active');
    }
  }

  /**
   * Update sidebar badge counters for Drafts and Published
   */
  function updateSidebarBadges(stats) {
    const draftsBadge = document.getElementById('sidebar-badge-drafts');
    const publishedBadge = document.getElementById('sidebar-badge-published');

    if (draftsBadge) {
      draftsBadge.textContent = stats.drafts;
      draftsBadge.style.display = stats.drafts > 0 ? 'inline-flex' : 'none';
    }
    if (publishedBadge) {
      publishedBadge.textContent = stats.published;
      publishedBadge.style.display = stats.published > 0 ? 'inline-flex' : 'none';
    }
  }

  /**
   * Show Toast Notification
   */
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-card toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-message">${MarkdownParser.escapeHtml(message)}</div>
      <button type="button" class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    // Auto remove after 3.5s
    setTimeout(() => {
      toast.classList.add('toast-fadeout');
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, 300);
    }, 3500);
  }

  /**
   * Confirmation Dialog Modal
   */
  function showConfirmModal({ title, message, confirmText = 'Confirm', confirmClass = 'btn-danger', onConfirm }) {
    const modalEl = document.getElementById('confirm-modal');
    if (!modalEl) return;

    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const btnConfirm = document.getElementById('confirm-modal-btn');
    const btnCancel = document.getElementById('confirm-modal-cancel');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (btnConfirm) {
      btnConfirm.textContent = confirmText;
      btnConfirm.className = `btn ${confirmClass}`;
      
      // Clean previous onclick
      btnConfirm.onclick = () => {
        modalEl.classList.remove('modal-open');
        if (typeof onConfirm === 'function') onConfirm();
      };
    }

    if (btnCancel) {
      btnCancel.onclick = () => {
        modalEl.classList.remove('modal-open');
      };
    }

    modalEl.classList.add('modal-open');
  }

  return {
    formatDate,
    formatRelativeTime,
    getCategoryClass,
    renderDashboardStats,
    renderArticlesTable,
    renderArticlePreview,
    togglePreviewMode,
    updateSidebarBadges,
    showToast,
    showConfirmModal
  };
})();

// Export for Node testing or browser window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UI;
}

