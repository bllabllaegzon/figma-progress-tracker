import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import path from 'path'

vi.mock('better-sqlite3', async () => {
  const actual = await vi.importActual<typeof import('better-sqlite3')>('better-sqlite3')
  return { default: actual.default }
})

describe('lib/db', () => {
  let testDb: InstanceType<typeof Database>

  beforeEach(() => {
    vi.resetModules()
    testDb = new Database(':memory:')
    testDb.pragma('journal_mode = WAL')
    testDb.pragma('foreign_keys = ON')
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        figma_file_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        thumbnail_url TEXT,
        last_modified TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS progress_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT NOT NULL DEFAULT '#6366f1'
      );
      CREATE TABLE IF NOT EXISTS project_tags (
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (project_id, tag_id)
      );
    `)
  })

  afterEach(() => {
    testDb.close()
  })

  describe('projects table', () => {
    it('inserts and retrieves a project', () => {
      testDb.prepare(
        'INSERT INTO projects (figma_file_key, name) VALUES (?, ?)'
      ).run('key-abc', 'My Project')

      const project = testDb.prepare('SELECT * FROM projects WHERE figma_file_key = ?').get('key-abc') as {
        figma_file_key: string; name: string; thumbnail_url: string | null
      }

      expect(project.figma_file_key).toBe('key-abc')
      expect(project.name).toBe('My Project')
      expect(project.thumbnail_url).toBeNull()
    })

    it('enforces unique figma_file_key constraint', () => {
      testDb.prepare('INSERT INTO projects (figma_file_key, name) VALUES (?, ?)').run('dup-key', 'First')

      expect(() => {
        testDb.prepare('INSERT INTO projects (figma_file_key, name) VALUES (?, ?)').run('dup-key', 'Second')
      }).toThrow()
    })

    it('supports upsert on conflict', () => {
      testDb.prepare('INSERT INTO projects (figma_file_key, name) VALUES (?, ?)').run('upsert-key', 'Original')
      testDb.prepare(`
        INSERT INTO projects (figma_file_key, name)
        VALUES (?, ?)
        ON CONFLICT(figma_file_key) DO UPDATE SET name = excluded.name
      `).run('upsert-key', 'Updated')

      const project = testDb.prepare('SELECT name FROM projects WHERE figma_file_key = ?').get('upsert-key') as { name: string }
      expect(project.name).toBe('Updated')
    })
  })

  describe('tasks table', () => {
    let projectId: number

    beforeEach(() => {
      const res = testDb.prepare('INSERT INTO projects (figma_file_key, name) VALUES (?, ?)').run('task-project', 'Task Project')
      projectId = Number(res.lastInsertRowid)
    })

    it('inserts a task with default status todo', () => {
      testDb.prepare('INSERT INTO tasks (project_id, title) VALUES (?, ?)').run(projectId, 'First Task')

      const task = testDb.prepare('SELECT * FROM tasks WHERE project_id = ?').get(projectId) as {
        title: string; status: string; description: string | null
      }

      expect(task.title).toBe('First Task')
      expect(task.status).toBe('todo')
      expect(task.description).toBeNull()
    })

    it('rejects invalid status values', () => {
      expect(() => {
        testDb.prepare('INSERT INTO tasks (project_id, title, status) VALUES (?, ?, ?)').run(projectId, 'Bad Task', 'invalid')
      }).toThrow()
    })

    it('accepts all valid status values', () => {
      for (const status of ['todo', 'in_progress', 'done']) {
        testDb.prepare('INSERT INTO tasks (project_id, title, status) VALUES (?, ?, ?)').run(projectId, `Task ${status}`, status)
      }

      const tasks = testDb.prepare('SELECT status FROM tasks WHERE project_id = ?').all(projectId) as { status: string }[]
      expect(tasks.map((t) => t.status)).toEqual(['todo', 'in_progress', 'done'])
    })

    it('cascades delete when project is deleted', () => {
      testDb.prepare('INSERT INTO tasks (project_id, title) VALUES (?, ?)').run(projectId, 'Orphan Task')
      testDb.prepare('DELETE FROM projects WHERE id = ?').run(projectId)

      const tasks = testDb.prepare('SELECT * FROM tasks WHERE project_id = ?').all(projectId)
      expect(tasks).toHaveLength(0)
    })
  })

  describe('progress_logs table', () => {
    it('inserts and retrieves a progress log', () => {
      const proj = testDb.prepare('INSERT INTO projects (figma_file_key, name) VALUES (?, ?)').run('log-proj', 'Log Project')
      testDb.prepare('INSERT INTO progress_logs (project_id, message) VALUES (?, ?)').run(proj.lastInsertRowid, 'Project created')

      const log = testDb.prepare('SELECT * FROM progress_logs').get() as { message: string }
      expect(log.message).toBe('Project created')
    })
  })

  describe('tags and project_tags', () => {
    it('inserts a tag with default color', () => {
      testDb.prepare('INSERT INTO tags (name) VALUES (?)').run('design')

      const tag = testDb.prepare('SELECT * FROM tags WHERE name = ?').get('design') as { name: string; color: string }
      expect(tag.color).toBe('#6366f1')
    })

    it('enforces unique tag names', () => {
      testDb.prepare('INSERT INTO tags (name) VALUES (?)').run('unique-tag')

      expect(() => {
        testDb.prepare('INSERT INTO tags (name) VALUES (?)').run('unique-tag')
      }).toThrow()
    })
  })
})
