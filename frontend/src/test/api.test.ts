/**
 * Unit tests for the API client utility.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiCall, API_BASE_URL } from '../api/client'

describe('API_BASE_URL', () => {
  it('defaults to /api when VITE_API_BASE_URL is not set', () => {
    expect(API_BASE_URL).toBe('/api')
  })
})

describe('apiCall', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns mock fallback when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const result = await apiCall('/test', {}, { ok: true })
    expect(result).toEqual({ ok: true })
  })

  it('returns mock fallback when server returns non-ok status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Internal Server Error',
      })
    )
    const fallback = { error: 'mock' }
    const result = await apiCall('/test', {}, fallback)
    expect(result).toEqual(fallback)
  })

  it('throws when fetch fails and no mock fallback is provided', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    await expect(apiCall('/test')).rejects.toThrow()
  })

  it('attaches Bearer token from localStorage when present', async () => {
    localStorage.setItem('token', 'my-test-token')
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await apiCall('/protected')

    const calledHeaders = mockFetch.mock.calls[0][1].headers
    expect(calledHeaders['Authorization']).toBe('Bearer my-test-token')
  })

  it('does not attach Authorization header when no token in localStorage', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await apiCall('/public')

    const calledHeaders = mockFetch.mock.calls[0][1].headers
    expect(calledHeaders['Authorization']).toBeUndefined()
  })

  it('does not set Content-Type for FormData bodies', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ uploaded: true }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const formData = new FormData()
    formData.append('file', new Blob(['test']), 'test.jpg')
    await apiCall('/upload', { method: 'POST', body: formData })

    const calledHeaders = mockFetch.mock.calls[0][1].headers
    expect(calledHeaders['Content-Type']).toBeUndefined()
  })
})
