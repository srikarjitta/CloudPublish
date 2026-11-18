/**
 * CloudPublish - REST API Client Adapter
 * Provides centralized HTTP client communication with the Node.js/Express/MongoDB backend.
 * Uses HTTP-only cookies (with in-memory JWT fallback) and credentials: 'include'.
 */

const ApiClient = (function () {
  'use strict';

  // Resolve API Base URL dynamically
  const isHostedOnBackend = window.location.port === '5000' || (window.location.origin && window.location.origin.includes(':5000'));
  const API_BASE = isHostedOnBackend
    ? `${window.location.origin}/api`
    : 'http://localhost:5000/api';

  let inMemoryToken = null;
  let currentUser = null;

  /**
   * Universal fetch wrapper with credentials and structured error handling
   */
  async function request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    const headers = { ...options.headers };

    // Set JSON content-type if body is an object and not FormData
    if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    if (inMemoryToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${inMemoryToken}`;
    }

    const config = {
      ...options,
      headers,
      credentials: 'include', // Transmits httpOnly cp_token cookie across localhost:5500 <-> localhost:5000
    };

    try {
      const response = await fetch(url, config);
      const isJson = (response.headers.get('content-type') || '').includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const error = new Error(data.message || `Request failed with HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.warn(`[ApiClient] Request failed for ${endpoint}:`, err.message);
      throw err;
    }
  }

  /**
   * Health Check
   */
  async function checkHealth() {
    return request('/health');
  }

  /**
   * Get Current Authenticated User Profile
   */
  async function getCurrentUser() {
    try {
      const res = await request('/auth/me');
      if (res && res.user) {
        currentUser = res.user;
        return currentUser;
      }
    } catch (err) {
      currentUser = null;
    }
    return null;
  }

  /**
   * Authenticate / Login
   */
  async function login(email, password) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (res && res.user) {
      currentUser = res.user;
      if (res.token) inMemoryToken = res.token;
      return res.user;
    }
    return null;
  }

  /**
   * Ensure an active authenticated session
   * Verifies existing cookie/session; if unauthenticated, performs seamless background authentication
   */
  async function ensureSession() {
    const existing = await getCurrentUser();
    if (existing) return existing;

    try {
      // Default initial author/admin session for CloudPublish platform
      const user = await login('admin@cloudpublish.dev', 'AdminPass123!');
      return user;
    } catch (err) {
      console.warn('[ApiClient] Seamless login fallback encountered error:', err.message);
      return null;
    }
  }

  /**
   * Query Articles from MongoDB
   */
  async function getArticles(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.search) query.set('search', params.search);
    if (params.sort) query.set('sort', params.sort);
    if (params.page) query.set('page', params.page);
    query.set('limit', params.limit || '100'); // Load full dataset for seamless instant responsive filtering

    const queryString = query.toString();
    const endpoint = `/articles${queryString ? '?' + queryString : ''}`;
    const res = await request(endpoint);
    return res.data || [];
  }

  /**
   * Get single article by slug or ObjectId
   */
  async function getArticle(slugOrId) {
    const res = await request(`/articles/${encodeURIComponent(slugOrId)}`);
    return res.data;
  }

  /**
   * Create new article in MongoDB
   */
  async function createArticle(articleData) {
    await ensureSession();
    const res = await request('/articles', {
      method: 'POST',
      body: articleData,
    });
    return res.data;
  }

  /**
   * Update article in MongoDB
   */
  async function updateArticle(id, updates) {
    await ensureSession();
    const res = await request(`/articles/${id}`, {
      method: 'PUT',
      body: updates,
    });
    return res.data;
  }

  /**
   * Delete article in MongoDB
   */
  async function deleteArticle(id) {
    await ensureSession();
    return request(`/articles/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Publish article in MongoDB
   */
  async function publishArticle(id) {
    await ensureSession();
    const res = await request(`/articles/${id}/publish`, {
      method: 'PATCH',
    });
    return res.data;
  }

  /**
   * Unpublish article in MongoDB (revert to draft)
   */
  async function unpublishArticle(id) {
    await ensureSession();
    const res = await request(`/articles/${id}/unpublish`, {
      method: 'PATCH',
    });
    return res.data;
  }

  /**
   * Upload image/media asset
   */
  async function uploadMedia(file) {
    await ensureSession();
    const formData = new FormData();
    formData.append('file', file);

    const res = await request('/media/upload', {
      method: 'POST',
      body: formData,
    });
    return res.data;
  }

  /**
   * Get Admin / Author Dashboard Telemetry
   */
  async function getDashboardStats() {
    await ensureSession();
    const res = await request('/admin/dashboard');
    return res.data;
  }

  /**
   * Get Tags
   */
  async function getTags() {
    const res = await request('/tags');
    return res.data || [];
  }

  return {
    API_BASE,
    checkHealth,
    getCurrentUser,
    login,
    ensureSession,
    getArticles,
    getArticle,
    createArticle,
    updateArticle,
    deleteArticle,
    publishArticle,
    unpublishArticle,
    uploadMedia,
    getDashboardStats,
    getTags,
  };
})();

// Export for window or Node environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
}
