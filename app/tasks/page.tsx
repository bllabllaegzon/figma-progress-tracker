'use client'

import { useState, useEffect } from 'react'

type Task = {
  id: number
  project_id: number
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  created_at: string
}

type Project = {
  id: number
  name: string
}

const COLUMNS: { key: Task['status']; label: string; accent: string }[] = [
  { key: 'todo', label: 'To Do', accent: 'border-t-stone-600' },
  { key: 'in_progress', label: 'In Progress', accent: 'border-t-amber-500' },
  { key: 'done', label: 'Done', accent: 'border-t-emerald-500' },
]

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [filterProjectId, setFilterProjectId] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [filterProjectId])

  async function fetchTasks() {
    const url = filterProjectId ? `/api/tasks?project_id=${filterProjectId}` : '/api/tasks'
    const res = await fetch(url)
    const data = await res.json()
    setTasks(data.tasks ?? [])
  }

  async function fetchProjects() {
    const res = await fetch('/api/projects')
    const data = await res.json()
    setProjects(data.projects ?? [])
  }

  async function updateStatus(id: number, status: Task['status']) {
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
  }

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]))
  const activeProjectId = filterProjectId ? Number(filterProjectId) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-bold text-stone-100">Tasks</h1>
      </div>
      <p className="text-stone-500 text-sm mb-8">Manage design tasks across your projects</p>

      <div className="mb-8 flex items-center gap-3">
        <label className="text-sm text-stone-400 shrink-0">Project</label>
        <select
          value={filterProjectId}
          onChange={(e) => setFilterProjectId(e.target.value)}
          className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-600 min-w-48 text-stone-200"
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {projects.length === 0 ? (
        <p className="text-stone-600 text-sm p-5 bg-stone-900 border border-stone-800 rounded-xl">
          No projects yet. Go to Projects to save your Figma files first.
        </p>
      ) : (
        <div className="grid md:grid-cols-3 gap-5">
          {COLUMNS.map(({ key, label, accent }) => {
            const col = tasks.filter((t) => t.status === key)
            return (
              <div key={key} className={`bg-stone-900 border border-stone-800 border-t-2 ${accent} rounded-xl p-5 flex flex-col`}>
                <h2 className="font-semibold text-sm mb-4 flex items-center justify-between text-stone-200">
                  {label}
                  <span className="text-stone-500 font-normal tabular-nums bg-stone-800 px-2 py-0.5 rounded-full text-xs">{col.length}</span>
                </h2>

                <div className="space-y-3 flex-1">
                  {col.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      projectName={projectMap[task.project_id]}
                      onStatusChange={updateStatus}
                    />
                  ))}
                  {col.length === 0 && (
                    <p className="text-stone-700 text-xs text-center py-8">No tasks</p>
                  )}
                </div>

                <InlineAdd
                  status={key}
                  projectId={activeProjectId}
                  onAdd={fetchTasks}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function InlineAdd({
  status,
  projectId,
  onAdd,
}: {
  status: Task['status']
  projectId: number | null
  onAdd: () => void
}) {
  const [title, setTitle] = useState('')
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !projectId) return
    setSubmitting(true)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, title: title.trim(), status }),
    })
    setTitle('')
    setOpen(false)
    setSubmitting(false)
    onAdd()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={!projectId}
        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-stone-700 text-stone-500 hover:border-amber-600 hover:text-amber-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        {projectId ? 'Add task' : 'Select a project first'}
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title…"
        autoFocus
        spellCheck={true}
        autoCorrect="on"
        autoCapitalize="sentences"
        disabled={submitting}
        className="w-full bg-stone-800 border border-amber-700/60 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!title.trim() || submitting}
          className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
        >
          {submitting ? 'Adding…' : 'Add'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setTitle('') }}
          className="px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-sm text-stone-400 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function TaskCard({
  task,
  projectName,
  onStatusChange,
}: {
  task: Task
  projectName: string
  onStatusChange: (id: number, status: Task['status']) => void
}) {
  const nextStatus: Record<Task['status'], Task['status'] | null> = {
    todo: 'in_progress',
    in_progress: 'done',
    done: null,
  }
  const next = nextStatus[task.status]
  const nextLabel: Record<Task['status'], string> = {
    todo: 'In Progress',
    in_progress: 'Done',
    done: '',
  }

  return (
    <div className="p-4 bg-stone-800 rounded-xl border border-stone-700 hover:border-stone-600 transition-colors group">
      <p className="text-sm font-medium leading-snug text-stone-100">{task.title}</p>
      {task.description && (
        <p className="text-stone-400 text-xs mt-1 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between mt-3">
        <p className="text-stone-600 text-xs truncate">{projectName}</p>
        {next && (
          <button
            onClick={() => onStatusChange(task.id, next)}
            className="text-xs text-stone-500 hover:text-amber-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-2"
          >
            → {nextLabel[task.status]}
          </button>
        )}
      </div>
    </div>
  )
}
