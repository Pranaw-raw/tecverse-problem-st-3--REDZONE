const API_BASE = '/api';

export const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('reservehub_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.error || 'An unexpected error occurred');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  },

  // Auth endpoints
  login(identifier, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, email: identifier, password }),
    });
  },

  register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  demoLogin(role) {
    return this.request('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },

  getMe() {
    return this.request('/auth/me');
  },

  getUsers() {
    return this.request('/auth/users');
  },

  // Resource endpoints
  getResources(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/resources${query ? `?${query}` : ''}`);
  },

  getResourceMeta() {
    return this.request('/resources/meta/filters');
  },

  getResourceById(id) {
    return this.request(`/resources/${id}`);
  },

  getResourceAvailability(id, date) {
    return this.request(`/resources/${id}/availability?date=${date}`);
  },

  createResource(resourceData) {
    return this.request('/resources', {
      method: 'POST',
      body: JSON.stringify(resourceData),
    });
  },

  updateResource(id, resourceData) {
    return this.request(`/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(resourceData),
    });
  },

  toggleResourceStatus(id, status) {
    return this.request(`/resources/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  deleteResource(id) {
    return this.request(`/resources/${id}`, {
      method: 'DELETE',
    });
  },

  // Booking endpoints
  createBooking(bookingData) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  getMyBookings(status) {
    return this.request(`/bookings/my${status ? `?status=${status}` : ''}`);
  },

  getAllBookings(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/bookings/all${query ? `?${query}` : ''}`);
  },

  getBookingById(id) {
    return this.request(`/bookings/${id}`);
  },

  cancelBooking(id, reason) {
    return this.request(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  qrCheckIn(qrToken, bookingId) {
    return this.request('/bookings/qr-checkin', {
      method: 'POST',
      body: JSON.stringify({ qrToken, bookingId }),
    });
  },

  // Analytics endpoints
  getAnalytics() {
    return this.request('/analytics/dashboard');
  },

  exportBookings() {
    return this.request('/analytics/export');
  },

  // Notification endpoints
  getNotifications() {
    return this.request('/notifications');
  },

  getAdminNotifications() {
    return this.request('/notifications/admin');
  },

  markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  markAllNotificationsRead() {
    return this.request('/notifications/mark-all-read', {
      method: 'POST',
    });
  },

  registerDeviceToken(tokenData) {
    return this.request('/notifications/device-token', {
      method: 'POST',
      body: JSON.stringify(tokenData),
    });
  },

  triggerTestPhonePush() {
    return this.request('/notifications/test-phone-push', {
      method: 'POST',
    });
  },

  configureTelegramPush(botToken, chatId) {
    return this.request('/notifications/configure-telegram', {
      method: 'POST',
      body: JSON.stringify({ botToken, chatId }),
    });
  },

  triggerTestReminder() {
    return this.request('/notifications/test-reminder', {
      method: 'POST',
    });
  },
};
