import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, BookOpen } from 'lucide-react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-gray-900 focus:shadow-md focus:outline-2 focus:outline-offset-2 focus:outline-primary-600"
      >
        Skip to main content
      </a>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2 text-lg font-bold text-primary-700 min-h-11 py-2">
              <BookOpen className="w-6 h-6" aria-hidden="true" />
              Assignment Manager
            </Link>
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-sm text-gray-500 hidden sm:inline">
                {user?.role === 'lecturer' ? 'Lecturer' : 'Student'}
              </span>
              <button
                type="button"
                aria-label="Log out"
                onClick={() => { logout(); navigate('/login'); }}
                className="inline-flex items-center justify-center gap-2 min-h-11 min-w-11 px-3 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      <main id="main" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full scroll-mt-20">
        {children}
      </main>
    </div>
  );
}