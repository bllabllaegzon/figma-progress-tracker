import { getTeamProjects, getProjectFiles } from '@/lib/figma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('team_id')
  const projectId = searchParams.get('project_id')

  try {
    if (projectId) {
      const data = await getProjectFiles(projectId)
      return Response.json({ files: data.files ?? [] })
    }

    if (teamId) {
      const data = await getTeamProjects(teamId)
      const projects = data.projects ?? []
      const allFiles = await Promise.all(
        projects.map((p: { id: string }) => getProjectFiles(p.id).then((r) => r.files ?? []))
      )
      return Response.json({ files: allFiles.flat() })
    }

    return Response.json({ error: 'Provide team_id or project_id' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.includes('not set') ? 400 : 502
    return Response.json({ error: message }, { status })
  }
}
