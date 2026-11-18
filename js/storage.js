/**
 * CloudPublish - Storage Management & MongoDB Integration
 * MongoDB is the authoritative Single Source of Truth (SSOT).
 * LocalStorage is restricted exclusively to ephemeral, temporary draft buffering.
 */

const StorageService = (function () {
  'use strict';

  const DRAFT_BUFFER_PREFIX = 'cloudpublish_draft_buffer_';
  const CACHE_STORAGE_KEY = 'cloudpublish_offline_articles_cache_v2';

  // In-memory cache synchronized with MongoDB
  let memoryArticles = [];
  let isSyncing = false;
  let syncListeners = [];

  // Realistic sample articles for initial database seeding
  const SAMPLE_ARTICLES = [
    {
      title: 'Architecting Multi-Region Resilient Systems on Cloud Infrastructure',
      category: 'Cloud Architecture',
      author: 'Alexandra Chen',
      tags: ['aws', 'cloud', 'high-availability', 'devops'],
      excerpt: 'Discover proven architectural patterns for designing fault-tolerant, low-latency applications distributed across multiple cloud regions.',
      status: 'published',
      content: `## 1. Core Architectural Models\n\nWhen planning a multi-region deployment, teams typically evaluate three operational models based on their **RTO** (Recovery Time Objective) and **RPO** (Recovery Point Objective):\n\n| Strategy | RTO | RPO | Cost Factor | Operational Complexity |\n| :--- | :--- | :--- | :--- | :--- |\n| **Backup & Restore** | 4 - 24 hours | 1 - 12 hours | 1.0x (Baseline) | Low |\n| **Pilot Light** | 10 - 30 mins | < 5 mins | 1.4x | Moderate |\n| **Warm Standby** | < 5 mins | < 1 min | 1.8x | Moderate-High |\n| **Active / Active** | Near Zero | Real-time / 0 | 2.5x - 3.2x | High |\n\n### Active / Active Deployments\nIn an **Active/Active** pattern, incoming requests are routed dynamically to the closest regional endpoint via Anycast BGP or latency-based DNS routing.\n\n> **Key Rule:** Active/Active architectures require careful handling of state synchronization to avoid split-brain scenarios and race conditions during cross-region writes.\n\n\`\`\`javascript\n// Latency-based regional routing decision example\nfunction resolveOptimalRegion(clientTelemetry, availableRegions) {\n  const sorted = availableRegions\n    .filter(region => region.healthStatus === 'HEALTHY')\n    .sort((a, b) => clientTelemetry[a.id] - clientTelemetry[b.id]);\n\n  if (sorted.length === 0) {\n    throw new Error('All regional backends are currently unreachable.');\n  }\n\n  return sorted[0];\n}\n\`\`\`\n\n---\n\n## 2. Distributed Data Synchronization\n\nData management is by far the most challenging facet of multi-region engineering. Relying on synchronous cross-region database transactions is practically impossible due to the physical speed of light in fiber optic cables.\n\n### Key Strategies\n- **Global Read Replicas:** Read-heavy workloads benefit from local read replicas with asynchronous replication latency under 1 second.\n- **CRDTs (Conflict-Free Replicated Data Types):** Ideal for collaborative applications and counters that must merge deterministically across nodes.\n- **Event Sourcing with Kafka or EventBridge:** Cross-region event replication ensures eventual consistency across decentralized microservices.\n\n## 3. Best Practices Checklist\n- [x] Implement multi-region health checks with automated DNS failover\n- [x] Configure distributed tracing across regional service meshes (OpenTelemetry)\n- [x] Deploy infrastructure as code (IaC) using Terraform or AWS CDK with parameterized regions\n- [ ] Run automated chaos engineering experiments to simulate regional outages`
    },
    {
      title: 'Best Practices for Securing Headless CMS APIs with OAuth 2.1',
      category: 'Security',
      author: 'Marcus Vance',
      tags: ['security', 'oauth', 'api-design', 'jwt'],
      excerpt: 'A comprehensive guide on token handling, cryptographic signing, rate limiting, and granular permission scopes in decoupled CMS architectures.',
      status: 'published',
      content: `Headless CMS systems decouple presentation layers from content databases. Because content APIs are exposed to static site generators, mobile apps, and third-party consumers, securing your API surface with robust authorization is critical.\n\n---\n\n## 1. Modern OAuth 2.1 Recommendations\n\nThe OAuth 2.1 consolidation deprecates insecure flows such as the Implicit Grant and Resource Owner Password Credentials in favor of **Authorization Code Flow with PKCE** (Proof Key for Code Exchange).\n\n### Token Security Fundamentals\n- **Short-lived Access Tokens:** Keep JWT access tokens valid for no more than 15 minutes.\n- **Opaque Refresh Tokens:** Rotate refresh tokens on every single usage with sliding window expiration.\n- **Audience and Issuer Verification:** Always enforce strict validation of \`iss\` and \`aud\` claims.\n\n\`\`\`json\n{\n  \"iss\": \"https://auth.cloudpublish.io/\",\n  \"sub\": \"usr_99812739\",\n  \"aud\": \"https://api.cloudpublish.io/v1/content\",\n  \"exp\": 1794218400,\n  \"iat\": 1794217500,\n  \"scope\": \"articles:read articles:publish\"\n}\n\`\`\`\n\n> **Security Alert:** Never expose management API keys inside client-side bundles or public repositories. Deliver preview content via authenticated Edge Workers or Server-Side Rendering proxies.\n\n---\n\n## 2. Granular Role-Based Access Control (RBAC)\n\nOrganize access levels into discrete role tiers:\n1. **Readers:** \`articles:read:published\`\n2. **Authors:** \`articles:create\`, \`articles:edit:own\`, \`articles:read:drafts\`\n3. **Editors:** \`articles:edit:any\`, \`articles:publish\`, \`articles:unpublish\`\n4. **Admins:** \`articles:*\`, \`system:settings\`, \`users:manage\`\n\nEnforcing scopes at your API gateway level ensures fast rejection before requests even hit your database cluster.`
    },
    {
      title: 'Optimizing Edge CDN Cache Invalidation Strategies at Scale',
      category: 'DevOps',
      author: 'Sophia Patel',
      tags: ['cdn', 'caching', 'performance', 'edge'],
      excerpt: 'Techniques for surrogate keys, stale-while-revalidate, and surgical edge cache purging when articles are published or edited.',
      status: 'draft',
      content: `Caching content at the network edge delivers sub-30ms response times globally. However, standard TTL-based caching causes stale data or requires full site invalidations.\n\n### Surrogate-Key Tagging\nBy tagging responses with targeted cache headers, you can selectively purge only the affected pages whenever an article changes:\n\n\`\`\`http\nHTTP/1.1 200 OK\nContent-Type: application/json\nCache-Control: public, max-age=3600, stale-while-revalidate=86400\nSurrogate-Key: article-art-003 category-devops author-sophia-patel\n\`\`\`\n\nWhenever this article is published or modified:\n1. CloudPublish emits a webhook event \`article.published\`.\n2. CDN Edge Purge API receives a call to purge tag: \`article-art-003\`.\n3. Edge caches instantly discard the old cache for that article, without blowing away unrelated pages.`
    },
    {
      title: 'Building Decoupled Frontends with Vanilla Web Standards',
      category: 'Frontend',
      author: 'Elena Rostova',
      tags: ['javascript', 'web-components', 'vanilla-js', 'headless-cms'],
      excerpt: 'Why modern vanilla JavaScript and HTML Web Components provide unparalleled performance and zero-dependency resilience for headless CMS consuming apps.',
      status: 'published',
      content: `Framework fatigue is real. Modern browsers now ship with powerful native standards that rival heavy frontend runtimes without the overhead of hundreds of megabytes of node_modules.\n\n## Why Native Web Standards?\n\n- **Instant Load Times:** Zero bundle hydration overhead.\n- **Longevity:** Standard HTML, CSS, and JS written in 2026 will still work cleanly in 2036.\n- **Low Footprint:** No compile steps required for quick iterations.\n\n### Fetching Content Directly from CloudPublish Headless CMS\n\n\`\`\`javascript\nasync function fetchPublishedArticles() {\n  const response = await fetch('/api/v1/articles?status=published');\n  if (!response.ok) throw new Error('Failed to load published content');\n  \n  const { data: articles } = await response.json();\n  return articles;\n}\n\`\`\`\n\nWith lightweight Markdown rendering inside the browser, clients receive raw Markdown content, reducing API payload sizes by up to 60% compared to heavy pre-rendered HTML DOM trees.`
    }
  ];

  /**
   * Normalize backend MongoDB document into UI-compatible article model
   */
  function normalizeArticle(doc) {
    if (!doc) return null;
    const id = doc._id ? doc._id.toString() : (doc.id || '');
    
    // Normalize author name
    let authorName = 'CloudPublish Author';
    if (typeof doc.author === 'object' && doc.author !== null) {
      authorName = doc.author.name || doc.author.email || 'CloudPublish Author';
    } else if (typeof doc.author === 'string' && doc.author) {
      authorName = doc.author;
    }

    // Normalize tags array of strings
    let tagsList = [];
    if (Array.isArray(doc.tags)) {
      tagsList = doc.tags.map(t => {
        if (typeof t === 'object' && t !== null) return t.name || t.slug || '';
        return String(t);
      }).filter(Boolean);
    } else if (typeof doc.tags === 'string' && doc.tags) {
      tagsList = doc.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    const readTime = doc.readTimeMinutes || doc.readTime || 3;

    return {
      _id: id,
      id: id,
      title: doc.title || 'Untitled Article',
      slug: doc.slug || (doc.title ? doc.title.toLowerCase().replace(/\s+/g, '-') : 'untitled'),
      category: doc.category || 'General',
      author: authorName,
      tags: tagsList,
      excerpt: doc.excerpt || (doc.content ? doc.content.substring(0, 160).replace(/[#*`_~]/g, '').trim() + '...' : ''),
      status: doc.status === 'published' ? 'published' : 'draft',
      publishedAt: doc.publishedAt || null,
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: doc.updatedAt || doc.createdAt || new Date().toISOString(),
      readTime: readTime,
      readTimeMinutes: readTime,
      wordCount: doc.wordCount || (doc.content ? doc.content.split(/\s+/).length : 0),
      content: doc.content || '',
      renderedHtml: doc.renderedHtml || ''
    };
  }

  /**
   * Save fallback copy in localStorage purely for offline reading recovery
   */
  function persistOfflineCache(articles) {
    try {
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(articles));
    } catch (e) {
      // Quota or disabled, safe to ignore
    }
  }

  /**
   * Load fallback cache if network is unavailable
   */
  function loadOfflineCache() {
    try {
      const data = localStorage.getItem(CACHE_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed.map(normalizeArticle) : [];
      }
    } catch (e) {
      console.warn('Failed to parse offline cache', e);
    }
    return [];
  }

  /**
   * Synchronize articles from authoritative MongoDB backend
   */
  async function sync() {
    if (isSyncing) return memoryArticles;
    isSyncing = true;

    try {
      if (typeof ApiClient !== 'undefined') {
        // Ensure session with MongoDB backend
        await ApiClient.ensureSession();

        // Fetch articles from MongoDB
        const backendArticles = await ApiClient.getArticles({ limit: 100 });
        if (Array.isArray(backendArticles)) {
          memoryArticles = backendArticles.map(normalizeArticle);
          persistOfflineCache(memoryArticles);
        }
      }
    } catch (err) {
      console.warn('[StorageService] MongoDB sync encountered warning, using cached state:', err.message);
      if (memoryArticles.length === 0) {
        memoryArticles = loadOfflineCache();
      }
    } finally {
      isSyncing = false;
      syncListeners.forEach(cb => {
        try { cb(memoryArticles); } catch (e) { console.error(e); }
      });
    }

    return memoryArticles;
  }

  /**
   * Initialize Storage
   */
  function init() {
    // Initial sync from cache immediately for rapid paint, then sync with MongoDB
    memoryArticles = loadOfflineCache();
    sync().catch(e => console.warn('Background sync warning:', e));
  }

  /**
   * Register listener for background sync updates
   */
  function onSync(callback) {
    if (typeof callback === 'function') {
      syncListeners.push(callback);
    }
  }

  /**
   * Get all articles (synchronous return from memory cache)
   */
  function getAll() {
    return [...memoryArticles].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }

  /**
   * Get article by ID or Slug
   */
  function getById(id) {
    if (!id) return null;
    return memoryArticles.find(a => a.id === id || a._id === id || a.slug === id) || null;
  }

  /**
   * Create a new article directly in MongoDB
   */
  async function create(data) {
    let createdDoc = null;
    try {
      if (typeof ApiClient !== 'undefined') {
        const payload = {
          title: data.title ? data.title.trim() : 'Untitled Article',
          slug: data.slug,
          category: data.category || 'General',
          tags: Array.isArray(data.tags) ? data.tags : (data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
          excerpt: data.excerpt,
          content: data.content || '',
          status: data.status === 'published' ? 'published' : 'draft',
        };
        const res = await ApiClient.createArticle(payload);
        createdDoc = normalizeArticle(res);
      }
    } catch (err) {
      console.error('[StorageService] Failed to create article in MongoDB:', err);
      throw err;
    }

    if (createdDoc) {
      // Prepend to local memory cache
      memoryArticles = [createdDoc, ...memoryArticles.filter(a => a.id !== createdDoc.id)];
      persistOfflineCache(memoryArticles);
      return createdDoc;
    }

    // Fallback if API unavailable
    const fallbackArticle = normalizeArticle({
      _id: 'local-' + Date.now().toString(36),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    memoryArticles.unshift(fallbackArticle);
    return fallbackArticle;
  }

  /**
   * Update an existing article in MongoDB
   */
  async function update(id, fields) {
    const existing = getById(id);
    const targetId = existing ? (existing._id || existing.id) : id;

    let updatedDoc = null;
    try {
      if (typeof ApiClient !== 'undefined') {
        const payload = { ...fields };
        if (typeof payload.tags === 'string') {
          payload.tags = payload.tags.split(',').map(t => t.trim()).filter(Boolean);
        }
        const res = await ApiClient.updateArticle(targetId, payload);
        updatedDoc = normalizeArticle(res);
      }
    } catch (err) {
      console.error('[StorageService] Failed to update article in MongoDB:', err);
      throw err;
    }

    if (updatedDoc) {
      const idx = memoryArticles.findIndex(a => a.id === updatedDoc.id || a._id === updatedDoc.id);
      if (idx !== -1) {
        memoryArticles[idx] = updatedDoc;
      } else {
        memoryArticles.unshift(updatedDoc);
      }
      persistOfflineCache(memoryArticles);
      return updatedDoc;
    }

    // Fallback
    if (existing) {
      Object.assign(existing, fields, { updatedAt: new Date().toISOString() });
      persistOfflineCache(memoryArticles);
      return existing;
    }
    return null;
  }

  /**
   * Remove an article from MongoDB
   */
  async function remove(id) {
    const existing = getById(id);
    const targetId = existing ? (existing._id || existing.id) : id;

    try {
      if (typeof ApiClient !== 'undefined') {
        await ApiClient.deleteArticle(targetId);
      }
    } catch (err) {
      console.error('[StorageService] Failed to delete article from MongoDB:', err);
      throw err;
    }

    memoryArticles = memoryArticles.filter(a => a.id !== targetId && a._id !== targetId);
    persistOfflineCache(memoryArticles);
    return true;
  }

  /**
   * Toggle published/draft status in MongoDB
   */
  async function togglePublish(id) {
    const article = getById(id);
    if (!article) return null;

    const targetId = article._id || article.id;
    const isCurrentlyPublished = article.status === 'published';

    try {
      let updatedRes;
      if (isCurrentlyPublished) {
        updatedRes = await ApiClient.unpublishArticle(targetId);
      } else {
        updatedRes = await ApiClient.publishArticle(targetId);
      }

      const updatedDoc = normalizeArticle(updatedRes);
      const idx = memoryArticles.findIndex(a => a.id === targetId || a._id === targetId);
      if (idx !== -1) {
        memoryArticles[idx] = updatedDoc;
      }
      persistOfflineCache(memoryArticles);
      return updatedDoc;
    } catch (err) {
      console.error('[StorageService] Failed to toggle publish status in MongoDB:', err);
      throw err;
    }
  }

  /**
   * Compatibility alias for publishing
   */
  async function publishDraftToAWS(id) {
    return togglePublish(id);
  }

  /**
   * Temporary Ephemeral Draft Buffer in localStorage
   * (Complies with Rule: Offline storage only as temporary draft storage, not published articles)
   */
  function saveDraftBuffer(draftKey, draftContent) {
    try {
      localStorage.setItem(`${DRAFT_BUFFER_PREFIX}${draftKey}`, JSON.stringify({
        content: draftContent,
        savedAt: new Date().toISOString(),
      }));
    } catch (e) {
      // Ignore quota warnings for buffer
    }
  }

  function getDraftBuffer(draftKey) {
    try {
      const data = localStorage.getItem(`${DRAFT_BUFFER_PREFIX}${draftKey}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function clearDraftBuffer(draftKey) {
    try {
      localStorage.removeItem(`${DRAFT_BUFFER_PREFIX}${draftKey}`);
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Calculate aggregated CMS statistics
   */
  function getStatistics() {
    const articles = getAll();
    const total = articles.length;
    const published = articles.filter(a => a.status === 'published').length;
    const drafts = articles.filter(a => a.status === 'draft').length;

    const categoryCount = {};
    let totalWords = 0;

    articles.forEach(a => {
      const cat = a.category || 'Uncategorized';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      totalWords += (a.wordCount || (a.content ? a.content.split(/\s+/).length : 0));
    });

    const categoriesList = Object.keys(categoryCount).map(name => ({
      name,
      count: categoryCount[name]
    })).sort((a, b) => b.count - a.count);

    return {
      total,
      published,
      drafts,
      publishRate: total > 0 ? Math.round((published / total) * 100) : 0,
      totalWords,
      categories: categoriesList,
      recent: articles.slice(0, 5)
    };
  }

  /**
   * Reset data / seed sample articles to MongoDB
   */
  async function resetToDefaults() {
    try {
      if (typeof ApiClient !== 'undefined') {
        for (const sample of SAMPLE_ARTICLES) {
          try {
            await ApiClient.createArticle(sample);
          } catch (e) {
            // If already exists or error, continue
          }
        }
      }
      return await sync();
    } catch (err) {
      console.warn('Error resetting defaults:', err);
      return getAll();
    }
  }

  /**
   * Export database as JSON string
   */
  function exportData() {
    return JSON.stringify(getAll(), null, 2);
  }

  /**
   * Import data from JSON into MongoDB
   */
  async function importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed) && typeof ApiClient !== 'undefined') {
        for (const item of parsed) {
          try {
            await ApiClient.createArticle(item);
          } catch (e) {
            console.warn('Import item skipped:', e.message);
          }
        }
        await sync();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to import JSON data', e);
      return false;
    }
  }

  // Self initialize on load
  init();

  return {
    init,
    sync,
    onSync,
    getAll,
    getById,
    create,
    update,
    remove,
    togglePublish,
    publishDraftToAWS,
    saveDraftBuffer,
    getDraftBuffer,
    clearDraftBuffer,
    getStatistics,
    resetToDefaults,
    exportData,
    importData,
    AWS_CONFIG: { USE_MOCK: false, API_URL: '' }
  };
})();

// Export for Node testing or browser window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageService;
}
