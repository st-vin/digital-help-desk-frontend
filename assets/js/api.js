/* ============================================================
   MKU Helpdesk — Shared API helper + Auth utilities
   Base URL: http://localhost:7777
   ============================================================ */

const API_BASE = 'http://localhost:7777';

// ── Auth storage helpers ──────────────────────────────────────
export const auth = {
  save(data) {
    localStorage.setItem('mku_token',    data.token    || '');
    localStorage.setItem('mku_role',     data.role     || '');
    localStorage.setItem('mku_name',     data.fullName || '');
    localStorage.setItem('mku_userId',   String(data.userId || ''));
  },
  token()  { return localStorage.getItem('mku_token')  || ''; },
  role()   { return localStorage.getItem('mku_role')   || ''; },
  name()   { return localStorage.getItem('mku_name')   || ''; },
  userId() { return localStorage.getItem('mku_userId') || ''; },
  clear()  {
    ['mku_token','mku_role','mku_name','mku_userId'].forEach(k => localStorage.removeItem(k));
  },
  isLoggedIn() { return !!this.token(); },

  /** Redirect to login if not authenticated, or if wrong role */
  requireRole(...roles) {
    if (!this.isLoggedIn()) {
      window.location.href = rootPath() + 'index.html';
      return false;
    }
    if (roles.length && !roles.includes(this.role())) {
      window.location.href = rootPath() + 'index.html';
      return false;
    }
    return true;
  },

  /** After login redirect to the right dashboard */
  redirectByRole() {
    const role = this.role();
    const root = rootPath();
    if (role === 'STUDENT') {
      window.location.href = root + 'student/dashboard.html';
    } else if (role === 'STAFF') {
      window.location.href = root + 'staff/dashboard.html';
    } else if (role === 'ADMIN') {
      window.location.href = root + 'admin/dashboard.html';
    } else {
      window.location.href = root + 'index.html';
    }
  },

  logout() {
    this.clear();
    window.location.href = rootPath() + 'index.html';
  }
};

/** Derive path back to project root from current page depth */
function rootPath() {
  const depth = window.location.pathname.split('/').filter(Boolean).length - 1;
  if (depth <= 0) return './';
  return '../'.repeat(depth);
}

// ── Core fetch wrapper ────────────────────────────────────────
/**
 * apiFetch(path, options?)
 *   path    – API path, e.g. '/api/v1/tickets'
 *   options – standard fetch options + optional `token` override
 */
export async function apiFetch(path, options = {}) {
  const { token: tokenOverride, ...fetchOpts } = options;
  const token = tokenOverride || auth.token();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...fetchOpts.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOpts,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    auth.clear();
    window.location.href = rootPath() + 'index.html';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const err = await response.json();
      msg = err.message || err.error || JSON.stringify(err);
    } catch (_) { /* body may be empty */ }
    throw new Error(msg);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// ── Convenience wrappers ──────────────────────────────────────
export const api = {
  get:    (path, opts)       => apiFetch(path, { method: 'GET', ...opts }),
  post:   (path, body, opts) => apiFetch(path, { method: 'POST',  body: JSON.stringify(body), ...opts }),
  put:    (path, body, opts) => apiFetch(path, { method: 'PUT',   body: JSON.stringify(body), ...opts }),
  delete: (path, opts)       => apiFetch(path, { method: 'DELETE', ...opts }),
};

// ── Domain helpers ────────────────────────────────────────────
export const ticketApi = {
  myTickets:    ()         => api.get('/api/v1/tickets'),
  submit:       (data)     => api.post('/api/v1/tickets', data),
  detail:       (id)       => api.get(`/api/v1/tickets/${id}`),
  close:        (id)       => api.put(`/api/v1/tickets/${id}/close`, {}),
  categories:   ()         => api.get('/api/v1/tickets/categories'),
  comments:     (id)       => api.get(`/api/v1/tickets/${id}/comments`),
  addComment:   (id, body) => api.post(`/api/v1/tickets/${id}/comments`, body),
};

export const staffApi = {
  allTickets:   (params)   => api.get('/api/v1/staff/tickets' + buildQuery(params)),
  detail:       (id)       => api.get(`/api/v1/staff/tickets/${id}`),
  assignSelf:   (id)       => api.put(`/api/v1/staff/tickets/${id}/assign`, {}),
  updateStatus: (id, status) => api.put(`/api/v1/staff/tickets/${id}/status`, { status }),
  comments:     (id)       => api.get(`/api/v1/staff/tickets/${id}/comments`),
  addComment:   (id, body) => api.post(`/api/v1/staff/tickets/${id}/comments`, body),
};

export const adminApi = {
  analytics:    ()         => api.get('/api/v1/admin/analytics'),
  listStaff:    ()         => api.get('/api/v1/admin/users'),
  createStaff:  (data)     => api.post('/api/v1/admin/users', data),
  toggleUser:   (id)       => api.put(`/api/v1/admin/users/${id}/toggle`, {}),
};

export const authApi = {
  login:    (data) => api.post('/api/v1/auth/login', data),
  register: (data) => api.post('/api/v1/auth/register', data),
};

// ── UI Utilities ──────────────────────────────────────────────
function buildQuery(params = {}) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== '' && v !== null && v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return q ? '?' + q : '';
}

/** Set user name in .top-bar-user spans */
export function renderNavUser() {
  document.querySelectorAll('[data-user-name]').forEach(el => {
    el.textContent = auth.name();
  });
  document.querySelectorAll('[data-user-role]').forEach(el => {
    el.textContent = auth.role();
  });
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', e => { e.preventDefault(); auth.logout(); });
  });
}

/** Simple toast notification */
export function toast(msg, type = 'default') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/** Show/hide alert element */
export function showAlert(el, msg, type = 'error') {
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type}`;
  el.classList.remove('hidden');
}
export function hideAlert(el) {
  if (el) el.classList.add('hidden');
}

/** Format ISO date strings */
export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function formatDateShort(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

/** Status badge HTML */
export function statusBadge(status) {
  const map = {
    OPEN:        ['badge-open',       'Open'],
    IN_PROGRESS: ['badge-inprogress', 'In Progress'],
    RESOLVED:    ['badge-resolved',   'Resolved'],
    CLOSED:      ['badge-closed',     'Closed'],
  };
  const [cls, label] = map[status] || ['badge-open', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

/** Priority badge HTML */
export function priorityBadge(priority) {
  const map = {
    LOW:      ['badge-low',      'Low'],
    MEDIUM:   ['badge-medium',   'Medium'],
    HIGH:     ['badge-high',     'High'],
    CRITICAL: ['badge-critical', '⚡ Critical'],
  };
  const [cls, label] = map[priority] || ['badge-low', priority];
  return `<span class="badge ${cls}">${label}</span>`;
}

/** SLA breach check — overdue if OPEN/IN_PROGRESS and older than 48h */
export function isSLABreached(ticket) {
  if (['RESOLVED','CLOSED'].includes(ticket.status)) return false;
  const created = new Date(ticket.createdAt);
  const hoursOld = (Date.now() - created) / 3600000;
  return hoursOld > 48;
}

/** Get URL search param */
export function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
