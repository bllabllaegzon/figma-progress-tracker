import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const db = getDb()
    const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all()
    return Response.json({ projects })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { figma_file_key, name, thumbnail_url, last_modified } = body

    if (!figma_file_key || !name) {
      return Response.json({ error: 'figma_file_key and name are required' }, { status: 400 })
    }

    const db = getDb()
    const stmt = db.prepare(`
      INSERT INTO projects (figma_file_key, name, thumbnail_url, last_modified)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(figma_file_key) DO UPDATE SET
        name = excluded.name,
        thumbnail_url = excluded.thumbnail_url,
        last_modified = excluded.last_modified
    `)
    const result = stmt.run(figma_file_key, name, thumbnail_url ?? null, last_modified ?? null)
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid)
    return Response.json({ project }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
