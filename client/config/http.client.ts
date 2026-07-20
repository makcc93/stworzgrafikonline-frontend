import { buildUrl } from './api.config';

/**
 * Globalna obsługa wygaśnięcia sesji (401 Unauthorized).
 *
 * Token JWT wygasa po pewnym czasie — to normalne. Bez tej obsługi każde
 * kolejne żądanie API kończyło się ogólnym błędem ("nie udało się załadować...")
 * bez żadnej wskazówki, że trzeba się zalogować ponownie, i bez przekierowania.
 * Użytkownik zostawał "uwięziony" w martwej aplikacji.
 *
 * Rozwiązanie: przy pierwszym 401 wysyłamy globalne zdarzenie, na które
 * nasłuchuje AppContext — czyści sesję, pokazuje czytelny komunikat
 * i przekierowuje do ekranu logowania. Flaga `sessionExpiredHandled`
 * zapobiega wielokrotnemu odpaleniu tej logiki, gdy w tym samym momencie
 * wygasłym tokenem kończy się kilka równoległych żądań naraz.
 */
export const SESSION_EXPIRED_EVENT = 'auth:session-expired';
let sessionExpiredHandled = false;

export function notifySessionExpired(): void {
  if (sessionExpiredHandled) return;
  sessionExpiredHandled = true;
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

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

/**
 * Wspólna obsługa błędnych odpowiedzi. Dla 401 dodatkowo odpala globalne
 * wylogowanie (patrz notifySessionExpired powyżej) zanim rzuci błędem —
 * dzięki temu AppContext zdąży przekierować użytkownika, zanim komponent
 * wyświetli swój własny (ogólny) toast błędu.
 */
async function handleErrorResponse(response: Response): Promise<never> {
  if (response.status === 401) {
    notifySessionExpired();
    throw new Error('Sesja wygasła — zaloguj się ponownie.');
  }
  throw new Error(await parseError(response));
}

export const httpClient = {
  get: async <T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> => {
    const url = params ? `${path}${buildQueryString(params)}` : path;
    const response = await fetch(buildUrl(url), { method: 'GET', headers: buildHeaders() });
    if (!response.ok) return handleErrorResponse(response);
    return response.json();
  },

  post: async <T>(path: string, body: unknown): Promise<T> => {
    const response = await fetch(buildUrl(path), {
      method: 'POST', headers: buildHeaders(), body: JSON.stringify(body),
    });
    if (!response.ok) return handleErrorResponse(response);
    return response.json();
  },

  put: async <T>(path: string, body: unknown): Promise<T> => {
    const response = await fetch(buildUrl(path), {
      method: 'PUT', headers: buildHeaders(), body: JSON.stringify(body),
    });
    if (!response.ok) return handleErrorResponse(response);
    return response.json();
  },

  patch: async <T>(path: string, body: unknown): Promise<T> => {
    const response = await fetch(buildUrl(path), {
      method: 'PATCH', headers: buildHeaders(), body: JSON.stringify(body),
    });
    if (!response.ok) return handleErrorResponse(response);
    // 204 No Content — brak body (np. PATCH opening-hours)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }
    return response.json();
  },

  delete: async (path: string): Promise<void> => {
    const response = await fetch(buildUrl(path), { method: 'DELETE', headers: buildHeaders() });
    if (!response.ok) return handleErrorResponse(response);
  },
};
