import { getDb } from '@/lib/db'
import Link from 'next/link'

function getStats() {
  try {
    const db = getDb()
    const totalProjects = (db.prepare('SELECT COUNT(*) as c FROM projects').get() as { c: number }).c
    const totalTasks = (db.prepare('SELECT COUNT(*) as c FROM tasks').get() as { c: number }).c
    const doneTasks = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'done'").get() as { c: number }).c
    const inProgressTasks = (db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'in_progress'").get() as { c: number }).c
    const recentLogs = db.prepare('SELECT * FROM progress_logs ORDER BY created_at DESC LIMIT 5').all() as Array<{ id: number; message: string; created_at: string }>
    return { totalProjects, totalTasks, doneTasks, inProgressTasks, recentLogs, error: null }
  } catch (err) {
    return { totalProjects: 0, totalTasks: 0, doneTasks: 0, inProgressTasks: 0, recentLogs: [], error: String(err) }
  }
}

export default function DashboardPage() {
  const { totalProjects, totalTasks, doneTasks, inProgressTasks, recentLogs, error } = getStats()

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1 text-stone-100">Dashboard</h1>
      <p className="text-stone-500 text-sm mb-10">Your Figma design workflow at a glance</p>

      {error && (
        <div className="mb-6 p-4 bg-stone-900 border border-stone-700 rounded-xl text-stone-300 text-sm">
          Database error: {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-12">
        <StatCard label="Projects" value={totalProjects} />
        <StatCard label="Total Tasks" value={totalTasks} />
        <StatCard label="In Progress" value={inProgressTasks} dim />
        <StatCard label="Done" value={doneTasks} highlight />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <section>
          <h2 className="text-lg font-semibold mb-5 text-stone-200">Quick Actions</h2>
          <div className="flex flex-col gap-4">
            <Link
              href="/projects"
              className="flex items-center gap-4 p-5 bg-stone-900 border border-stone-800 rounded-xl hover:border-amber-700/60 hover:bg-stone-800 transition-colors"
            >
              <span className="text-amber-500 shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
              </span>
              <div>
                <div className="font-medium text-sm text-stone-100">Browse Projects</div>
                <div className="text-stone-500 text-xs mt-0.5">View and sync your Figma files</div>
              </div>
            </Link>
            <Link
              href="/tasks"
              className="flex items-center gap-4 p-5 bg-stone-900 border border-stone-800 rounded-xl hover:border-amber-700/60 hover:bg-stone-800 transition-colors"
            >
              <span className="text-amber-500 shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="9" y1="6" x2="20" y2="6"/>
                  <line x1="9" y1="12" x2="20" y2="12"/>
                  <line x1="9" y1="18" x2="20" y2="18"/>
                  <polyline points="4 6 5 7 7 5"/>
                  <polyline points="4 12 5 13 7 11"/>
                  <polyline points="4 18 5 19 7 17"/>
                </svg>
              </span>
              <div>
                <div className="font-medium text-sm text-stone-100">Manage Tasks</div>
                <div className="text-stone-500 text-xs mt-0.5">Track design tasks across projects</div>
              </div>
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-5 text-stone-200">Recent Activity</h2>
          {recentLogs.length === 0 ? (
            <p className="text-stone-600 text-sm p-5 bg-stone-900 border border-stone-800 rounded-xl">
              No activity yet. Add projects and tasks to get started.
            </p>
          ) : (
            <ul className="space-y-3">
              {recentLogs.map((log) => (
                <li key={log.id} className="p-4 bg-stone-900 border border-stone-800 rounded-xl">
                  <p className="text-sm text-stone-200">{log.message}</p>
                  <p className="text-stone-600 text-xs mt-1">{new Date(log.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function StatCard({ label, value, dim, highlight }: { label: string; value: number; dim?: boolean; highlight?: boolean }) {
  return (
    <div className="p-6 bg-stone-900 border border-stone-800 rounded-xl">
      <p className="text-stone-500 text-xs font-medium uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-4xl font-bold ${highlight ? 'text-amber-400' : dim ? 'text-stone-500' : 'text-stone-100'}`}>{value}</p>
    </div>
  )
}
