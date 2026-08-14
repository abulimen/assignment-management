import { Link } from 'react-router-dom';
import BrandMark from '../components/BrandMark';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md text-center">
        <BrandMark className="mx-auto h-10 w-10" />
        <h1 className="mt-6 font-serif text-6xl font-semibold tracking-tight text-gray-700">
          404
        </h1>
        <p className="mt-2 text-gray-500">Page not found</p>
        <Link
          to="/dashboard"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}