import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import { courseLink } from '../utils/links';
import { BookOpen, KeyRound, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function JoinCourse() {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinedCourse, setJoinedCourse] = useState(null);

  useEffect(() => {
    if (!code) {
      setError('No course invite code provided');
      setLoading(false);
      return;
    }

    if (!user) {
      // Prompt user to sign in or register
      setLoading(false);
      return;
    }

    // Auto-join for logged in user
    api.post('courses/join', { invite_code: code })
      .then((res) => {
        setJoinedCourse(res.course);
        setTimeout(() => {
          navigate(courseLink(res.course), { replace: true });
        }, 1200);
      })
      .catch((err) => {
        setError(err.message || 'Invalid or expired course invite code');
      })
      .finally(() => setLoading(false));
  }, [code, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-[#0047FF] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-gray-600">Joining course...</p>
      </div>
    );
  }

  if (joinedCourse) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Enrolled in {joinedCourse.code}!</h2>
        <p className="text-sm text-gray-600">{joinedCourse.title}</p>
        <p className="text-xs text-gray-400">Redirecting to your course workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Course Invitation Error</h2>
        <p className="text-sm text-gray-600">{error}</p>
        <Link
          to="/dashboard"
          className="px-5 py-2.5 bg-[#0047FF] text-white text-xs font-bold rounded-lg hover:bg-[#0038CC] transition-all inline-block"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  // Not logged in
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 max-w-md mx-auto text-center space-y-6">
      <div className="w-12 h-12 rounded-2xl bg-[#0047FF]/10 text-[#0047FF] flex items-center justify-center mx-auto">
        <KeyRound className="w-6 h-6" />
      </div>
      <div className="space-y-2">
        <span className="text-xs font-mono font-bold text-[#0047FF] uppercase">COURSE INVITATION</span>
        <h1 className="text-2xl font-bold text-gray-900">Join Course: {code}</h1>
        <p className="text-sm text-gray-600">
          Sign in or create your student account to join this course on Draftly.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
        <Link
          to={`/login?redirect=/join/course/${code}`}
          className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-[#0047FF] bg-[#0047FF]/10 hover:bg-[#0047FF]/20 rounded-lg transition-colors"
        >
          Sign In
        </Link>
        <Link
          to={`/register?redirect=/join/course/${code}`}
          className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
        >
          <span>Create Account</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
