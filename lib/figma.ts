const FIGMA_API_BASE = 'https://api.figma.com/v1'

function getToken(): string {
  const token = process.env.FIGMA_API_TOKEN
  if (!token || token === 'your_figma_token_here') {
    throw new Error('FIGMA_API_TOKEN is not set in .env.local')
  }
  return token
}

async function figmaFetch(path: string) {
  const res = await fetch(`${FIGMA_API_BASE}${path}`, {
    headers: { 'X-Figma-Token': getToken() },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Figma API error ${res.status}: ${body}`)
  }
  return res.json()
}

export async function getMe() {
  return figmaFetch('/me')
}

export async function getTeamProjects(teamId: string) {
  return figmaFetch(`/teams/${teamId}/projects`)
}

export async function getProjectFiles(projectId: string) {
  return figmaFetch(`/projects/${projectId}/files`)
}

export async function getFile(fileKey: string) {
  return figmaFetch(`/files/${fileKey}`)
}

export async function getFileComponents(fileKey: string) {
  return figmaFetch(`/files/${fileKey}/components`)
}

export async function getFileComments(fileKey: string) {
  return figmaFetch(`/files/${fileKey}/comments`)
}

export async function getFileThumbnail(fileKey: string): Promise<string | null> {
  try {
    const data = await figmaFetch(`/files/${fileKey}`)
    return data.thumbnailUrl ?? null
  } catch {
    return null
  }
}

export async function getUserFiles() {
  const me = await getMe()
  return me
}
