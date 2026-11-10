// Countly API Client

export interface UserSession {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    businesses: { id: string; name: string; role: 'owner' | 'manager'; branchId?: string }[];
  };
}

export interface EmployeeSessionData {
  employeeToken: string;
  assignment: {
    id: string;
    employeeName: string;
    auditId: string;
    auditName: string;
  };
}

const TOKEN_KEY = 'countly_auth_token';
const EMP_TOKEN_KEY = 'countly_emp_token';
const THEME_KEY = 'countly_theme';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function getStoredEmpToken(): string | null {
  try {
    return localStorage.getItem(EMP_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredEmpToken(token: string | null) {
  try {
    if (token) localStorage.setItem(EMP_TOKEN_KEY, token);
    else localStorage.removeItem(EMP_TOKEN_KEY);
  } catch {}
}

export function getStoredTheme(): 'light' | 'dark' {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'light' || t === 'dark') return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function setStoredTheme(theme: 'light' | 'dark') {
  try {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch {}
}

async function request<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const method = options.method || 'GET';
  const headers = new Headers(options.headers || {});

  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const empToken = getStoredEmpToken();
  if (empToken && !headers.has('X-Employee-Token')) {
    headers.set('X-Employee-Token', empToken);
  }

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(endpoint, {
    method,
    headers,
    body:
      options.body && typeof options.body === 'object' && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (payload: { email: string; password: string; displayName: string; businessName: string; businessType?: string; branchName?: string }) =>
    request<UserSession>('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload: { email: string; password: string }) =>
    request<UserSession>('/api/auth/login', { method: 'POST', body: payload }),
  logout: () => {
    setStoredToken(null);
    return request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }).catch(() => ({ success: true }));
  },
  me: () => request<{ user: UserSession['user'] }>('/api/auth/me'),

  // Demo
  demoLogin: (role: 'owner' | 'employee' = 'owner') =>
    request<any>('/api/demo/login', { method: 'POST', body: { role } }),
  demoSeed: () => request<any>('/api/demo/seed', { method: 'POST' }),

  // Businesses & Branches
  getBusinesses: () => request<{ businesses: any[] }>('/api/businesses'),
  getBranches: (businessId: string) => request<{ branches: any[] }>(`/api/branches?businessId=${encodeURIComponent(businessId)}`),
  createBranch: (payload: { businessId: string; name: string }) =>
    request<{ branch: any }>('/api/branches', { method: 'POST', body: payload }),

  // Categories
  getCategories: (businessId: string) => request<{ categories: any[] }>(`/api/categories?businessId=${encodeURIComponent(businessId)}`),
  createCategory: (payload: { businessId: string; name: string; parentId?: string }) =>
    request<{ category: any }>('/api/categories', { method: 'POST', body: payload }),

  // Products
  getProducts: (businessId: string, branchId?: string) =>
    request<{ products: any[] }>(
      `/api/products?businessId=${encodeURIComponent(businessId)}${branchId ? `&branchId=${encodeURIComponent(branchId)}` : ''}`
    ),
  createProduct: (payload: any) => request<{ id: string; success: boolean }>('/api/products', { method: 'POST', body: payload }),
  updateProduct: (id: string, payload: any) => request<{ success: boolean }>(`/api/products/${id}`, { method: 'PUT', body: payload }),
  deleteProduct: (id: string, businessId: string) =>
    request<{ success: boolean }>(`/api/products/${id}?businessId=${encodeURIComponent(businessId)}`, { method: 'DELETE' }),
  importProducts: (payload: { businessId: string; branchId?: string; items: any[] }) =>
    request<{ success: boolean; count: number }>('/api/products/import', { method: 'POST', body: payload }),

  // Inventory
  getInventory: (businessId: string, branchId?: string) =>
    request<{ balances: any[] }>(
      `/api/inventory?businessId=${encodeURIComponent(businessId)}${branchId ? `&branchId=${encodeURIComponent(branchId)}` : ''}`
    ),
  adjustInventory: (payload: { businessId: string; branchId: string; variantId: string; quantity: number; reason: string }) =>
    request<{ success: boolean; before: number; after: number }>('/api/inventory/adjust', { method: 'POST', body: payload }),

  // Audits
  getAudits: (businessId: string) => request<{ audits: any[] }>(`/api/audits?businessId=${encodeURIComponent(businessId)}`),
  createAudit: (payload: { businessId: string; branchId: string; name: string; description?: string; deadline?: string }) =>
    request<{ auditId: string; joinCode: string; lineCount: number; success: boolean }>('/api/audits', { method: 'POST', body: payload }),
  getAuditDetail: (id: string, businessId: string) =>
    request<{ audit: any; lines: any[]; totals: any; assignments: any[] }>(
      `/api/audits/${id}?businessId=${encodeURIComponent(businessId)}`
    ),
  updateAuditStatus: (id: string, businessId: string, status: string) =>
    request<{ success: boolean; status: string }>(`/api/audits/${id}/status`, {
      method: 'PUT',
      body: { businessId, status }
    }),
  resolveDuplicate: (id: string, businessId: string, payload: { variantId: string; resolvedQuantity: number; reason: string }) =>
    request<{ success: boolean }>(`/api/audits/${id}/duplicate-resolve`, {
      method: 'POST',
      body: { businessId, ...payload }
    }),
  requestRecount: (id: string, businessId: string, payload: { variantId: string; reason: string }) =>
    request<{ success: boolean }>(`/api/audits/${id}/recount-request`, {
      method: 'POST',
      body: { businessId, ...payload }
    }),
  reconcileAudit: (id: string, businessId: string) =>
    request<{ success: boolean; count: number }>(`/api/audits/${id}/reconcile`, {
      method: 'POST',
      body: { businessId }
    }),

  // Assignments & Invitations
  getAssignments: (auditId: string, businessId: string) =>
    request<{ assignments: any[] }>(`/api/audits/${auditId}/assignments?businessId=${encodeURIComponent(businessId)}`),
  createAssignment: (auditId: string, businessId: string, payload: { employeeName: string; pin?: string }) =>
    request<{ assignmentId: string; employeeName: string; pin: string; success: boolean }>(
      `/api/audits/${auditId}/assignments`,
      {
        method: 'POST',
        body: { businessId, ...payload }
      }
    ),
  revokeAssignment: (auditId: string, assignmentId: string, businessId: string) =>
    request<{ success: boolean }>(`/api/audits/${auditId}/assignments/${assignmentId}?businessId=${encodeURIComponent(businessId)}`, {
      method: 'DELETE'
    }),

  // Employee Workspace
  employeeJoin: (payload: { code: string; pin: string; employeeName?: string }) =>
    request<EmployeeSessionData>('/api/employee/join', { method: 'POST', body: payload }),
  getEmployeeAudit: () => request<{ audit: any; items: any[] }>('/api/employee/audit'),
  employeeSaveCount: (payload: { variantId: string; quantity: number; note?: string }) =>
    request<{ success: boolean; entryId: string; updated: boolean }>('/api/employee/count', { method: 'POST', body: payload }),
  employeeSubmit: () => request<{ success: boolean; message: string }>('/api/employee/submit', { method: 'POST' }),
  employeeRequestProduct: (payload: { name: string; sku?: string; category?: string; variant?: string; quantity?: number; note?: string }) =>
    request<{ success: boolean; requestId: string }>('/api/employee/request-product', { method: 'POST', body: payload }),

  // Product Requests (Owner)
  getProductRequests: (businessId: string) =>
    request<{ requests: any[] }>(`/api/product-requests?businessId=${encodeURIComponent(businessId)}`),
  reviewProductRequest: (id: string, businessId: string, action: 'approve' | 'reject', reviewNote?: string) =>
    request<{ success: boolean }>(`/api/product-requests/${id}/review`, {
      method: 'POST',
      body: { businessId, action, reviewNote }
    })
};

