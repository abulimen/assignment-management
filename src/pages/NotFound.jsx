import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <p className="text-gray-500 mb-6">Page not found</p>
        <Link to="/dashboard" className="text-primary-600 hover:underline">Go to Dashboard</Link>
      </div>
    </div>
  );
}