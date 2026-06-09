import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    const db = getDb()
    const tasks = projectId
      ? db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC').all(projectId)
      : db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all()

    return Response.json({ tasks })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { project_id, title, description, status } = body

    if (!project_id || !title) {
      return Response.json({ error: 'project_id and title are required' }, { status: 400 })
    }

    const db = getDb()
    const result = db
      .prepare('INSERT INTO tasks (project_id, title, description, status) VALUES (?, ?, ?, ?)')
      .run(project_id, title, description ?? null, status ?? 'todo')

    db.prepare("INSERT INTO progress_logs (project_id, task_id, message) VALUES (?, ?, ?)").run(
      project_id,
      result.lastInsertRowid,
      `Task created: "${title}"`
    )

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid)
    return Response.json({ task }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, status, title, description } = body

    if (!id) {
      return Response.json({ error: 'id is required' }, { status: 400 })
    }

    const db = getDb()
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as { status: string; project_id: number } | undefined
    if (!existing) {
      return Response.json({ error: 'Task not found' }, { status: 404 })
    }

    db.prepare(`
      UPDATE tasks SET
        status = COALESCE(?, status),
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(status ?? null, title ?? null, description ?? null, id)

    if (status && status !== existing.status) {
      db.prepare("INSERT INTO progress_logs (project_id, task_id, message) VALUES (?, ?, ?)").run(
        existing.project_id,
        id,
        `Status changed to "${status}"`
      )
    }

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
    return Response.json({ task })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
