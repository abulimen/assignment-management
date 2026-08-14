import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import { STATUS_LABEL } from '../utils/groupStatus';
import { ArrowLeft, Users, Plus, Link as LinkIcon, Copy, UserPlus, FileText, Lock, CheckCircle2, Clock, Circle } from 'lucide-react';

const STATUS_STYLE = {
  not_started: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-amber-100 text-amber-700',
  done: 'bg-green-100 text-green-700',
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

  // The group hub is for student members. Lecturers review submissions on
  // the assignment page — never the live editor.
  useEffect(() => {
    if (user?.role === 'lecturer' && id) navigate(`/assignments/${id}`, { replace: true });
  }, [user?.role, id, navigate]);

  // If navigated via /join/:code, auto-join
  useEffect(() => {
    if (code) {
      handleJoin(code);
    }
  }, [code]);

  useEffect(() => {
    if (!code) {
      api.get(`assignments/${id}/groups`)
        .then(d => setGroups(d.groups || []))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id, code]);

  useEffect(() => {
    if (groups.length > 0) {
      api.get(`groups/${groups[0].id}`)
        .then(d => setGroup(d.group))
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
    // codeToUse might be a click event if called from onClick directly
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
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div role="status" aria-label="Loading group">
        <div className="skeleton mb-6 h-7 w-1/2 rounded" />
        <div className="skeleton mb-4 h-40 rounded-xl" />
        <div className="skeleton h-28 rounded-xl" />
      </div>
    );
  }

  // No group yet — show create/join options
  if (!group) {
    const content = (
      <>
        {!id && (
          <Link to="/dashboard"
            className="inline-flex items-center gap-1 min-h-11 mb-4 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Link>
        )}
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-gray-900 mb-6">Group Work</h1>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-line bg-surface p-6 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="w-5 h-5 text-primary-600" />
              <h2 className="font-semibold">Create a Group</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">Create a new group and become the leader. You'll get an invite link to share with teammates.</p>
            <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)}
              placeholder="Group name (e.g. Team Alpha)"
              className="w-full min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none mb-3" />
            <button onClick={handleCreateGroup}
              className="w-full min-h-11 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
              Create Group
            </button>
          </div>
          <div className="bg-surface rounded-xl border border-line p-6 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-5 h-5 text-primary-600" />
              <h2 className="font-semibold">Join a Group</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">Have an invite code from a teammate? Enter it here.</p>
            <div className="flex gap-2">
              <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="ABC123"
                className="flex-1 min-w-0 min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
              <button onClick={() => handleJoin()} disabled={!joinCode}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 min-h-11 shrink-0">
                Join
              </button>
            </div>
          </div>
        </div>
        {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mt-4">{error}</div>}
      </>
    );
    // /join/:code renders without the app Layout — provide the main landmark
    // and page chrome so the page is never a dead end or bare shell.
    if (!id) {
      return (
        <main className="min-h-screen bg-canvas">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{content}</div>
        </main>
      );
    }
    return <div>{content}</div>;
  }

  // Has a group — realtime shared document
  const frozen = !!group.frozen_at;
  const doneCount = (group.members || []).filter(m => m.status === 'done').length;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-gray-900">{group.name}</h1>
          <p className="text-sm text-gray-600 mt-1">{group.assignment_title}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={copyInviteLink}
            className="flex items-center gap-1.5 min-h-11 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
            {copied ? <Copy className="w-4 h-4 text-green-600" /> : <LinkIcon className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Invite Link'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>}

      {/* Members + live statuses */}
      <div className="rounded-xl border border-line bg-surface p-4 mb-4">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Members ({group.members?.length || 0})</h2>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${doneCount === (group.members?.length || 0) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {doneCount}/{group.members?.length || 0} complete
          </span>
        </div>
        <div className="space-y-2">
          {group.members?.map(m => {
            const status = m.status || 'not_started';
            const Icon = STATUS_ICON[status] || Circle;
            return (
              <div key={m.student_id} className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-medium shrink-0">
                    {m.student_name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.student_name}</p>
                    <p className="text-xs text-gray-600 truncate">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.is_leader == 1 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Leader</span>}
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[status]}`}>
                    <Icon className="w-3 h-3" /> {STATUS_LABEL[status]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shared realtime editor */}
      <div className="rounded-xl border border-line bg-surface p-4 mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">
              {frozen ? 'Submitted Document' : 'Shared Document'}
            </h2>
          </div>
          <button onClick={() => navigate(`/group/${group.id}/edit`)}
            className="flex items-center gap-1.5 min-h-11 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
            {frozen ? <Lock className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            {frozen ? 'View Sealed Document' : 'Open Shared Editor'}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          {frozen
            ? 'This group has submitted. The document is sealed and read-only.'
            : 'Everyone in the group works on one live document together. Mark yourself Done when your contribution is finished.'}
        </p>
      </div>

      {/* After submission: link to review (leader/lecturer path) */}
      {frozen && group.merged_submission_id && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-medium text-green-800">Submitted — ready for review.</p>
            <button onClick={() => navigate(`/review/${group.merged_submission_id}`)}
              className="min-h-11 px-3 py-2 text-sm border border-green-700 text-green-800 rounded-lg hover:bg-green-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
              Open Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}