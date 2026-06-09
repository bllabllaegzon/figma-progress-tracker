import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/figma/project-files/route'

vi.mock('@/lib/figma', () => ({
  getTeamProjects: vi.fn(),
  getProjectFiles: vi.fn(),
}))

import { getTeamProjects, getProjectFiles } from '@/lib/figma'

const mockGetTeamProjects = vi.mocked(getTeamProjects)
const mockGetProjectFiles = vi.mocked(getProjectFiles)

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/figma/project-files')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString())
}

describe('GET /api/figma/project-files', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns files for a project_id', async () => {
    const files = [{ key: 'f1', name: 'File 1' }]
    mockGetProjectFiles.mockResolvedValueOnce({ files })

    const response = await GET(makeRequest({ project_id: 'proj-1' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ files })
    expect(mockGetProjectFiles).toHaveBeenCalledWith('proj-1')
  })

  it('returns empty files array when project has no files', async () => {
    mockGetProjectFiles.mockResolvedValueOnce({ files: undefined })

    const response = await GET(makeRequest({ project_id: 'proj-empty' }))
    const body = await response.json()

    expect(body.files).toEqual([])
  })

  it('returns flattened files for a team_id', async () => {
    mockGetTeamProjects.mockResolvedValueOnce({ projects: [{ id: 'p1' }, { id: 'p2' }] })
    mockGetProjectFiles
      .mockResolvedValueOnce({ files: [{ key: 'f1', name: 'File 1' }] })
      .mockResolvedValueOnce({ files: [{ key: 'f2', name: 'File 2' }] })

    const response = await GET(makeRequest({ team_id: 'team-abc' }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.files).toHaveLength(2)
    expect(body.files.map((f: { key: string }) => f.key)).toContain('f1')
    expect(body.files.map((f: { key: string }) => f.key)).toContain('f2')
  })

  it('returns empty array when team has no projects', async () => {
    mockGetTeamProjects.mockResolvedValueOnce({ projects: undefined })

    const response = await GET(makeRequest({ team_id: 'team-empty' }))
    const body = await response.json()

    expect(body.files).toEqual([])
  })

  it('returns 400 when neither team_id nor project_id provided', async () => {
    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('team_id or project_id')
  })

  it('returns 400 when token is not set', async () => {
    mockGetProjectFiles.mockRejectedValueOnce(new Error('FIGMA_API_TOKEN is not set in .env.local'))

    const response = await GET(makeRequest({ project_id: 'proj-1' }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('not set')
  })

  it('returns 502 on Figma API failure', async () => {
    mockGetProjectFiles.mockRejectedValueOnce(new Error('Figma API error 500: Internal'))

    const response = await GET(makeRequest({ project_id: 'proj-1' }))
    const body = await response.json()

    expect(response.status).toBe(502)
  })
})
