'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, MessageCircle, Search, User, Shield } from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { href: '/discover', icon: Search, label: 'Discover' },
  { href: '/matches', icon: Heart, label: 'Matches' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/safety', icon: Shield, label: 'Safety' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 p-6">
      <Link href="/discover" className="text-2xl font-bold text-brand-500 mb-8">
        Verified
      </Link>
      <ul className="space-y-1 flex-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <li key={href}>
            <Link
              href={href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon size={20} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
