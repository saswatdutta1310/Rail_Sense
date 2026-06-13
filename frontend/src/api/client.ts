// In dev (Vite proxy) use relative /api so the proxy kicks in.
// In production (FastAPI serves the SPA) also use relative /api.
// Only fall back to the explicit localhost URL if VITE_API_BASE_URL is set.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/**
 * Generic API client wrapper around fetch that handles JSON and errors.
 * Automatically attaches the Bearer token from localStorage when present.
 */
export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  mockFallback?: T
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    console.warn(`[API WARNING] Failed to fetch ${url}. Using mock fallback if provided.`, error);
    if (mockFallback !== undefined) {
      return mockFallback;
    }
    throw error;
  }
}
