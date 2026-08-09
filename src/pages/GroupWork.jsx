import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import GroupMerge from '../components/GroupMerge';
import { Users, Plus, Link as LinkIcon, Copy, UserPlus, FileText, Send } from 'lucide-react';

export default function GroupWork() {
  const { id, code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [group, setGroup] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState(code || '');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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
    const code = codeToUse || joinCode;
    if (!code) return;
    try {
      const d = await api.post('group.php/join', { invite_code: code });
      setGroup(d.group);
      setJoinCode('');
      // Navigate to the group page without the join code in URL
      navigate(`/group/${d.group.assignment_id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateSection() {
    if (!group) return;
    try {
      const d = await api.post(`group.php/${group.id}/create-section`, {});
      navigate(`/submissions/${group.assignment_id}?section=${d.section_id}&sub=${d.submission_id}`);
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
              <button onClick={handleJoin} disabled={!joinCode}
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

  // Has a group
  const isLeader = group.leader_id === user?.id;
  const mySection = group.sections?.find(s => s.student_id === user?.id);

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

      {/* Members */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Members ({group.members?.length || 0})</h3>
        </div>
        <div className="space-y-2">
          {group.members?.map(m => (
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
                {group.sections?.find(s => s.student_id === m.student_id) ? (
                  <span className="text-xs text-green-600">{group.sections.find(s => s.student_id === m.student_id).submission_status || 'draft'}</span>
                ) : (
                  <span className="text-xs text-gray-400">No section</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* My Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">My Section</h3>
          </div>
          {mySection ? (
            <button onClick={() => navigate(`/submissions/${group.assignment_id}?section=${mySection.id}&sub=${mySection.submission_id}`)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              <FileText className="w-4 h-4" /> Edit My Section
            </button>
          ) : (
            <button onClick={handleCreateSection}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              <Plus className="w-4 h-4" /> Create My Section
            </button>
          )}
        </div>
      </div>

      {/* Leader: Merge UI */}
      {isLeader && group.sections?.length > 0 && (
        <GroupMerge group={group} onMerged={(subId) => navigate(`/review/${subId}`)} />
      )}
    </div>
  );
}