import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center w-full max-w-md">
        <h1 className="text-6xl font-bold text-gray-700 mb-4">404</h1>
        <p className="text-gray-500 mb-6">Page not found</p>
        <Link to="/dashboard"
          className="inline-flex items-center justify-center min-h-11 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}