/* ==========================================================================
   CivicSetu REST API Client Layer
   Integrates directly with Django REST Framework endpoints.
   ========================================================================== */

const API_BASE = '/api/v1';

class CivicSetuAPI {
  static getToken() {
    return localStorage.getItem('civicsetu_access_token') || null;
  }

  static setToken(token, refresh) {
    if (token) localStorage.setItem('civicsetu_access_token', token);
    if (refresh) localStorage.setItem('civicsetu_refresh_token', refresh);
  }

  static clearToken() {
    localStorage.removeItem('civicsetu_access_token');
    localStorage.removeItem('civicsetu_refresh_token');
  }

  static async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = options.headers || {};

    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      if (response.status === 401) {
        // Unauthenticated or token expired
        console.warn('API request unauthorized:', endpoint);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (!response.ok) {
          let errorMsg = data.detail || data.message;
          if (!errorMsg && data && typeof data === 'object') {
            const firstKey = Object.keys(data)[0];
            if (firstKey) {
              const val = data[firstKey];
              errorMsg = Array.isArray(val) ? val[0] : (typeof val === 'string' ? val : JSON.stringify(val));
            }
          }
          throw new Error(errorMsg || 'API Error');
        }
        return data;
      }
      return null;
    } catch (err) {
      console.error(`API Fetch Error [${endpoint}]:`, err.message);
      throw err;
    }
  }

  // --- Auth APIs ---
  static async login(email, password) {
    return this.request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  static async register(email, password, fullName, phone = '', role = 'CITIZEN', department = '') {
    return this.request('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        phone,
        role,
        department
      }),
    });
  }

  static async getMe() {
    return this.request('/auth/me/');
  }

  static async logout() {
    const refresh = localStorage.getItem('civicsetu_refresh_token');
    if (refresh) {
      try {
        await this.request('/auth/logout/', {
          method: 'POST',
          body: JSON.stringify({ refresh }),
        });
      } catch (e) {
        console.warn('Logout API failed or token expired');
      }
    }
    this.clearToken();
  }

  // --- Complaint APIs ---
  static async getComplaints(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/complaints/?${query}`);
  }

  static async getComplaintDetail(publicId) {
    return this.request(`/complaints/${publicId}/`);
  }

  static async createComplaint(formData) {
    return this.request('/complaints/create/', {
      method: 'POST',
      body: formData,
    });
  }

  static async getComplaintTimeline(publicId) {
    return this.request(`/complaints/${publicId}/timeline/`);
  }

  static async trackComplaint(trackingCode) {
    return this.request(`/complaints/track/${trackingCode}/`);
  }

  // --- Authority APIs ---
  static async getAuthorityDashboardSummary() {
    return this.request('/authority/dashboard/summary/');
  }

  static async getAuthorityRecentComplaints() {
    return this.request('/authority/dashboard/recent/');
  }

  static async getAuthorityComplaints(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/authority/complaints/?${query}`);
  }

  static async updateComplaintStatus(publicId, status, remarks = '') {
    return this.request(`/authority/complaints/${publicId}/status/`, {
      method: 'PATCH',
      body: JSON.stringify({ status, remarks }),
    });
  }

  static async addResolutionNotes(publicId, notes) {
    return this.request(`/authority/complaints/${publicId}/notes/`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    });
  }

  static async uploadResolutionImage(publicId, formData) {
    return this.request(`/authority/complaints/${publicId}/resolution-image/`, {
      method: 'POST',
      body: formData,
    });
  }

  static async updatePriority(publicId, priority, remarks = '') {
    return this.request(`/authority/complaints/${publicId}/priority/`, {
      method: 'PATCH',
      body: JSON.stringify({ priority, remarks }),
    });
  }

  static async getAnalyticsStats(days = 30) {
    return this.request(`/authority/analytics/stats/?days=${days}`);
  }

  static async getDepartmentPerformance() {
    return this.request('/authority/analytics/department/');
  }

  static async getPriorityBreakdown() {
    return this.request('/authority/analytics/priority/');
  }

  // --- Notifications APIs ---
  static async getNotifications(isRead = null) {
    const query = isRead !== null ? `?is_read=${isRead}` : '';
    return this.request(`/authority/notifications/${query}`);
  }

  static async getUnreadNotificationCount() {
    return this.request('/authority/notifications/unread-count/');
  }

  static async markNotificationRead(notificationIds) {
    return this.request('/authority/notifications/mark-read/', {
      method: 'POST',
      body: JSON.stringify({ notification_ids: notificationIds }),
    });
  }

  static async markAllNotificationsRead() {
    return this.request('/authority/notifications/mark-all-read/', {
      method: 'POST',
    });
  }

  // --- Department APIs ---
  static async getDepartments() {
    return this.request('/departments/');
  }

  static async getDepartmentStats(publicId) {
    return this.request(`/departments/${publicId}/stats/`);
  }
}

window.CivicSetuAPI = CivicSetuAPI;
