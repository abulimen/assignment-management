import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import Editor from '../components/Editor';
import { AuthorOverride } from '../extensions/AuthorOverride';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import { collabUrl } from '../collabConfig';
import { buildAuthorColorMap, AUTHOR_PALETTE } from '../utils/authorship';
import { ArrowLeft, Users, Wifi, WifiOff, Lock } from 'lucide-react';

// Realtime shared editor for a group assignment (Yjs + Hocuspocus).
// Every member edits ONE document; authorship travels as `author` marks,
// presence via awareness, and each client's OWN keystrokes still feed the
// behavioral tracker (events.php) through an anchor submission row.
export default function GroupEditor() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [connStatus, setConnStatus] = useState('connecting');
  const [anchorId, setAnchorId] = useState(null);
  const [collab, setCollab] = useState(null);

  // Group detail + status polling (MySQL is the source of truth for status).
  useEffect(() => {
    let stopped = false;
    const load = () => api.get(`group.php/${groupId}`)
      .then(d => { if (!stopped) setGroup(d.group); })
      .catch(() => {});
    load();
    const timer = setInterval(load, 5000);
    return () => { stopped = true; clearInterval(timer); };
  }, [groupId]);

  // Yjs provider lifecycle.
  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: collabUrl(),
      name: `group:${groupId}`,
      document: ydoc,
      token: localStorage.getItem('token') || '',
    });
    const onStatus = ({ status }) => setConnStatus(status);
    const onAuthFailed = () => setConnStatus('rejected');
    provider.on('status', onStatus);
    provider.on('authenticationFailed', onAuthFailed);
    setCollab({ ydoc, provider });
    return () => {
      provider.off('status', onStatus);
      provider.off('authenticationFailed', onAuthFailed);
      provider.destroy();
      setCollab(null);
    };
  }, [groupId]);

  // Anchor submission for this member's behavioral events (keystrokes/pastes).
  useEffect(() => {
    if (!group) return;
    let cancelled = false;
    api.get(`submissions.php?assignment_id=${group.assignment_id}`)
      .then(d => {
        if (cancelled) return null;
        const mine = (d.submissions || [])[0];
        if (mine) { setAnchorId(mine.id); return null; }
        return api.post('submissions.php', { assignment_id: group.assignment_id })
          .then(r => { if (!cancelled) setAnchorId(r.submission.id); });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [group && group.assignment_id]);

  if (connStatus === 'rejected') {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center">
        <WifiOff className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-semibold mb-1">Can't open the group document</h2>
        <p className="text-sm text-gray-500 mb-4">You're not a member of this group, or the session is invalid.</p>
        <Link to="/dashboard" className="text-sm text-primary-600 underline">Back to dashboard</Link>
      </div>
    );
  }

  const frozen = !!group?.frozen_at;
  const colorMap = buildAuthorColorMap(group?.members || []);
  const myMember = group?.members?.find(m => parseInt(m.student_id) === user?.id);
  const cursorUser = {
    name: myMember?.student_name || 'Me',
    color: AUTHOR_PALETTE[colorMap[user?.id] || 0].replace(/[\d.]+\)$/, '1)'),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link to={`/group/${group?.assignment_id || ''}`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Group
          </Link>
          <h1 className="text-lg font-semibold">{group?.name || 'Group document'}</h1>
          {frozen && (
            <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              <Lock className="w-3 h-3" /> Submitted — read only
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {connStatus === 'connected' ? (
            <span className="flex items-center gap-1 text-green-600"><Wifi className="w-3.5 h-3.5" /> Live</span>
          ) : (
            <span className="flex items-center gap-1 text-gray-400"><WifiOff className="w-3.5 h-3.5" /> {connStatus}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-4 items-start">
        <div>
          {collab && anchorId != null ? (
            <Editor
              submissionId={anchorId}
              editable={!frozen}
              collab={{ ydoc: collab.ydoc, provider: collab.provider, user: cursorUser }}
              extraExtensions={[AuthorOverride.configure({ authorId: user?.id })]}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
              Connecting to the shared document...
            </div>
          )}
        </div>

        <aside className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Members ({group?.members?.length || 0})</h3>
          </div>
          <div className="space-y-2">
            {group?.members?.map(m => (
              <div key={m.student_id} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                  style={{ background: AUTHOR_PALETTE[colorMap[m.student_id] || 0] }}>
                  {m.student_name?.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.student_name}</p>
                </div>
                {m.is_leader == 1 && (
                  <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">Leader</span>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
