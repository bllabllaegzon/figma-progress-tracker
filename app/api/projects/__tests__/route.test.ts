import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

let testDb: InstanceType<typeof Database>

vi.mock('@/lib/db', () => ({
  getDb: () => testDb,
}))

import { GET, POST } from '@/app/api/projects/route'

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/projects', () => {
  beforeEach(() => {
    testDb = new Database(':memory:')
    testDb.pragma('foreign_keys = ON')
    testDb.exec(`
      CREATE TABLE projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        figma_file_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        thumbnail_url TEXT,
        last_modified TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)
  })

  afterEach(() => testDb.close())

  it('returns empty projects array when no projects exist', async () => {
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.projects).toEqual([])
  })

  it('returns all projects ordered by created_at DESC', async () => {
    testDb.prepare('INSERT INTO projects (figma_file_key, name) VALUES (?, ?)').run('key-1', 'Alpha')
    testDb.prepare('INSERT INTO projects (figma_file_key, name) VALUES (?, ?)').run('key-2', 'Beta')

    const response = await GET()
    const body = await response.json()

    expect(body.projects).toHaveLength(2)
    expect(body.projects.map((p: { name: string }) => p.name)).toContain('Alpha')
    expect(body.projects.map((p: { name: string }) => p.name)).toContain('Beta')
  })
})

describe('POST /api/projects', () => {
  beforeEach(() => {
    testDb = new Database(':memory:')
    testDb.pragma('foreign_keys = ON')
    testDb.exec(`
      CREATE TABLE projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        figma_file_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        thumbnail_url TEXT,
        last_modified TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)
  })

  afterEach(() => testDb.close())

  it('creates a project and returns 201', async () => {
    const response = await POST(makeRequest({
      figma_file_key: 'new-key',
      name: 'New Project',
      thumbnail_url: 'https://example.com/thumb.png',
      last_modified: '2024-01-01T00:00:00Z',
    }))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.project.figma_file_key).toBe('new-key')
    expect(body.project.name).toBe('New Project')
  })

  it('upserts on duplicate figma_file_key', async () => {
    await POST(makeRequest({ figma_file_key: 'dup-key', name: 'Original' }))
    const response = await POST(makeRequest({ figma_file_key: 'dup-key', name: 'Updated' }))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.project.name).toBe('Updated')
  })

  it('returns 400 when figma_file_key is missing', async () => {
    const response = await POST(makeRequest({ name: 'No Key' }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/figma_file_key.*name|name.*figma_file_key/)
  })

  it('returns 400 when name is missing', async () => {
    const response = await POST(makeRequest({ figma_file_key: 'some-key' }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBeDefined()
  })

  it('uses null for optional fields when not provided', async () => {
    await POST(makeRequest({ figma_file_key: 'bare-key', name: 'Bare Project' }))

    const project = testDb.prepare('SELECT * FROM projects WHERE figma_file_key = ?').get('bare-key') as {
      thumbnail_url: string | null; last_modified: string | null
    }

    expect(project.thumbnail_url).toBeNull()
    expect(project.last_modified).toBeNull()
  })
})
