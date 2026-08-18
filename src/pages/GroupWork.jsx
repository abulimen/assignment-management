import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import { STATUS_LABEL } from '../utils/groupStatus';
import { reviewLink } from '../utils/links';
import {
  ArrowLeft,
  Users,
  Plus,
  Link as LinkIcon,
  Copy,
  UserPlus,
  FileText,
  Lock,
  CheckCircle2,
  Clock,
  Circle,
  Crown,
  Share2,
  Sparkles,
} from 'lucide-react';

const STATUS_STYLE = {
  not_started: 'bg-gray-100 text-gray-600 border-gray-200',
  in_progress: 'bg-amber-50 text-amber-800 border-amber-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const STATUS_ICON = { not_started: Circle, in_progress: Clock, done: CheckCircle2 };

export default function GroupWork() {
  const { id, code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState(code || '');
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.role === 'lecturer' && id) navigate(`/assignments/${id}`, { replace: true });
  }, [user?.role, id, navigate]);

  useEffect(() => {
    if (code) {
      handleJoin(code);
    }
  }, [code]);

  useEffect(() => {
    if (!code) {
      api.get(`assignments/${id}/groups`)
        .then((d) => setGroups(d.groups || []))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id, code]);

  useEffect(() => {
    if (groups.length > 0) {
      api.get(`groups/${groups[0].id}`)
        .then((d) => setGroup(d.group))
        .catch(() => {});
    }
  }, [groups]);

  async function handleCreateGroup() {
    setError('');
    try {
      const d = await api.post('groups', {
        assignment_id: parseInt(id),
        name: groupName.trim() || undefined,
      });
      setGroup(d.group);
      setShowCreate(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleJoin(codeToUse) {
    setError('');
    const joinValue = typeof codeToUse === 'string' ? codeToUse : joinCode;
    if (!joinValue) return;
    try {
      const d = await api.post('groups/join', { invite_code: joinValue });
      setGroup(d.group);
      setJoinCode('');
      navigate(`/group/${d.group.assignment_id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  function copyInviteLink() {
    const link = `${window.location.origin}/join/${group.invite_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (loading) {
    return (
      <div role="status" aria-label="Loading group" className="max-w-4xl mx-auto space-y-4">
        <div className="skeleton h-8 w-1/3 rounded-lg" />
        <div className="skeleton h-44 rounded-xl" />
        <div className="skeleton h-32 rounded-xl" />
      </div>
    );
  }

  // No group yet — show create/join options
  if (!group) {
    const content = (
      <div className="max-w-4xl mx-auto space-y-6">
        {!id && (
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#0047FF] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
          </Link>
        )}

        <div className="space-y-1">
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#0047FF] uppercase">
            GROUP FORMATION
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1A1B]">
            Group Workspace Setup
          </h1>
          <p className="text-sm text-gray-600">
            Form or join a group to collaborate in one shared workspace.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create a Group */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#0047FF]/10 text-[#0047FF] border border-[#0047FF]/20 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 font-bold">OPTION A</span>
                  <h2 className="font-bold text-base text-[#1A1A1B]">Create a Group</h2>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed font-sans">
                Start a new group as team leader. You will receive an invite code to share with teammates.
              </p>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name (e.g. Alpha Research Team)"
                className="w-full min-h-11 rounded-lg border border-gray-300 bg-[#F9F8F6] px-3.5 py-2 text-sm text-[#1A1A1B] placeholder:text-gray-400 outline-none transition-colors focus:border-[#0047FF] focus:bg-white focus:ring-2 focus:ring-[#0047FF]/20"
              />
            </div>

            <button
              onClick={handleCreateGroup}
              className="w-full min-h-11 bg-[#0047FF] text-white px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-[#0038CC] shadow-md shadow-blue-200 transition-all active:scale-[0.98] cursor-pointer"
            >
              Create Group Workspace
            </button>
          </div>

          {/* Join a Group */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#0047FF]/10 text-[#0047FF] border border-[#0047FF]/20 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 font-bold">OPTION B</span>
                  <h2 className="font-bold text-base text-[#1A1A1B]">Join a Group</h2>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed font-sans">
                Have an invite code from a teammate? Enter the 6-character code to join their workspace.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g. ABC123"
                  className="flex-1 min-w-0 min-h-11 rounded-lg border border-gray-300 bg-[#F9F8F6] px-3.5 py-2 text-sm uppercase font-mono tracking-widest text-[#1A1A1B] placeholder:text-gray-400 outline-none transition-colors focus:border-[#0047FF] focus:bg-white focus:ring-2 focus:ring-[#0047FF]/20"
                />
                <button
                  onClick={() => handleJoin()}
                  disabled={!joinCode}
                  className="bg-[#0047FF] text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-[#0038CC] shadow-md shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shrink-0"
                >
                  Join
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#F9F8F6] rounded-lg border border-gray-200 text-[11px] text-gray-500 font-mono">
              Self-organized groups · Shared document editing
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-xs rounded-lg p-3.5 border border-red-200">
            {error}
          </div>
        )}
      </div>
    );

    if (!id) {
      return (
        <main className="min-h-screen bg-[#F9F8F6]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{content}</div>
        </main>
      );
    }
    return <div>{content}</div>;
  }

  // Has a group — Group Hub overview
  const frozen = !!group.frozen_at;
  const doneCount = (group.members || []).filter((m) => m.status === 'done').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#0047FF] uppercase bg-[#0047FF]/5 px-2.5 py-0.5 rounded border border-[#0047FF]/20">
              GROUP WORKSPACE
            </span>
            {frozen && (
              <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Sealed
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1A1B]">
            {group.name}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-sans">
            Assignment: <strong className="text-[#1A1A1B]">{group.assignment_title}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={copyInviteLink}
            className="inline-flex items-center gap-1.5 min-h-10 px-3.5 py-2 text-xs font-semibold text-[#1A1A1B] bg-[#F9F8F6] border border-gray-200 rounded-lg hover:bg-white hover:border-[#0047FF]/40 transition-colors cursor-pointer"
          >
            {copied ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-[#0047FF]" />
            )}
            <span>{copied ? 'Link Copied!' : 'Copy Invite Link'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs rounded-lg p-3.5 border border-red-200">
          {error}
        </div>
      )}

      {/* Group Shared Editor Launch Banner */}
      <div className="bg-white rounded-xl border-2 border-[#0047FF]/30 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0047FF]" />
            <h2 className="font-bold text-base sm:text-lg text-[#1A1A1B]">
              {frozen ? 'Submitted Group Document' : 'Shared Collaborative Document'}
            </h2>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed font-sans max-w-xl">
            {frozen
              ? 'This group assignment has been submitted. The document is sealed and read-only.'
              : 'Every teammate works inside the single shared document. Organize sections collaboratively and mark yourself Done when finished.'}
          </p>
        </div>

        <button
          onClick={() => navigate(`/group/${group.id}/edit`)}
          className="inline-flex items-center justify-center gap-2 min-h-11 px-6 py-2.5 bg-[#0047FF] hover:bg-[#0038CC] text-white text-xs sm:text-sm font-bold rounded-lg shadow-md shadow-blue-200 transition-all active:scale-[0.98] cursor-pointer shrink-0"
        >
          {frozen ? <Lock className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          <span>{frozen ? 'View Sealed Document' : 'Open Shared Editor →'}</span>
        </button>
      </div>

      {/* Team Members & Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0047FF]" />
            <h2 className="text-sm font-bold text-[#1A1A1B]">Team Roster ({group.members?.length || 0})</h2>
          </div>
          <span
            className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-md border ${
              doneCount === (group.members?.length || 0)
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-100 text-gray-600 border-gray-200'
            }`}
          >
            {doneCount}/{group.members?.length || 0} completed
          </span>
        </div>

        <div className="space-y-2.5">
          {group.members?.map((m) => {
            const status = m.status || 'not_started';
            const Icon = STATUS_ICON[status] || Circle;
            return (
              <div
                key={m.student_id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-lg bg-[#F9F8F6] border border-gray-200 flex-wrap"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-[#0047FF]/10 text-[#0047FF] border border-[#0047FF]/20 flex items-center justify-center text-xs font-bold shrink-0">
                    {m.student_name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#1A1A1B] truncate">{m.student_name}</p>
                      {m.is_leader == 1 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold">
                          <Crown className="w-3 h-3 text-amber-600" /> Leader
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-mono truncate">{m.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md border font-semibold ${STATUS_STYLE[status]}`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {STATUS_LABEL[status]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Link if Sealed */}
      {frozen && group.merged_submission_id && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center justify-between gap-3 flex-wrap shadow-xs">
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-emerald-900">Assignment Sealed & Submitted</p>
            <p className="text-xs text-emerald-700">The developmental record has been permanently anchored.</p>
          </div>
          <button
            onClick={() => navigate(reviewLink(group.merged_submission_id))}
            className="min-h-10 px-4 py-2 text-xs font-bold bg-white text-emerald-800 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            Open Review & Record
          </button>
        </div>
      )}
    </div>
  );
}