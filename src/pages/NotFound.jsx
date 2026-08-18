import { Link } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9F8F6] px-4 font-brand">
      <div className="w-full max-w-md text-center bg-white rounded-xl border border-gray-200 p-8 shadow-xs">
        <BrandMark className="mx-auto h-10 w-10 text-[#0047FF]" />
        <h1 className="mt-6 text-6xl font-bold font-mono tracking-tight text-[#1A1A1B]">
          404
        </h1>
        <p className="mt-2 text-sm text-gray-500 font-sans">
          The requested page or assignment workspace could not be found.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0047FF] hover:bg-[#0038CC] px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-200 transition-all active:scale-[0.98] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Go to Dashboard
        </Link>
      </div>
    </main>
  );
}