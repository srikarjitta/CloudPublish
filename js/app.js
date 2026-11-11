/**
 * CloudPublish - Main Application Controller
 * Handles SPA hash routing, form management, file uploads, search & filtering, and global events.
 */

(function () {
  'use strict';

  // Current view and filter state
  const state = {
    currentRoute: 'dashboard',
    routeParamId: null,
    editingArticleId: null,
    searchQuery: '',
    selectedCategory: 'all',
    sortBy: 'newest',
    // Staged uploaded file in upload modal
    uploadedArticleData: null
  };

  /**
   * Router: Parse window.location.hash and display appropriate view
   */
  function handleRoute() {
    const hash = window.location.hash || '#/dashboard';
    const cleanHash = hash.startsWith('#/') ? hash.slice(2) : hash.slice(1);
    const [path, queryString] = cleanHash.split('?');
    const params = new URLSearchParams(queryString || '');

    state.currentRoute = path || 'dashboard';
    state.routeParamId = params.get('id') || null;

    // Normalize route aliases
    if (state.currentRoute === 'edit') {
      state.currentRoute = 'create';
    }

    // Reset search query and category filters on view switch so views aren't masked by ghost filters
    state.searchQuery = '';
    state.selectedCategory = 'all';
    document.querySelectorAll('.cms-search-input').forEach(i => { i.value = ''; });
    document.querySelectorAll('.category-filter-select').forEach(s => { s.value = 'all'; });

    // Update active nav links in sidebar
    updateNavigationUI();

    // Route views
    hideAllViews();

    switch (state.currentRoute) {
      case 'dashboard':
        loadDashboardView();
        break;
      case 'all-content':
        loadAllContentView();
        break;
      case 'drafts':
        loadDraftsView();
        break;
      case 'published':
        loadPublishedView();
        break;
      case 'create':
        loadCreateView(state.routeParamId);
        break;
      case 'preview':
        loadPreviewView(state.routeParamId);
        break;
      default:
        // Default to dashboard if unknown route
        window.location.hash = '#/dashboard';
        break;
    }

    // Refresh sidebar count badges
    const stats = StorageService.getStatistics();
    UI.updateSidebarBadges(stats);

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Hide all page views
   */
  function hideAllViews() {
    const views = document.querySelectorAll('.page-view');
    views.forEach(v => v.classList.remove('active-view'));
  }

  /**
   * Show a specific view container
   */
  function showView(viewId) {
    const el = document.getElementById(viewId);
    if (el) {
      el.classList.add('active-view');
    }
  }

  /**
   * Update active nav link classes
   */
  function updateNavigationUI() {
    const navLinks = document.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
      const targetRoute = link.getAttribute('data-route');
      if (targetRoute === state.currentRoute) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update Topbar Title / Breadcrumb
    const pageTitleEl = document.getElementById('topbar-page-title');
    if (pageTitleEl) {
      const titles = {
        'dashboard': 'Dashboard Overview',
        'all-content': 'All Content',
        'drafts': 'Draft Articles',
        'published': 'Published Articles',
        'create': state.routeParamId ? 'Edit Article' : 'Create Article',
        'preview': 'Article Preview'
      };
      pageTitleEl.textContent = titles[state.currentRoute] || 'CloudPublish';
    }
  }

  /* =========================================================================
     VIEW LOADERS
     ========================================================================= */

  /**
   * View: Dashboard
   */
  function loadDashboardView() {
    showView('view-dashboard');
    const stats = StorageService.getStatistics();
    UI.renderDashboardStats(stats);

    // Render Recent Articles table
    const recentContainer = document.getElementById('dashboard-recent-articles');
    UI.renderArticlesTable(stats.recent, recentContainer, {
      emptyMessage: 'No articles created yet. Get started by publishing your first article.'
    });
  }

  /**
   * View: All Content
   */
  function loadAllContentView() {
    showView('view-all-content');
    refreshContentTable('all-content-container', { filterStatus: null });
  }

  /**
   * View: Drafts
   */
  function loadDraftsView() {
    showView('view-drafts');
    refreshContentTable('drafts-content-container', { filterStatus: 'draft' });
  }

  /**
   * View: Published
   */
  function loadPublishedView() {
    showView('view-published');
    refreshContentTable('published-content-container', { filterStatus: 'published' });
  }

  /**
   * View: Create / Edit Article
   */
  function loadCreateView(articleId) {
    showView('view-create');
    state.editingArticleId = articleId || null;

    const form = document.getElementById('article-form');
    const headerTitle = document.getElementById('editor-view-title');
    const publishBtn = document.getElementById('btn-editor-publish');

    if (!form) return;

    if (state.editingArticleId) {
      const article = StorageService.getById(state.editingArticleId);
      if (article) {
        if (headerTitle) headerTitle.textContent = 'Edit Markdown Article';
        document.getElementById('input-article-title').value = article.title || '';
        document.getElementById('input-article-slug').value = article.slug || '';
        document.getElementById('input-article-category').value = article.category || 'Cloud Architecture';
        document.getElementById('input-article-author').value = article.author || 'Admin';
        document.getElementById('input-article-tags').value = (article.tags || []).join(', ');
        document.getElementById('input-article-excerpt').value = article.excerpt || '';
        document.getElementById('input-article-content').value = article.content || '';
        
        if (publishBtn) {
          publishBtn.innerHTML = article.status === 'published' 
            ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Update & Publish'
            : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Publish Now';
        }
      } else {
        UI.showToast('Article not found for editing', 'error');
        resetEditorForm();
      }
    } else {
      if (headerTitle) headerTitle.textContent = 'Create Markdown Article';
      if (publishBtn) {
        publishBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Publish Article';
      }
      resetEditorForm();
    }

    updateEditorMetricsAndPreview();
  }

  /**
   * View: Content Preview
   */
  function loadPreviewView(articleId) {
    showView('view-preview');
    const container = document.getElementById('preview-view-container');
    const article = articleId ? StorageService.getById(articleId) : null;

    if (!article) {
      // If no id provided, pick the first published article or latest article
      const all = StorageService.getAll();
      if (all.length > 0) {
        window.location.hash = `#/preview?id=${all[0].id}`;
        return;
      }
    }

    UI.renderArticlePreview(article, container);
  }

  /* =========================================================================
     TABLE FILTERING & SEARCH
     ========================================================================= */

  /**
   * Filter, search and render articles in a given container
   */
  function refreshContentTable(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let articles = StorageService.getAll();

    // 1. Filter by Status (Drafts vs Published vs All)
    if (options.filterStatus) {
      articles = articles.filter(a => a.status === options.filterStatus);
    }

    // 2. Filter by Category
    if (state.selectedCategory && state.selectedCategory !== 'all') {
      articles = articles.filter(a => (a.category || '').toLowerCase() === state.selectedCategory.toLowerCase());
    }

    // 3. Search query filter
    if (state.searchQuery && state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      articles = articles.filter(a => {
        const titleMatch = (a.title || '').toLowerCase().includes(q);
        const slugMatch = (a.slug || '').toLowerCase().includes(q);
        const authorMatch = (a.author || '').toLowerCase().includes(q);
        const categoryMatch = (a.category || '').toLowerCase().includes(q);
        const contentMatch = (a.content || '').toLowerCase().includes(q);
        const tagsMatch = (a.tags || []).some(t => t.toLowerCase().includes(q));
        return titleMatch || slugMatch || authorMatch || categoryMatch || contentMatch || tagsMatch;
      });
    }

    // 4. Sort
    if (state.sortBy === 'oldest') {
      articles.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (state.sortBy === 'title-asc') {
      articles.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (state.sortBy === 'read-time') {
      articles.sort((a, b) => (b.readTime || 1) - (a.readTime || 1));
    } else {
      // Default: newest updated
      articles.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    }

    // Render table
    UI.renderArticlesTable(articles, container, {
      emptyMessage: options.filterStatus 
        ? `No ${options.filterStatus} articles found.` 
        : 'No articles match your search or filter criteria.'
    });

    // Populate category filter options if select element exists
    populateCategoryDropdowns();
  }

  /**
   * Populate Category Dropdown filters
   */
  function populateCategoryDropdowns() {
    const stats = StorageService.getStatistics();
    const dropdowns = document.querySelectorAll('.category-filter-select');

    dropdowns.forEach(select => {
      const currentVal = select.value || 'all';
      let optionsHtml = '<option value="all">All Categories</option>';
      stats.categories.forEach(c => {
        optionsHtml += `<option value="${MarkdownParser.escapeHtml(c.name)}">${MarkdownParser.escapeHtml(c.name)} (${c.count})</option>`;
      });
      select.innerHTML = optionsHtml;
      select.value = currentVal;
    });
  }

  /* =========================================================================
     MARKDOWN EDITOR & FORM HANDLING
     ========================================================================= */

  /**
   * Reset editor fields to default
   */
  function resetEditorForm() {
    state.editingArticleId = null;
    const form = document.getElementById('article-form');
    if (form) form.reset();

    const titleInput = document.getElementById('input-article-title');
    const slugInput = document.getElementById('input-article-slug');
    const contentInput = document.getElementById('input-article-content');

    if (titleInput) titleInput.value = '';
    if (slugInput) slugInput.value = '';
    if (contentInput) contentInput.value = '';

    updateEditorMetricsAndPreview();
  }

  /**
   * Update live metrics (words, read time) and live markdown preview
   */
  function updateEditorMetricsAndPreview() {
    const contentInput = document.getElementById('input-article-content');
    const previewEl = document.getElementById('editor-live-preview');
    const wordCountEl = document.getElementById('editor-word-count');
    const readTimeEl = document.getElementById('editor-read-time');

    const content = contentInput ? contentInput.value : '';
    const words = MarkdownParser.countWords(content);
    const readTime = MarkdownParser.calculateReadTime(content);

    if (wordCountEl) wordCountEl.textContent = `${words} words`;
    if (readTimeEl) readTimeEl.textContent = `${readTime} min read`;

    if (previewEl) {
      if (!content.trim()) {
        previewEl.innerHTML = '<div class="preview-placeholder"><p>Live preview will appear here as you write Markdown...</p></div>';
      } else {
        previewEl.innerHTML = MarkdownParser.render(content);
      }
    }
  }

  /**
   * Insert markdown syntax at editor cursor position
   */
  function insertMarkdownSnippet(prefix, suffix = '', placeholder = '') {
    const textarea = document.getElementById('input-article-content');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end) || placeholder;

    const replacement = prefix + selected + suffix;
    textarea.setRangeText(replacement, start, end, 'select');

    textarea.focus();
    updateEditorMetricsAndPreview();
  }

  /**
   * Handle Editor Form Submission
   */
  function handleArticleSubmit(statusToSet) {
    const title = document.getElementById('input-article-title')?.value.trim();
    const slug = document.getElementById('input-article-slug')?.value.trim();
    const category = document.getElementById('input-article-category')?.value.trim() || 'General';
    const author = document.getElementById('input-article-author')?.value.trim() || 'Admin';
    const tags = document.getElementById('input-article-tags')?.value.trim() || '';
    const excerpt = document.getElementById('input-article-excerpt')?.value.trim() || '';
    const content = document.getElementById('input-article-content')?.value || '';

    if (!title) {
      UI.showToast('Please enter an article title', 'warning');
      document.getElementById('input-article-title')?.focus();
      return;
    }

    const payload = {
      title,
      slug: slug || MarkdownParser.generateSlug(title),
      category,
      author,
      tags,
      excerpt,
      content,
      status: statusToSet
    };

    if (state.editingArticleId) {
      const updated = StorageService.update(state.editingArticleId, payload);
      if (updated) {
        UI.showToast(`Article "${updated.title}" successfully updated!`, 'success');
        const targetHash = `#/preview?id=${updated.id}`;
        if (window.location.hash === targetHash) {
          handleRoute();
        } else {
          window.location.hash = targetHash;
        }
      } else {
        UI.showToast('Failed to update article', 'error');
      }
    } else {
      const created = StorageService.create(payload);
      UI.showToast(`Article "${created.title}" successfully ${statusToSet === 'published' ? 'published' : 'saved as draft'}!`, 'success');
      const targetHash = `#/preview?id=${created.id}`;
      if (window.location.hash === targetHash) {
        handleRoute();
      } else {
        window.location.hash = targetHash;
      }
    }
  }

  /**
   * Handle .md File Upload in Editor
   */
  function handleMarkdownFileUpload(file) {
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.md') && !lowerName.endsWith('.markdown') && file.type !== 'text/markdown' && file.type !== 'text/plain') {
      UI.showToast('Please select a valid Markdown (.md) file.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const text = e.target.result;
      const parsed = MarkdownParser.parseFrontmatter(text);

      document.getElementById('input-article-title').value = parsed.metadata.title || file.name.replace(/\.md$/i, '');
      document.getElementById('input-article-slug').value = parsed.metadata.slug || MarkdownParser.generateSlug(parsed.metadata.title || file.name);
      
      if (parsed.metadata.category) {
        document.getElementById('input-article-category').value = parsed.metadata.category;
      }
      if (parsed.metadata.author) {
        document.getElementById('input-article-author').value = parsed.metadata.author;
      }
      if (parsed.metadata.tags) {
        document.getElementById('input-article-tags').value = Array.isArray(parsed.metadata.tags) ? parsed.metadata.tags.join(', ') : parsed.metadata.tags;
      }
      if (parsed.metadata.excerpt) {
        document.getElementById('input-article-excerpt').value = parsed.metadata.excerpt;
      }

      document.getElementById('input-article-content').value = parsed.body || '';

      updateEditorMetricsAndPreview();
      UI.showToast(`Imported "${file.name}" with frontmatter!`, 'success');
    };

    reader.onerror = function () {
      UI.showToast('Failed to read the file.', 'error');
    };

    reader.readAsText(file);
  }

  /* =========================================================================
     GLOBAL UPLOAD MODAL
     ========================================================================= */

  function openUploadModal() {
    const modal = document.getElementById('upload-md-modal');
    if (!modal) return;
    state.uploadedArticleData = null;

    // Reset upload modal views
    document.getElementById('modal-upload-dropzone')?.classList.remove('hidden');
    document.getElementById('modal-upload-preview')?.classList.add('hidden');
    const fileInput = document.getElementById('modal-file-input');
    if (fileInput) fileInput.value = '';

    modal.classList.add('modal-open');
  }

  function closeUploadModal() {
    const modal = document.getElementById('upload-md-modal');
    if (modal) modal.classList.remove('modal-open');
    state.uploadedArticleData = null;
  }

  function handleModalFileSelect(file) {
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.md') && !lowerName.endsWith('.markdown') && file.type !== 'text/markdown' && file.type !== 'text/plain') {
      UI.showToast('Please select a valid Markdown (.md) file.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const rawText = e.target.result;
      const parsed = MarkdownParser.parseFrontmatter(rawText);

      state.uploadedArticleData = {
        title: parsed.metadata.title || file.name.replace(/\.md$/i, ''),
        slug: parsed.metadata.slug || MarkdownParser.generateSlug(parsed.metadata.title || file.name),
        category: parsed.metadata.category || 'General',
        author: parsed.metadata.author || 'Admin',
        tags: parsed.metadata.tags || '',
        excerpt: parsed.metadata.excerpt || '',
        content: parsed.body || ''
      };

      // Show preview inside modal
      document.getElementById('modal-upload-dropzone')?.classList.add('hidden');
      const previewCard = document.getElementById('modal-upload-preview');
      if (previewCard) {
        previewCard.classList.remove('hidden');
        document.getElementById('modal-parsed-title').textContent = state.uploadedArticleData.title;
        document.getElementById('modal-parsed-meta').textContent = `${state.uploadedArticleData.category} • ${state.uploadedArticleData.author} • ${MarkdownParser.countWords(state.uploadedArticleData.content)} words`;
        document.getElementById('modal-parsed-excerpt').textContent = state.uploadedArticleData.excerpt || state.uploadedArticleData.content.substring(0, 180) + '...';
      }
    };

    reader.onerror = function () {
      UI.showToast('Failed to read the file.', 'error');
    };

    reader.readAsText(file);
  }

  /* =========================================================================
     GLOBAL EVENT LISTENERS
     ========================================================================= */

  function initEventListeners() {
    // 1. Hash Routing
    window.addEventListener('hashchange', handleRoute);

    // 2. Mobile Sidebar Toggle
    const mobileMenuBtn = document.getElementById('btn-mobile-menu');
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (mobileMenuBtn && sidebar) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('sidebar-mobile-open');
        overlay?.classList.toggle('active');
      });
    }

    if (overlay && sidebar) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('sidebar-mobile-open');
        overlay.classList.remove('active');
      });
    }

    // 3. Global Delegated Clicks for Table & Preview Actions (Publish/Unpublish, Delete)
    document.addEventListener('click', function (e) {
      // Toggle publish button in tables or preview view
      const publishBtn = e.target.closest('[data-action="toggle-publish"], #preview-toggle-publish-btn');
      if (publishBtn) {
        e.preventDefault();
        const articleId = publishBtn.getAttribute('data-id');
        const updated = StorageService.togglePublish(articleId);
        if (updated) {
          const statusText = updated.status === 'published' ? 'published' : 'reverted to draft';
          UI.showToast(`Article "${updated.title}" ${statusText}!`);
          if (state.currentRoute === 'preview') {
            loadPreviewView(updated.id);
            UI.updateSidebarBadges(StorageService.getStatistics());
          } else {
            handleRoute(); // re-render current view
          }
        }
        return;
      }

      // Delete article button
      const deleteBtn = e.target.closest('[data-action="delete-article"]');
      if (deleteBtn) {
        e.preventDefault();
        const articleId = deleteBtn.getAttribute('data-id');
        const article = StorageService.getById(articleId);
        if (!article) return;

        UI.showConfirmModal({
          title: 'Delete Article?',
          message: `Are you sure you want to delete "${article.title}"? This action cannot be undone.`,
          confirmText: 'Yes, Delete',
          confirmClass: 'btn-danger',
          onConfirm: () => {
            StorageService.remove(articleId);
            UI.showToast(`Article "${article.title}" deleted.`);
            handleRoute();
          }
        });
        return;
      }
    });

    // 4. Editor Title Auto-generate Slug
    const titleInput = document.getElementById('input-article-title');
    const slugInput = document.getElementById('input-article-slug');
    if (titleInput && slugInput) {
      titleInput.addEventListener('input', () => {
        // Only auto-update slug if user hasn't heavily modified slug manually
        if (!state.editingArticleId) {
          slugInput.value = MarkdownParser.generateSlug(titleInput.value);
        }
      });
    }

    // 5. Editor Live Content Input
    const contentInput = document.getElementById('input-article-content');
    if (contentInput) {
      contentInput.addEventListener('input', updateEditorMetricsAndPreview);
    }

    // 6. Editor Toolbar Actions
    const toolbar = document.getElementById('editor-toolbar');
    if (toolbar) {
      toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-format]');
        if (!btn) return;

        e.preventDefault();
        const format = btn.getAttribute('data-format');

        switch (format) {
          case 'bold':
            insertMarkdownSnippet('**', '**', 'bold text');
            break;
          case 'italic':
            insertMarkdownSnippet('*', '*', 'italic text');
            break;
          case 'strike':
            insertMarkdownSnippet('~~', '~~', 'strikethrough');
            break;
          case 'h1':
            insertMarkdownSnippet('# ', '\n', 'Heading 1');
            break;
          case 'h2':
            insertMarkdownSnippet('## ', '\n', 'Heading 2');
            break;
          case 'h3':
            insertMarkdownSnippet('### ', '\n', 'Heading 3');
            break;
          case 'quote':
            insertMarkdownSnippet('> ', '\n', 'Important note or quote');
            break;
          case 'code':
            insertMarkdownSnippet('`', '`', 'code');
            break;
          case 'codeblock':
            insertMarkdownSnippet('```javascript\n', '\n```\n', '// write code here');
            break;
          case 'link':
            insertMarkdownSnippet('[', '](https://example.com)', 'link text');
            break;
          case 'image':
            insertMarkdownSnippet('![', '](https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800)', 'Image description');
            break;
          case 'ul':
            insertMarkdownSnippet('- ', '\n', 'List item');
            break;
          case 'ol':
            insertMarkdownSnippet('1. ', '\n', 'Numbered step');
            break;
          case 'table':
            insertMarkdownSnippet('\n| Header 1 | Header 2 | Header 3 |\n| :--- | :--- | :--- |\n| Value 1 | Value 2 | Value 3 |\n', '', '');
            break;
          case 'hr':
            insertMarkdownSnippet('\n---\n', '', '');
            break;
        }
      });
    }

    // 7. Editor Drag & Drop .md File onto Form
    const editorDropzone = document.getElementById('editor-dropzone');
    const editorFileInput = document.getElementById('editor-file-input');

    if (editorDropzone && editorFileInput) {
      editorDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        editorDropzone.classList.add('drag-over');
      });

      editorDropzone.addEventListener('dragleave', () => {
        editorDropzone.classList.remove('drag-over');
      });

      editorDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        editorDropzone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
          handleMarkdownFileUpload(e.dataTransfer.files[0]);
        }
      });

      editorFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          handleMarkdownFileUpload(e.target.files[0]);
        }
      });
    }

    // 8. Editor Action Buttons (Save Draft vs Publish)
    const btnSaveDraft = document.getElementById('btn-editor-draft');
    const btnPublish = document.getElementById('btn-editor-publish');

    if (btnSaveDraft) {
      btnSaveDraft.addEventListener('click', (e) => {
        e.preventDefault();
        handleArticleSubmit('draft');
      });
    }

    if (btnPublish) {
      btnPublish.addEventListener('click', (e) => {
        e.preventDefault();
        handleArticleSubmit('published');
      });
    }

    // 9. Editor Split Mode / Preview Toggle
    const btnToggleSplit = document.getElementById('btn-toggle-editor-split');
    const editorGrid = document.getElementById('editor-main-grid');
    if (btnToggleSplit && editorGrid) {
      btnToggleSplit.addEventListener('click', () => {
        editorGrid.classList.toggle('editor-split-collapsed');
        const isCollapsed = editorGrid.classList.contains('editor-split-collapsed');
        btnToggleSplit.classList.toggle('active', !isCollapsed);
      });
    }

    // 10. Search & Filter Inputs
    const searchInputs = document.querySelectorAll('.cms-search-input');
    searchInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (state.currentRoute === 'all-content') {
          refreshContentTable('all-content-container');
        } else if (state.currentRoute === 'drafts') {
          refreshContentTable('drafts-content-container', { filterStatus: 'draft' });
        } else if (state.currentRoute === 'published') {
          refreshContentTable('published-content-container', { filterStatus: 'published' });
        }
      });
    });

    // Category filter dropdowns
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('category-filter-select')) {
        state.selectedCategory = e.target.value;
        if (state.currentRoute === 'all-content') {
          refreshContentTable('all-content-container');
        } else if (state.currentRoute === 'drafts') {
          refreshContentTable('drafts-content-container', { filterStatus: 'draft' });
        } else if (state.currentRoute === 'published') {
          refreshContentTable('published-content-container', { filterStatus: 'published' });
        }
      }

      if (e.target.classList.contains('sort-filter-select')) {
        state.sortBy = e.target.value;
        if (state.currentRoute === 'all-content') {
          refreshContentTable('all-content-container');
        } else if (state.currentRoute === 'drafts') {
          refreshContentTable('drafts-content-container', { filterStatus: 'draft' });
        } else if (state.currentRoute === 'published') {
          refreshContentTable('published-content-container', { filterStatus: 'published' });
        }
      }
    });

    // 11. Global Upload Modal Events
    const btnOpenUpload = document.getElementById('btn-open-upload-modal');
    const btnCloseUpload = document.getElementById('btn-close-upload-modal');
    const modalDropzone = document.getElementById('modal-upload-dropzone');
    const modalFileInput = document.getElementById('modal-file-input');

    if (btnOpenUpload) {
      btnOpenUpload.addEventListener('click', openUploadModal);
    }
    if (btnCloseUpload) {
      btnCloseUpload.addEventListener('click', closeUploadModal);
    }

    if (modalDropzone && modalFileInput) {
      modalDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        modalDropzone.classList.add('drag-over');
      });

      modalDropzone.addEventListener('dragleave', () => {
        modalDropzone.classList.remove('drag-over');
      });

      modalDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        modalDropzone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
          handleModalFileSelect(e.dataTransfer.files[0]);
        }
      });

      modalFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          handleModalFileSelect(e.target.files[0]);
        }
      });
    }

    // Modal Actions on parsed file
    const btnModalSaveDraft = document.getElementById('btn-modal-save-draft');
    const btnModalPublishNow = document.getElementById('btn-modal-publish-now');
    const btnModalOpenEditor = document.getElementById('btn-modal-open-editor');

    if (btnModalSaveDraft) {
      btnModalSaveDraft.addEventListener('click', () => {
        if (!state.uploadedArticleData) {
          UI.showToast('Please select or drop a Markdown file first.', 'warning');
          return;
        }
        state.uploadedArticleData.status = 'draft';
        const created = StorageService.create(state.uploadedArticleData);
        closeUploadModal();
        UI.showToast(`Imported "${created.title}" as Draft!`, 'success');
        const targetHash = `#/preview?id=${created.id}`;
        if (window.location.hash === targetHash) {
          handleRoute();
        } else {
          window.location.hash = targetHash;
        }
      });
    }

    if (btnModalPublishNow) {
      btnModalPublishNow.addEventListener('click', () => {
        if (!state.uploadedArticleData) {
          UI.showToast('Please select or drop a Markdown file first.', 'warning');
          return;
        }
        state.uploadedArticleData.status = 'published';
        const created = StorageService.create(state.uploadedArticleData);
        closeUploadModal();
        UI.showToast(`Imported and published "${created.title}"!`, 'success');
        const targetHash = `#/preview?id=${created.id}`;
        if (window.location.hash === targetHash) {
          handleRoute();
        } else {
          window.location.hash = targetHash;
        }
      });
    }

    if (btnModalOpenEditor) {
      btnModalOpenEditor.addEventListener('click', () => {
        if (!state.uploadedArticleData) {
          UI.showToast('Please select or drop a Markdown file first.', 'warning');
          return;
        }
        const data = state.uploadedArticleData;
        closeUploadModal();
        window.location.hash = '#/create';
        setTimeout(() => {
          document.getElementById('input-article-title').value = data.title;
          document.getElementById('input-article-slug').value = data.slug;
          document.getElementById('input-article-category').value = data.category;
          document.getElementById('input-article-author').value = data.author;
          document.getElementById('input-article-tags').value = Array.isArray(data.tags) ? data.tags.join(', ') : data.tags;
          document.getElementById('input-article-excerpt').value = data.excerpt;
          document.getElementById('input-article-content').value = data.content;
          updateEditorMetricsAndPreview();
        }, 50);
      });
    }

    // 12. Reset Demo Sample Data Button
    const btnResetDemo = document.getElementById('btn-reset-sample-data');
    if (btnResetDemo) {
      btnResetDemo.addEventListener('click', () => {
        UI.showConfirmModal({
          title: 'Reset to Sample Data?',
          message: 'This will restore the original demo articles and clear any manual changes.',
          confirmText: 'Reset Data',
          confirmClass: 'btn-primary',
          onConfirm: () => {
            StorageService.resetToDefaults();
            UI.showToast('Sample data restored successfully!');
            handleRoute();
          }
        });
      });
    }

    // 13. Export JSON Button
    const btnExportData = document.getElementById('btn-export-json');
    if (btnExportData) {
      btnExportData.addEventListener('click', () => {
        const json = StorageService.exportData();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cloudpublish-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        UI.showToast('Exported articles to JSON file!');
      });
    }
  }

  /**
   * Bootstrapping CloudPublish
   */
  function initApp() {
    initEventListeners();
    handleRoute();
  }

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  // Expose state for debugging in browser console
  window.CloudPublish = {
    state,
    StorageService,
    MarkdownParser,
    UI
  };
})();

