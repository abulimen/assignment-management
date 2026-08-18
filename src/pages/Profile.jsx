import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { useMinLoading } from '../hooks/useMinLoading';
import { api } from '../api';
import {
  User,
  Mail,
  ShieldCheck,
  KeyRound,
  GraduationCap,
  FileText,
  Clock,
  Calendar,
  Save,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowLeft,
  IdCard,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar';

function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8" role="status" aria-label="Loading profile">
      <div className="skeleton h-4 w-24 rounded" />
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="skeleton w-16 h-16 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="skeleton h-6 w-48 rounded" />
            <div className="skeleton h-4 w-32 rounded" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3 shadow-xs">
          <div className="skeleton h-5 w-32 rounded" />
          <div className="skeleton h-4 w-full rounded" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3 shadow-xs">
          <div className="skeleton h-5 w-32 rounded" />
          <div className="skeleton h-4 w-full rounded" />
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const showSkeleton = useMinLoading(loading, 280);

  // Edit Personal Details State
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Fetch full profile & stats from GET /api/me
  useEffect(() => {
    let mounted = true;
    api.get('me')
      .then((res) => {
        if (mounted && res.user) {
          setProfileData(res.user);
          setName(res.user.name || '');
          setStudentId(res.user.studentId || '');
        }
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load profile details');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [toast]);

  // Handle Personal Details Update
  async function handleSaveDetails(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setSavingDetails(true);
    try {
      const res = await api.put('me', {
        name: name.trim(),
        studentId: studentId.trim(),
      });
      if (res.user) {
        setProfileData((prev) => ({ ...prev, ...res.user }));
        if (setUser) setUser((prev) => ({ ...prev, ...res.user }));
      }
      toast.success('Profile details updated successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSavingDetails(false);
    }
  }

  // Handle Password Change
  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('me', {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
      toast.error(err.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  }

  if (showSkeleton) return <ProfileSkeleton />;

  const isLecturer = (profileData?.role || user?.role) === 'lecturer';
  const roleLabel = isLecturer ? 'Lecturer / Academic Staff' : 'Student';
  const createdAtFormatted = profileData?.createdAt
    ? new Date(profileData.createdAt).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : 'Recent Member';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-150">
      
      {/* Top Breadcrumb */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#0047FF] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Profile Banner Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <UserAvatar
              user={profileData || user}
              size={64}
              className="shadow-md rounded-2xl ring-2 ring-gray-100"
            />

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A1B] tracking-tight">
                  {profileData?.name || user?.name}
                </h1>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 bg-[#0047FF]/10 text-[#0047FF] rounded-md border border-[#0047FF]/20 uppercase">
                  {profileData?.role || user?.role}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-sans">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {profileData?.email || user?.email}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  Joined {createdAtFormatted}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Account</span>
            </span>
          </div>
        </div>

        {/* Academic Stats Grid */}
        <div className="pt-6 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-[#F9F8F6] p-4 rounded-xl border border-gray-200/80 space-y-1">
            <div className="text-[11px] font-mono text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#0047FF]" />
              <span>{isLecturer ? 'Managed Courses' : 'Enrolled Courses'}</span>
            </div>
            <div className="text-xl font-bold text-[#1A1A1B] font-mono">
              {profileData?.stats?.courses || 0}
            </div>
          </div>

          <div className="bg-[#F9F8F6] p-4 rounded-xl border border-gray-200/80 space-y-1">
            <div className="text-[11px] font-mono text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0047FF]" />
              <span>{isLecturer ? 'Assignments Created' : 'Submissions Sealed'}</span>
            </div>
            <div className="text-xl font-bold text-[#1A1A1B] font-mono">
              {profileData?.stats?.activities || 0}
            </div>
          </div>

          <div className="bg-[#F9F8F6] p-4 rounded-xl border border-gray-200/80 space-y-1 col-span-2 sm:col-span-1">
            <div className="text-[11px] font-mono text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <IdCard className="w-3.5 h-3.5 text-[#0047FF]" />
              <span>{isLecturer ? 'Staff Role' : 'Student ID'}</span>
            </div>
            <div className="text-sm font-bold text-[#1A1A1B] font-mono truncate">
              {isLecturer ? 'Lecturer' : (profileData?.studentId || 'Not set')}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Details + Security */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Edit Details */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-[#0047FF]/10 text-[#0047FF] flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1A1B]">Personal Details</h2>
              <p className="text-xs text-gray-500">Update your public display information</p>
            </div>
          </div>

          <form onSubmit={handleSaveDetails} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your full name"
                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20 focus:border-[#0047FF] font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={profileData?.email || user?.email || ''}
                disabled
                className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-500 font-mono cursor-not-allowed"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Email cannot be changed directly as it is tied to your institutional identity.
              </p>
            </div>

            {!isLecturer && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Student ID / Matric Number
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. 24/001"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20 focus:border-[#0047FF] font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Shown to lecturers on course gradebooks and submission records.
                </p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingDetails}
                className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-lg shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {savingDetails ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Details</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: Change Password */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1A1B]">Security & Password</h2>
              <p className="text-xs text-gray-500">Update your account credentials</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-sans">
                {passwordError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Current Password *
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20 focus:border-[#0047FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                New Password *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20 focus:border-[#0047FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20 focus:border-[#0047FF]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword || !currentPassword || !newPassword}
                className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-[#1A1A1B] hover:bg-gray-800 rounded-lg shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {savingPassword ? (
                  <span>Updating...</span>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Change Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
