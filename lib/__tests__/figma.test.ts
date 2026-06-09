import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getMe, getTeamProjects, getProjectFiles, getFile, getFileComponents, getFileComments, getFileThumbnail, getUserFiles } from '@/lib/figma'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeOkResponse(body: unknown) {
  return {
    ok: true,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }
}

function makeErrorResponse(status: number, body: string) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ error: body }),
    text: () => Promise.resolve(body),
  }
}

describe('lib/figma', () => {
  beforeEach(() => {
    vi.stubEnv('FIGMA_API_TOKEN', 'test-token-123')
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('getMe', () => {
    it('returns user data on success', async () => {
      const user = { id: '1', handle: 'testuser', email: 'test@example.com' }
      mockFetch.mockResolvedValueOnce(makeOkResponse(user))

      const result = await getMe()

      expect(result).toEqual(user)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/me',
        expect.objectContaining({ headers: { 'X-Figma-Token': 'test-token-123' } })
      )
    })

    it('throws when FIGMA_API_TOKEN is not set', async () => {
      vi.stubEnv('FIGMA_API_TOKEN', '')

      await expect(getMe()).rejects.toThrow('FIGMA_API_TOKEN is not set')
    })

    it('throws when FIGMA_API_TOKEN is the placeholder value', async () => {
      vi.stubEnv('FIGMA_API_TOKEN', 'your_figma_token_here')

      await expect(getMe()).rejects.toThrow('FIGMA_API_TOKEN is not set')
    })

    it('throws on Figma API error response', async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse(401, 'Unauthorized'))

      await expect(getMe()).rejects.toThrow('Figma API error 401: Unauthorized')
    })
  })

  describe('getTeamProjects', () => {
    it('fetches projects for a team', async () => {
      const projects = { projects: [{ id: 'p1', name: 'Project 1' }] }
      mockFetch.mockResolvedValueOnce(makeOkResponse(projects))

      const result = await getTeamProjects('team-abc')

      expect(result).toEqual(projects)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/teams/team-abc/projects',
        expect.anything()
      )
    })

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse(403, 'Forbidden'))

      await expect(getTeamProjects('team-abc')).rejects.toThrow('Figma API error 403: Forbidden')
    })
  })

  describe('getProjectFiles', () => {
    it('fetches files for a project', async () => {
      const files = { files: [{ key: 'f1', name: 'File 1' }] }
      mockFetch.mockResolvedValueOnce(makeOkResponse(files))

      const result = await getProjectFiles('proj-123')

      expect(result).toEqual(files)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/projects/proj-123/files',
        expect.anything()
      )
    })
  })

  describe('getFile', () => {
    it('fetches a file by key', async () => {
      const file = { key: 'abc', name: 'My File', document: {} }
      mockFetch.mockResolvedValueOnce(makeOkResponse(file))

      const result = await getFile('abc')

      expect(result).toEqual(file)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/files/abc',
        expect.anything()
      )
    })
  })

  describe('getFileComponents', () => {
    it('fetches components for a file', async () => {
      const components = { meta: { components: [] } }
      mockFetch.mockResolvedValueOnce(makeOkResponse(components))

      const result = await getFileComponents('abc')

      expect(result).toEqual(components)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/files/abc/components',
        expect.anything()
      )
    })
  })

  describe('getFileComments', () => {
    it('fetches comments for a file', async () => {
      const comments = { comments: [{ id: 'c1', message: 'Hello' }] }
      mockFetch.mockResolvedValueOnce(makeOkResponse(comments))

      const result = await getFileComments('abc')

      expect(result).toEqual(comments)
    })
  })

  describe('getFileThumbnail', () => {
    it('returns thumbnailUrl when present', async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ thumbnailUrl: 'https://example.com/thumb.png' }))

      const result = await getFileThumbnail('abc')

      expect(result).toBe('https://example.com/thumb.png')
    })

    it('returns null when thumbnailUrl is missing', async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ key: 'abc' }))

      const result = await getFileThumbnail('abc')

      expect(result).toBeNull()
    })

    it('returns null on API error instead of throwing', async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse(404, 'Not found'))

      const result = await getFileThumbnail('abc')

      expect(result).toBeNull()
    })
  })

  describe('getUserFiles', () => {
    it('returns me data (delegates to getMe)', async () => {
      const me = { id: '1', handle: 'testuser' }
      mockFetch.mockResolvedValueOnce(makeOkResponse(me))

      const result = await getUserFiles()

      expect(result).toEqual(me)
    })
  })
})
