// src/app/components/SideNavbar.tsx
import React from 'react';
import Link from 'next/link';

type NavItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

const navItems: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Create/Join Room', href: '/room' },
  { label: 'Profile', href: '/profile' },
  { label: 'Settings', href: '/settings' },
];

export function SideNavbar() {
  return (
    <nav className="w-64 bg-gray-800 p-1 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My App</h1>
      </div>
      
      <ul className="space-y-2">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link 
              href={item.href}
              className="flex items-center p-2 rounded hover:bg-gray-700 transition-colors"
            >
              {item.icon && <span className="mr-3">{item.icon}</span>}
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      
      <div className="absolute bottom-4 left-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-gray-600"></div>
          <span>User Name</span>
        </div>
      </div>
    </nav>
  );
}