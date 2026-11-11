/**
 * CloudPublish - Storage Management & AWS Integration
 * Handles localStorage persistence, CRUD operations, statistics, sample data,
 * and serverless publishing via AWS API Gateway & Lambda.
 */

const StorageService = (function () {
  'use strict';

  const STORAGE_KEY = 'cloudpublish_articles_v1';

  // Configuration for AWS Serverless Backend
  const AWS_CONFIG = {
    // Replace with your API Gateway Invoke URL from AWS Console
    API_URL: 'https://htv7wq22jl.execute-api.us-east-1.amazonaws.com/',
    USE_MOCK: false // Set to true to test local latency without hitting AWS
  };

  // Realistic sample articles
  const SAMPLE_ARTICLES = [
    {
      id: 'art-001',
      title: 'Architecting Multi-Region Resilient Systems on Cloud Infrastructure',
      slug: 'architecting-multi-region-resilient-systems-on-cloud-infrastructure',
      category: 'Cloud Architecture',
      author: 'Alexandra Chen',
      tags: ['aws', 'cloud', 'high-availability', 'devops'],
      excerpt: 'Discover proven architectural patterns for designing fault-tolerant, low-latency applications distributed across multiple cloud regions.',
      status: 'published',
      publishedAt: '2026-11-05T09:30:00.000Z',
      createdAt: '2026-11-02T14:15:00.000Z',
      updatedAt: '2026-11-05T09:30:00.000Z',
      readTime: 4,
      content: `## 1. Core Architectural Models\n\nWhen planning a multi-region deployment, teams typically evaluate three operational models based on their **RTO** (Recovery Time Objective) and **RPO** (Recovery Point Objective):\n\n| Strategy | RTO | RPO | Cost Factor | Operational Complexity |\n| :--- | :--- | :--- | :--- | :--- |\n| **Backup & Restore** | 4 - 24 hours | 1 - 12 hours | 1.0x (Baseline) | Low |\n| **Pilot Light** | 10 - 30 mins | < 5 mins | 1.4x | Moderate |\n| **Warm Standby** | < 5 mins | < 1 min | 1.8x | Moderate-High |\n| **Active / Active** | Near Zero | Real-time / 0 | 2.5x - 3.2x | High |\n\n### Active / Active Deployments\nIn an **Active/Active** pattern, incoming requests are routed dynamically to the closest regional endpoint via Anycast BGP or latency-based DNS routing.\n\n> **Key Rule:** Active/Active architectures require careful handling of state synchronization to avoid split-brain scenarios and race conditions during cross-region writes.\n\n\`\`\`javascript\n// Latency-based regional routing decision example\nfunction resolveOptimalRegion(clientTelemetry, availableRegions) {\n  const sorted = availableRegions\n    .filter(region => region.healthStatus === 'HEALTHY')\n    .sort((a, b) => clientTelemetry[a.id] - clientTelemetry[b.id]);\n\n  if (sorted.length === 0) {\n    throw new Error('All regional backends are currently unreachable.');\n  }\n\n  return sorted[0];\n}\n\`\`\`\n\n---\n\n## 2. Distributed Data Synchronization\n\nData management is by far the most challenging facet of multi-region engineering. Relying on synchronous cross-region database transactions is practically impossible due to the physical speed of light in fiber optic cables.\n\n### Key Strategies\n- **Global Read Replicas:** Read-heavy workloads benefit from local read replicas with asynchronous replication latency under 1 second.\n- **CRDTs (Conflict-Free Replicated Data Types):** Ideal for collaborative applications and counters that must merge deterministically across nodes.\n- **Event Sourcing with Kafka or EventBridge:** Cross-region event replication ensures eventual consistency across decentralized microservices.\n\n## 3. Best Practices Checklist\n- [x] Implement multi-region health checks with automated DNS failover\n- [x] Configure distributed tracing across regional service meshes (OpenTelemetry)\n- [x] Deploy infrastructure as code (IaC) using Terraform or AWS CDK with parameterized regions\n- [ ] Run automated chaos engineering experiments to simulate regional outages`
    },
    {
      id: 'art-002',
      title: 'Best Practices for Securing Headless CMS APIs with OAuth 2.1',
      slug: 'best-practices-for-securing-headless-cms-apis-with-oauth-21',
      category: 'Security',
      author: 'Marcus Vance',
      tags: ['security', 'oauth', 'api-design', 'jwt'],
      excerpt: 'A comprehensive guide on token handling, cryptographic signing, rate limiting, and granular permission scopes in decoupled CMS architectures.',
      status: 'published',
      publishedAt: '2026-11-08T11:45:00.000Z',
      createdAt: '2026-11-07T10:00:00.000Z',
      updatedAt: '2026-11-08T11:45:00.000Z',
      readTime: 5,
      content: `Headless CMS systems decouple presentation layers from content databases. Because content APIs are exposed to static site generators, mobile apps, and third-party consumers, securing your API surface with robust authorization is critical.\n\n---\n\n## 1. Modern OAuth 2.1 Recommendations\n\nThe OAuth 2.1 consolidation deprecates insecure flows such as the Implicit Grant and Resource Owner Password Credentials in favor of **Authorization Code Flow with PKCE** (Proof Key for Code Exchange).\n\n### Token Security Fundamentals\n- **Short-lived Access Tokens:** Keep JWT access tokens valid for no more than 15 minutes.\n- **Opaque Refresh Tokens:** Rotate refresh tokens on every single usage with sliding window expiration.\n- **Audience and Issuer Verification:** Always enforce strict validation of \`iss\` and \`aud\` claims.\n\n\`\`\`json\n{\n  \"iss\": \"https://auth.cloudpublish.io/\",\n  \"sub\": \"usr_99812739\",\n  \"aud\": \"https://api.cloudpublish.io/v1/content\",\n  \"exp\": 1794218400,\n  \"iat\": 1794217500,\n  \"scope\": \"articles:read articles:publish\"\n}\n\`\`\`\n\n> **Security Alert:** Never expose management API keys inside client-side bundles or public repositories. Deliver preview content via authenticated Edge Workers or Server-Side Rendering proxies.\n\n---\n\n## 2. Granular Role-Based Access Control (RBAC)\n\nOrganize access levels into discrete role tiers:\n1. **Readers:** \`articles:read:published\`\n2. **Authors:** \`articles:create\`, \`articles:edit:own\`, \`articles:read:drafts\`\n3. **Editors:** \`articles:edit:any\`, \`articles:publish\`, \`articles:unpublish\`\n4. **Admins:** \`articles:*\`, \`system:settings\`, \`users:manage\`\n\nEnforcing scopes at your API gateway level ensures fast rejection before requests even hit your database cluster.`
    },
    {
      id: 'art-003',
      title: 'Optimizing Edge CDN Cache Invalidation Strategies at Scale',
      slug: 'optimizing-edge-cdn-cache-invalidation-strategies-at-scale',
      category: 'DevOps',
      author: 'Sophia Patel',
      tags: ['cdn', 'caching', 'performance', 'edge'],
      excerpt: 'Techniques for surrogate keys, stale-while-revalidate, and surgical edge cache purging when articles are published or edited.',
      status: 'draft',
      publishedAt: null,
      createdAt: '2026-11-09T16:20:00.000Z',
      updatedAt: '2026-11-10T08:00:00.000Z',
      readTime: 3,
      content: `Caching content at the network edge delivers sub-30ms response times globally. However, standard TTL-based caching causes stale data or requires full site invalidations.\n\n### Surrogate-Key Tagging\nBy tagging responses with targeted cache headers, you can selectively purge only the affected pages whenever an article changes:\n\n\`\`\`http\nHTTP/1.1 200 OK\nContent-Type: application/json\nCache-Control: public, max-age=3600, stale-while-revalidate=86400\nSurrogate-Key: article-art-003 category-devops author-sophia-patel\n\`\`\`\n\nWhenever this article is published or modified:\n1. CloudPublish emits a webhook event \`article.published\`.\n2. CDN Edge Purge API receives a call to purge tag: \`article-art-003\`.\n3. Edge caches instantly discard the old cache for that article, without blowing away unrelated pages.`
    },
    {
      id: 'art-004',
      title: 'Building Decoupled Frontends with Vanilla Web Standards',
      slug: 'building-decoupled-frontends-with-vanilla-web-standards',
      category: 'Frontend',
      author: 'Elena Rostova',
      tags: ['javascript', 'web-components', 'vanilla-js', 'headless-cms'],
      excerpt: 'Why modern vanilla JavaScript and HTML Web Components provide unparalleled performance and zero-dependency resilience for headless CMS consuming apps.',
      status: 'published',
      publishedAt: '2026-11-09T14:00:00.000Z',
      createdAt: '2026-11-08T18:30:00.000Z',
      updatedAt: '2026-11-09T14:00:00.000Z',
      readTime: 4,
      content: `Framework fatigue is real. Modern browsers now ship with powerful native standards that rival heavy frontend runtimes without the overhead of hundreds of megabytes of node_modules.\n\n## Why Native Web Standards?\n\n- **Instant Load Times:** Zero bundle hydration overhead.\n- **Longevity:** Standard HTML, CSS, and JS written in 2026 will still work cleanly in 2036.\n- **Low Footprint:** No compile steps required for quick iterations.\n\n### Fetching Content Directly from CloudPublish Headless CMS\n\n\`\`\`javascript\nasync function fetchPublishedArticles() {\n  const response = await fetch('/api/v1/articles?status=published');\n  if (!response.ok) throw new Error('Failed to load published content');\n  \n  const { data: articles } = await response.json();\n  return articles;\n}\n\`\`\`\n\nWith lightweight Markdown rendering inside the browser, clients receive raw Markdown content, reducing API payload sizes by up to 60% compared to heavy pre-rendered HTML DOM trees.`
    },
    {
      id: 'art-005',
      title: 'Serverless vs Containers: Pragmatic Cost & Latency Trade-offs',
      slug: 'serverless-vs-containers-pragmatic-cost-latency-tradeoffs',
      category: 'Cloud Architecture',
      author: 'David Kim',
      tags: ['serverless', 'containers', 'docker', 'cost-optimization'],
      excerpt: 'An unbiased comparison of cold starts, steady-state costs, operational complexity, and real-world developer experience in 2026.',
      status: 'draft',
      publishedAt: null,
      createdAt: '2026-11-10T12:00:00.000Z',
      updatedAt: '2026-11-10T15:30:00.000Z',
      readTime: 6,
      content: `The debate between serverless functions (like AWS Lambda or Cloudflare Workers) and containerized microservices (ECS or Kubernetes) continues to evolve.\n\n### Decision Matrix\n\n| Dimension | Serverless Functions | Containerized Services |\n| :--- | :--- | :--- |\n| **Cold Starts** | 50ms - 400ms | Zero during steady traffic |\n| **Idle Cost** | $0.00 (Pure on-demand) | Baseline node/task allocation |\n| **Execution Limit** | Typically 15 minutes | Indefinite execution |\n| **Local Debugging** | Emulated / Mocked | Identical container runtime |\n| **Scaling Velocity** | 0 to 1,000+ instances in seconds | Auto-scaling groups take 1-3 mins |\n\n> **Recommendation:** Use Serverless for sporadic webhooks, scheduled background aggregations, and edge middleware. Use Containers for high-throughput steady-state APIs and long-running data pipelines.`
    },
    {
      id: 'art-006',
      title: 'Zero-Trust Cloud Security: Principles and Implementation Roadmap',
      slug: 'zero-trust-cloud-security-principles-and-implementation-roadmap',
      category: 'Security',
      author: 'Alexandra Chen',
      tags: ['zero-trust', 'security', 'iam', 'network'],
      excerpt: 'Transitioning from perimeter-based perimeter models to continuous cryptographic verification across every workload, user, and API call.',
      status: 'published',
      publishedAt: '2026-11-11T08:15:00.000Z',
      createdAt: '2026-11-10T09:00:00.000Z',
      updatedAt: '2026-11-11T08:15:00.000Z',
      readTime: 4,
      content: `The traditional "castle-and-moat" network security perimeter is obsolete. Modern cloud environments are perimeter-less, requiring an absolute **Zero-Trust** posture: *\"Never trust, always verify.\"*\n\n## The Three Pillars of Zero Trust\n\n1. **Verify Explicitly:** Always authenticate and authorize based on all available data points (user identity, location, device health, service context).\n2. **Use Least Privilege Access:** Limit user access with Just-In-Time (JIT) and Just-Enough-Access (JEA) risk-based policies.\n3. **Assume Breach:** Minimize blast radius by segmenting access by network, user, devices, and application awareness.\n\n\`\`\`bash\n# Enforcing mTLS between CMS services\nopenssl s_client -connect internal.cloudpublish.io:8443 \\\n  -cert client.crt -key client.key -CAfile rootCA.pem\n\`\`\`\n\nThrough mutual TLS (mTLS) and workload identities (SPIFFE/SPIRE), services authenticate each other cryptographically for every single remote procedure call.`
    }
  ];

  /**
   * Initialize storage with sample data if empty
   */
  function init() {
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (!existing) {
        resetToDefaults();
      }
    } catch (e) {
      console.warn('LocalStorage not accessible, falling back to memory state', e);
    }
  }

  /**
   * Get all articles from localStorage
   * @returns {Array} articles
   */
  function getAll() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const articles = JSON.parse(data);
      return articles.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    } catch (e) {
      console.error('Error reading articles from storage', e);
      return [];
    }
  }

  /**
   * Get article by ID
   * @param {string} id 
   * @returns {Object|null}
   */
  function getById(id) {
    if (!id) return null;
    const articles = getAll();
    return articles.find(a => a.id === id) || null;
  }

  /**
   * Create a new article
   * @param {Object} data 
   * @returns {Object} created article
   */
  function create(data) {
    const articles = getAll();
    const now = new Date().toISOString();
    const readTime = (typeof MarkdownParser !== 'undefined' && MarkdownParser.calculateReadTime)
      ? MarkdownParser.calculateReadTime(data.content || '')
      : 3;

    const newArticle = {
      id: 'art-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      title: data.title ? data.title.trim() : 'Untitled Article',
      slug: (typeof MarkdownParser !== 'undefined' && MarkdownParser.generateSlug)
        ? MarkdownParser.generateSlug(data.slug || data.title || 'untitled')
        : (data.title || 'untitled').toLowerCase().replace(/\s+/g, '-'),
      category: data.category ? data.category.trim() : 'General',
      author: data.author ? data.author.trim() : 'Admin',
      tags: Array.isArray(data.tags)
        ? data.tags
        : (data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
      excerpt: data.excerpt ? data.excerpt.trim() : (data.content ? data.content.substring(0, 160).replace(/[#*`_~]/g, '').trim() + '...' : ''),
      status: data.status === 'published' ? 'published' : 'draft',
      publishedAt: data.status === 'published' ? now : null,
      createdAt: now,
      updatedAt: now,
      readTime: readTime,
      content: data.content || ''
    };

    articles.unshift(newArticle);
    saveAll(articles);
    return newArticle;
  }

  /**
   * Update an existing article
   * @param {string} id 
   * @param {Object} fields 
   * @returns {Object|null} updated article
   */
  function update(id, fields) {
    const articles = getAll();
    const index = articles.findIndex(a => a.id === id);
    if (index === -1) return null;

    const current = articles[index];
    const now = new Date().toISOString();

    const willBePublished = fields.status === 'published' || (fields.status === undefined && current.status === 'published');
    const wasPublished = current.status === 'published';

    let publishedAt = current.publishedAt;
    if (willBePublished && !wasPublished) {
      publishedAt = now;
    } else if (fields.status === 'draft') {
      publishedAt = null;
    }

    const updatedContent = fields.content !== undefined ? fields.content : current.content;
    const readTime = (typeof MarkdownParser !== 'undefined' && MarkdownParser.calculateReadTime)
      ? MarkdownParser.calculateReadTime(updatedContent)
      : current.readTime;

    const updated = {
      ...current,
      ...fields,
      slug: (typeof MarkdownParser !== 'undefined' && MarkdownParser.generateSlug)
        ? MarkdownParser.generateSlug(fields.slug || fields.title || current.slug)
        : current.slug,
      tags: fields.tags !== undefined
        ? (Array.isArray(fields.tags) ? fields.tags : fields.tags.split(',').map(t => t.trim()).filter(Boolean))
        : current.tags,
      publishedAt: publishedAt,
      updatedAt: now,
      readTime: readTime
    };

    articles[index] = updated;
    saveAll(articles);
    return updated;
  }

  /**
   * Remove an article by ID
   * @param {string} id 
   * @returns {boolean}
   */
  function remove(id) {
    const articles = getAll();
    const filtered = articles.filter(a => a.id !== id);
    if (filtered.length !== articles.length) {
      saveAll(filtered);
      return true;
    }
    return false;
  }

  /**
   * Toggle published/draft status of an article
   * Synchronously updates status in localStorage so UI responds instantly,
   * and optionally triggers AWS API Gateway publishing in background if configured.
   * @param {string} id 
   * @returns {Object|null} updated article
   */
  function togglePublish(id) {
    const article = getById(id);
    if (!article) return null;

    const newStatus = article.status === 'published' ? 'draft' : 'published';
    const updated = update(id, { status: newStatus });

    // If publishing and AWS endpoint configured, trigger cloud publish in background
    if (newStatus === 'published' && AWS_CONFIG.API_URL && !AWS_CONFIG.USE_MOCK) {
      publishDraftToAWS(id).catch(err => {
        console.warn('AWS API Gateway publish warning:', err);
      });
    }

    return updated;
  }

  /**
   * Publishes an article by triggering the AWS API Gateway -> Lambda -> S3 pipeline.
   * On 200 OK confirmation, it synchronizes the local article status to 'published'.
   * @param {string} id - The article ID
   * @returns {Promise<Object>} API response and updated article
   */
  async function publishDraftToAWS(id) {
    const article = getById(id);
    if (!article) {
      throw new Error('Article not found with id: ' + id);
    }

    const payload = {
      id: article.id,
      title: article.title,
      slug: article.slug,
      category: article.category,
      author: article.author,
      tags: article.tags,
      excerpt: article.excerpt,
      content: article.content,
      readTime: article.readTime,
      publishedAt: new Date().toISOString()
    };

    if (AWS_CONFIG.USE_MOCK || !AWS_CONFIG.API_URL) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const updated = update(id, { status: 'published', publishedAt: payload.publishedAt });
      return { success: true, mode: 'mock', article: updated };
    }

    try {
      const endpoint = AWS_CONFIG.API_URL.endsWith('/')
        ? AWS_CONFIG.API_URL + 'publish'
        : AWS_CONFIG.API_URL + '/publish';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`AWS API Gateway returned HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json().catch(() => ({ success: true }));
      const updated = update(id, { status: 'published', publishedAt: payload.publishedAt });
      return { success: true, data: result, article: updated };
    } catch (err) {
      console.warn('AWS API Gateway publish encountered network/CORS limitation, article remains published in local storage:', err);
      const updated = update(id, { status: 'published', publishedAt: payload.publishedAt });
      return { success: false, error: err.message, article: updated, fallback: true };
    }
  }

  /**
   * Save array of articles to localStorage
   */
  function saveAll(articles) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
      return true;
    } catch (e) {
      console.error('Failed to save to localStorage', e);
      if (typeof UI !== 'undefined' && UI.showToast) {
        UI.showToast('Storage quota exceeded or browser storage is disabled.', 'error');
      }
      return false;
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

    // Categories breakdown
    const categoryCount = {};
    let totalWords = 0;

    articles.forEach(a => {
      const cat = a.category || 'Uncategorized';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      totalWords += (typeof MarkdownParser !== 'undefined' && MarkdownParser.countWords)
        ? MarkdownParser.countWords(a.content || '')
        : (a.content ? a.content.split(/\s+/).length : 0);
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
   * Reset data to realistic sample articles
   */
  function resetToDefaults() {
    saveAll(SAMPLE_ARTICLES);
    return getAll();
  }

  /**
   * Export database as JSON string
   */
  function exportData() {
    return JSON.stringify(getAll(), null, 2);
  }

  /**
   * Import data from JSON
   */
  function importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        saveAll(parsed);
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
    getAll,
    getById,
    create,
    update,
    remove,
    togglePublish,
    publishDraftToAWS,
    getStatistics,
    resetToDefaults,
    exportData,
    importData,
    AWS_CONFIG
  };
})();

// Export for Node testing or browser window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageService;
}

    if (!article) {
      throw new Error('Article not found with id: ' + id);
    }

    const payload = {
      id: article.id,
      title: article.title,
      slug: article.slug,
      category: article.category,
      author: article.author,
      tags: article.tags,
      excerpt: article.excerpt,
      content: article.content,
      readTime: article.readTime,
      publishedAt: new Date().toISOString()
    };

    if (AWS_CONFIG.USE_MOCK || !AWS_CONFIG.API_URL) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const updated = update(id, { status: 'published', publishedAt: payload.publishedAt });
      return { success: true, mode: 'mock', article: updated };
    }

    try {
      const endpoint = AWS_CONFIG.API_URL.endsWith('/')
        ? AWS_CONFIG.API_URL + 'publish'
        : AWS_CONFIG.API_URL + '/publish';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`AWS API Gateway returned HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json().catch(() => ({ success: true }));
      const updated = update(id, { status: 'published', publishedAt: payload.publishedAt });
      return { success: true, data: result, article: updated };
    } catch (err) {
      console.warn('AWS API Gateway publish encountered network/CORS limitation, article remains published in local storage:', err);
      const updated = update(id, { status: 'published', publishedAt: payload.publishedAt });
      return { success: false, error: err.message, article: updated, fallback: true };
    }
  }

  /**
   * Save array of articles to localStorage
   */
  function saveAll(articles) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
      return true;
    } catch (e) {
      console.error('Failed to save to localStorage', e);
      if (typeof UI !== 'undefined' && UI.showToast) {
        UI.showToast('Storage quota exceeded or browser storage is disabled.', 'error');
      }
      return false;
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

    // Categories breakdown
    const categoryCount = {};
    let totalWords = 0;

    articles.forEach(a => {
      const cat = a.category || 'Uncategorized';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      totalWords += (typeof MarkdownParser !== 'undefined' && MarkdownParser.countWords)
        ? MarkdownParser.countWords(a.content || '')
        : (a.content ? a.content.split(/\s+/).length : 0);
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
   * Reset data to realistic sample articles
   */
  function resetToDefaults() {
    saveAll(SAMPLE_ARTICLES);
    return getAll();
  }

  /**
   * Export database as JSON string
   */
  function exportData() {
    return JSON.stringify(getAll(), null, 2);
  }

  /**
   * Import data from JSON
   */
  function importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        saveAll(parsed);
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
    getAll,
    getById,
    create,
    update,
    remove,
    togglePublish,
    publishDraftToAWS,
    getStatistics,
    resetToDefaults,
    exportData,
    importData,
    AWS_CONFIG
  };
})();

// Export for Node testing or browser window
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageService;
}