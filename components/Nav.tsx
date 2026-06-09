'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/projects', label: 'Projects' },
  { href: '/tasks', label: 'Tasks' },
]

export default function Nav() {
  const pathname = usePathname()
  return (
    <nav className="border-b border-stone-800 bg-stone-950/90 backdrop-blur sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
        <span className="font-bold text-amber-400 tracking-tight mr-2">Figma Mastery with Claude</span>
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-sm transition-colors ${
              pathname === href
                ? 'text-stone-100 font-medium'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
