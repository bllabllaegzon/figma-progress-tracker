'use client'

import { useState, useEffect } from 'react'

type FigmaFile = {
  key: string
  name: string
  thumbnail_url: string
  last_modified: string
}

type Project = {
  id: number
  figma_file_key: string
  name: string
  thumbnail_url: string | null
  last_modified: string | null
}

export default function ProjectsPage() {
  const [figmaFiles, setFigmaFiles] = useState<FigmaFile[]>([])
  const [savedProjects, setSavedProjects] = useState<Project[]>([])
  const [figmaError, setFigmaError] = useState<string | null>(null)
  const [loadingFigma, setLoadingFigma] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [teamId, setTeamId] = useState('')
  const [projectId, setProjectId] = useState('')

  useEffect(() => {
    fetchSavedProjects()
  }, [])

  async function fetchSavedProjects() {
    const res = await fetch('/api/projects')
    const data = await res.json()
    setSavedProjects(data.projects ?? [])
  }

  async function fetchFigmaFiles() {
    setLoadingFigma(true)
    setFigmaError(null)
    setFigmaFiles([])

    const endpoint = projectId
      ? `/api/figma/project-files?project_id=${encodeURIComponent(projectId)}`
      : teamId
      ? `/api/figma/project-files?team_id=${encodeURIComponent(teamId)}`
      : '/api/figma/files'

    const res = await fetch(endpoint)
    const data = await res.json()
    setLoadingFigma(false)

    if (!res.ok) {
      setFigmaError(data.error)
      return
    }

    if (data.files) {
      setFigmaFiles(data.files)
    } else if (data.user) {
      setFigmaError('Connected as ' + data.user.handle + '. Enter a Team ID or Project ID below to list files.')
    }
  }

  useEffect(() => { fetchFigmaFiles() }, [])

  async function saveProject(file: FigmaFile) {
    setSavingKey(file.key)
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        figma_file_key: file.key,
        name: file.name,
        thumbnail_url: file.thumbnail_url,
        last_modified: file.last_modified,
      }),
    })
    await fetchSavedProjects()
    setSavingKey(null)
  }

  const savedKeys = new Set(savedProjects.map((p) => p.figma_file_key))

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1 text-stone-100">Projects</h1>
      <p className="text-stone-500 text-sm mb-8">Browse your Figma files and save them to your tracker</p>

      <div className="mb-8 p-6 bg-stone-900 border border-stone-800 rounded-xl">
        <p className="text-sm font-medium mb-4 text-stone-300">Load files from Figma</p>
        <div className="flex flex-wrap gap-3">
          <input
            className="flex-1 min-w-48 bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-600"
            placeholder="Team ID (optional)"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
          />
          <input
            className="flex-1 min-w-48 bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-600"
            placeholder="Project ID (optional)"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          />
          <button
            onClick={fetchFigmaFiles}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Load
          </button>
        </div>
      </div>

      {figmaError && (
        <div className="mb-6 p-5 bg-stone-900 border border-stone-700 rounded-xl text-stone-300 text-sm">
          {figmaError}
        </div>
      )}

      {loadingFigma && (
        <p className="text-stone-600 text-sm mb-6">Connecting to Figma...</p>
      )}

      {figmaFiles.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-5 text-stone-200">Figma Files</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {figmaFiles.map((file) => (
              <div key={file.key} className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                {file.thumbnail_url && (
                  <img src={file.thumbnail_url} alt={file.name} className="w-full h-36 object-cover bg-stone-800" />
                )}
                <div className="p-4">
                  <p className="font-medium text-sm truncate text-stone-100">{file.name}</p>
                  <p className="text-stone-500 text-xs mt-1">
                    {file.last_modified ? new Date(file.last_modified).toLocaleDateString() : ''}
                  </p>
                  <button
                    onClick={() => saveProject(file)}
                    disabled={savedKeys.has(file.key) || savingKey === file.key}
                    className="mt-4 w-full py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-amber-600 hover:bg-amber-500 text-white disabled:bg-stone-700 disabled:text-stone-400"
                  >
                    {savedKeys.has(file.key) ? 'Saved' : savingKey === file.key ? 'Saving...' : 'Save to Tracker'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-5 text-stone-200">Saved Projects ({savedProjects.length})</h2>
        {savedProjects.length === 0 ? (
          <p className="text-stone-600 text-sm p-5 bg-stone-900 border border-stone-800 rounded-xl">
            No projects saved yet. Load your Figma files above and save them.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedProjects.map((project) => (
              <div key={project.id} className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                {project.thumbnail_url && (
                  <img src={project.thumbnail_url} alt={project.name} className="w-full h-36 object-cover bg-stone-800" />
                )}
                <div className="p-4">
                  <p className="font-medium text-sm truncate text-stone-100">{project.name}</p>
                  <p className="text-stone-500 text-xs mt-1 font-mono">{project.figma_file_key}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
