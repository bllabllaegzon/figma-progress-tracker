import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/figma/files/route'

vi.mock('@/lib/figma', () => ({
  getMe: vi.fn(),
}))

import { getMe } from '@/lib/figma'

const mockGetMe = vi.mocked(getMe)

describe('GET /api/figma/files', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns user data on success', async () => {
    const user = { id: '1', handle: 'testuser', email: 'test@example.com' }
    mockGetMe.mockResolvedValueOnce(user)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ user })
  })

  it('returns 400 when token is not set', async () => {
    mockGetMe.mockRejectedValueOnce(new Error('FIGMA_API_TOKEN is not set in .env.local'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('not set')
  })

  it('returns 502 on Figma API error', async () => {
    mockGetMe.mockRejectedValueOnce(new Error('Figma API error 401: Unauthorized'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body.error).toContain('Figma API error')
  })

  it('returns 502 on unknown error object', async () => {
    mockGetMe.mockRejectedValueOnce('something non-error')

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body.error).toBe('Unknown error')
  })
})
