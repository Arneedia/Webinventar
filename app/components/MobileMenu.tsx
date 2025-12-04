'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Menu, X } from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
  show: boolean;
}

interface MobileMenuProps {
  mainLinks: NavLink[];
  userLinks: NavLink[];
  adminLinks: { href: string; label: string }[];
  isAdmin: boolean;
  user: { name: string | null; email: string } | null;
}

export default function MobileMenu({ mainLinks, userLinks, adminLinks, isAdmin, user }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const menu = (
    <div className="fixed inset-0 z-[1000]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => setIsOpen(false)}
      />

      {/* Menu Panel - von oben bis unten */}
      <div className="absolute top-0 bottom-0 right-0 w-80 max-w-[90vw] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white">
          <span className="text-lg font-semibold text-gray-900">Menü</span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 active:bg-gray-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="px-4 py-4 border-b border-gray-200 bg-blue-50">
            <div className="text-base font-medium text-gray-900 break-words">{user.name || user.email}</div>
            {user.name && <div className="text-sm text-gray-600 mt-0.5 break-all">{user.email}</div>}
          </div>
        )}

        {/* Navigation Links - Scrollbar mit viel Platz */}
        <nav className="flex-1 overflow-y-auto overscroll-contain py-4 bg-white min-h-0">
          {/* Main Links */}
          <div className="px-4">
            <div className="px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Navigation
            </div>
            {mainLinks.filter(link => link.show).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-4 rounded-xl text-base font-medium text-gray-800 hover:bg-gray-100 active:bg-gray-200 mb-2"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User-specific Links */}
          {userLinks.filter(link => link.show).length > 0 && (
            <div className="px-4 mt-4 pt-4 border-t border-gray-200">
              {userLinks.filter(link => link.show).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-4 py-4 rounded-xl text-base font-medium text-gray-800 hover:bg-gray-100 active:bg-gray-200 mb-2"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Admin Links */}
          {isAdmin && (
            <div className="px-4 mt-4 pt-4 border-t border-gray-200">
              <div className="px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Administration
              </div>
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-4 py-4 rounded-xl text-base font-medium text-gray-800 hover:bg-gray-100 active:bg-gray-200 mb-2"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Extra Platz am Ende für besseres Scrollen */}
          <div className="h-8" />
        </nav>

        {/* Footer Actions - kompakt */}
        <div className="shrink-0 border-t border-gray-200 px-4 py-3 bg-gray-50 safe-area-bottom">
          {user ? (
            <form method="POST" action="/api/auth/logout">
              <button
                type="submit"
                className="w-full px-4 py-3 rounded-xl text-center text-base text-red-600 bg-white border border-gray-200 hover:bg-red-50 active:bg-red-100 font-medium shadow-sm"
              >
                Logout
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="block w-full px-4 py-3 rounded-xl text-center text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 font-medium"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Hamburger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="sm:hidden p-2 -mr-2 rounded-lg hover:bg-gray-100 active:bg-gray-200"
        aria-label="Menü öffnen"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      {mounted && isOpen ? createPortal(menu, document.body) : null}
    </>
  );
}
