export const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Generic API client wrapper around fetch that handles JSON and errors.
 */
export async function apiCall<T>(
  endpoint: string, 
  options: RequestInit = {}, 
  mockFallback?: T
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return await response.json() as T;
  } catch (error) {
    console.warn(`[API WARNING] Failed to fetch ${url}. Using mock fallback if provided.`, error);
    if (mockFallback !== undefined) {
      return mockFallback;
    }
    throw error;
  }
}
