import { buildUrl } from './api.config';

function getAuthToken(): string | null {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function parseError(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    try {
      const data = await response.json();
      return data.message || data.detail || response.statusText;
    } catch {
      return response.statusText;
    }
  }
  return response.statusText;
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export const httpClient = {
  get: async <T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> => {
    const url = params ? `${path}${buildQueryString(params)}` : path;
    const response = await fetch(buildUrl(url), { method: 'GET', headers: buildHeaders() });
    if (!response.ok) throw new Error(await parseError(response));
    return response.json();
  },

  post: async <T>(path: string, body: unknown): Promise<T> => {
    const response = await fetch(buildUrl(path), {
      method: 'POST', headers: buildHeaders(), body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(await parseError(response));
    return response.json();
  },

  put: async <T>(path: string, body: unknown): Promise<T> => {
    const response = await fetch(buildUrl(path), {
      method: 'PUT', headers: buildHeaders(), body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(await parseError(response));
    return response.json();
  },

  patch: async <T>(path: string, body: unknown): Promise<T> => {
    const response = await fetch(buildUrl(path), {
      method: 'PATCH', headers: buildHeaders(), body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(await parseError(response));
    // 204 No Content — brak body (np. PATCH opening-hours)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }
    return response.json();
  },

  delete: async (path: string): Promise<void> => {
    const response = await fetch(buildUrl(path), { method: 'DELETE', headers: buildHeaders() });
    if (!response.ok) throw new Error(await parseError(response));
  },
};
