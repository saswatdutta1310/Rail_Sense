/**
 * Unit tests for AuthContext — login / logout / token persistence.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../context/AuthContext'

// ── helper component to expose context values ──────────────────────────────
function AuthDisplay() {
  const { user, token, isLoading } = useAuth()
  if (isLoading) return <div>loading</div>
  if (!token) return <div>not-logged-in</div>
  return <div>{user?.email ?? 'no-user'}</div>
}

// ── helpers ─────────────────────────────────────────────────────────────────
function mockFetchMe(email: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      id: '1',
      email,
      full_name: 'Test User',
      role: 'superadmin',
      station_id: null,
    }),
  })
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── tests ────────────────────────────────────────────────────────────────────
describe('AuthProvider — initial state', () => {
  it('shows not-logged-in when no token in localStorage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    )

    await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())
    expect(screen.getByText('not-logged-in')).toBeInTheDocument()
  })

  it('restores session when valid token is in localStorage', async () => {
    localStorage.setItem('token', 'valid-token')
    vi.stubGlobal('fetch', mockFetchMe('admin@railsense.ai'))

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    )

    await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())
    expect(screen.getByText('admin@railsense.ai')).toBeInTheDocument()
  })

  it('clears token when /auth/me returns 401', async () => {
    localStorage.setItem('token', 'expired-token')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    )

    await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())
    expect(screen.getByText('not-logged-in')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
  })
})

describe('AuthProvider — logout', () => {
  function LogoutButton() {
    const { logout, token } = useAuth()
    return (
      <button onClick={logout}>{token ? 'logged-in' : 'logged-out'}</button>
    )
  }

  it('clears token and user on logout', async () => {
    localStorage.setItem('token', 'valid-token')
    vi.stubGlobal('fetch', mockFetchMe('admin@railsense.ai'))

    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByText('logged-in')).toBeInTheDocument())

    act(() => {
      screen.getByText('logged-in').click()
    })

    expect(screen.getByText('logged-out')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
  })
})
