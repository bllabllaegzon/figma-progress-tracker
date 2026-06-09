import { getMe } from '@/lib/figma'

export async function GET() {
  try {
    const me = await getMe()
    return Response.json({ user: me })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status = message.includes('not set') ? 400 : 502
    return Response.json({ error: message }, { status })
  }
}
