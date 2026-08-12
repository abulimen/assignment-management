import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import { STATUS_LABEL } from '../utils/groupStatus';
import { Users, Plus, Link as LinkIcon, Copy, UserPlus, FileText, Lock, CheckCircle2, Clock, Circle } from 'lucide-react';

const STATUS_STYLE = {
  not_started: 'bg-gray-100 text-gray-500',
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
      api.get(`groups.php?assignment_id=${id}`)
        .then(d => setGroups(d.groups || []))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id, code]);

  useEffect(() => {
    if (groups.length > 0) {
      api.get(`group.php/${groups[0].id}`)
        .then(d => setGroup(d.group))
        .catch(() => {});
    }
  }, [groups]);

  async function handleCreateGroup() {
    setError('');
    try {
      const d = await api.post('groups.php', { assignment_id: parseInt(id) });
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
      const d = await api.post('group.php/join', { invite_code: joinValue });
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

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  // No group yet — show create/join options
  if (!group) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Group Work</h1>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="w-5 h-5 text-primary-600" />
              <h2 className="font-semibold">Create a Group</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">Create a new group and become the leader. You'll get an invite link to share with teammates.</p>
            <button onClick={handleCreateGroup}
              className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
              Create Group
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-5 h-5 text-green-600" />
              <h2 className="font-semibold">Join a Group</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">Have an invite code from a teammate? Enter it here.</p>
            <div className="flex gap-2">
              <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="ABC123"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase" />
              <button onClick={() => handleJoin()} disabled={!joinCode}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                Join
              </button>
            </div>
          </div>
        </div>
        {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mt-4">{error}</div>}
      </div>
    );
  }

  // Has a group — realtime shared document
  const frozen = !!group.frozen_at;
  const doneCount = (group.members || []).filter(m => m.status === 'done').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-sm text-gray-400 mt-1">{group.assignment_title}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyInviteLink}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            {copied ? <Copy className="w-4 h-4 text-green-600" /> : <LinkIcon className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Invite Link'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">{error}</div>}

      {/* Members + live statuses */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Members ({group.members?.length || 0})</h3>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${doneCount === (group.members?.length || 0) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {doneCount}/{group.members?.length || 0} complete
          </span>
        </div>
        <div className="space-y-2">
          {group.members?.map(m => {
            const status = m.status || 'not_started';
            const Icon = STATUS_ICON[status] || Circle;
            return (
              <div key={m.student_id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-medium">
                    {m.student_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.student_name}</p>
                    <p className="text-xs text-gray-400">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">
              {frozen ? 'Submitted Document' : 'Shared Document'}
            </h3>
          </div>
          <button onClick={() => navigate(`/group/${group.id}/edit`)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            {frozen ? <Lock className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            {frozen ? 'View Sealed Document' : 'Open Shared Editor'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {frozen
            ? 'This group has submitted. The document is sealed and read-only.'
            : 'Everyone in the group works on one live document together. Mark yourself Done when your contribution is finished.'}
        </p>
      </div>

      {/* After submission: link to review (leader/lecturer path) */}
      {frozen && group.merged_submission_id && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-green-800">Submitted — ready for review.</p>
            <button onClick={() => navigate(`/review/${group.merged_submission_id}`)}
              className="px-3 py-2 text-sm border border-green-300 text-green-800 rounded-lg hover:bg-green-100">
              Open Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
