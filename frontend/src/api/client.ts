/**
 * API base URL resolution:
 *
 * - Local dev (Vite): VITE_API_BASE_URL is not set → use relative '/api'
 *   Vite's proxy forwards /api → http://localhost:8000/api
 *
 * - Vercel production: VITE_API_BASE_URL is set to the Render backend URL
 *   e.g. https://rail-sense-api.onrender.com/api
 *   Set this in Vercel Dashboard → Project Settings → Environment Variables
 *
 * - Unified mode (FastAPI serves the SPA): relative '/api' always works
 */
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '/api';

/**
 * Generic fetch wrapper with JWT auth, JSON handling and mock fallback.
 */
export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  mockFallback?: T,
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
      headers: { ...headers, ...options.headers },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (mockFallback !== undefined) {
      console.warn(`[API] Falling back to mock for ${url}:`, error);
      return mockFallback;
    }
    throw error;
  }
}
