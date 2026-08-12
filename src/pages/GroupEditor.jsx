import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import Editor from '../components/Editor';
import GroupStatusPanel from '../components/GroupStatusPanel';
import GroupSubmitDialog from '../components/GroupSubmitDialog';
import SectionMap from '../components/SectionMap';
import SectionPresenceChips from '../components/SectionPresenceChips';
import { AuthorOverride } from '../extensions/AuthorOverride';
import { useAuth } from '../hooks/useAuth';
import { useSectionPresence } from '../hooks/useSectionPresence';
import { api } from '../api';
import { collabUrl } from '../collabConfig';
import { buildAuthorColorMap, AUTHOR_PALETTE } from '../utils/authorship';
import { statusSummary } from '../utils/groupStatus';
import { ArrowLeft, Wifi, WifiOff, Lock, Send } from 'lucide-react';

// Realtime shared editor for a group assignment (Yjs + Hocuspocus).
// Every member edits ONE document; authorship travels as `author` marks,
// presence via awareness, and each client's OWN keystrokes still feed the
// behavioral tracker (tracking WS / POST /api/events) through an anchor submission row.
export default function GroupEditor() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [connStatus, setConnStatus] = useState('connecting');
  const [anchorId, setAnchorId] = useState(null);
  const [collab, setCollab] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [submitDialog, setSubmitDialog] = useState(null); // null | 'normal' | 'override'
  const [submitBusy, setSubmitBusy] = useState(false);
  const [editor, setEditor] = useState(null);

  // Who is editing which section right now (remote users only).
  const presence = useSectionPresence(collab?.provider, editor);

  // Group detail + status polling (MySQL is the source of truth for status).
  useEffect(() => {
    let stopped = false;
    const load = () => api.get(`groups/${groupId}`)
      .then(d => { if (!stopped) setGroup(d.group); })
      .catch(() => {});
    load();
    const timer = setInterval(load, 5000);
    return () => { stopped = true; clearInterval(timer); };
  }, [groupId]);

  // Mark Done / Reopen — merge fresh statuses straight from the response.
  async function handleStatusAction(action) {
    if (!group || statusBusy) return;
    setStatusBusy(true);
    try {
      const d = await api.post(`groups/${group.id}/${action}`, {});
      const byId = Object.fromEntries((d.members || []).map(m => [String(m.student_id), m]));
      setGroup(g => g && ({
        ...g,
        members: (g.members || []).map(m => {
          const fresh = byId[String(m.student_id)];
          return fresh ? { ...m, status: fresh.status, done_at: fresh.done_at, last_activity_at: fresh.last_activity_at } : m;
        }),
      }));
    } catch (err) {
      // Surface server errors (e.g. collab server down) to the member.
      alert(err.message || 'Could not update your status');
    } finally {
      setStatusBusy(false);
    }
  }

  // Leader submit — the server seals the canonical document (never client content).
  async function handleSubmit(overrideReason) {
    if (!group || submitBusy) return;
    setSubmitBusy(true);
    try {
      await api.post(`groups/${group.id}/submit`, overrideReason ? { override_reason: overrideReason } : {});
      setSubmitDialog(null);
      const d = await api.get(`groups/${group.id}`);
      setGroup(d.group);
    } catch (err) {
      alert(err.message || 'Submission failed');
    } finally {
      setSubmitBusy(false);
    }
  }

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
    api.get(`submissions?assignment_id=${group.assignment_id}`)
      .then(d => {
        if (cancelled) return null;
        const mine = (d.submissions || [])[0];
        if (mine) { setAnchorId(mine.id); return null; }
        return api.post('submissions', { assignment_id: group.assignment_id })
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
  const isLeader = group ? parseInt(group.leader_id) === user?.id : false;
  const summary = statusSummary(group?.members);
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
              onReady={setEditor}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
              Connecting to the shared document...
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {editor && !frozen && (
            <SectionMap
              editor={editor}
              presence={presence}
              onAddSection={() => editor.chain().focus('end').addSectionAfter().run()}
            />
          )}

          <GroupStatusPanel
            group={group}
            currentUserId={user?.id}
            onAction={handleStatusAction}
            busy={statusBusy}
            frozen={frozen}
          />

          {frozen && group?.merged_submission_id && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-medium text-green-800 mb-2">Submitted — document sealed.</p>
              <Link to={`/review/${group.merged_submission_id}`}
                className="text-sm text-green-700 underline">View submission review</Link>
            </div>
          )}

          {isLeader && !frozen && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Submit</h3>
              {summary.allDone ? (
                <button onClick={() => setSubmitDialog('normal')}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  <Send className="w-4 h-4" /> Submit — Everyone Complete
                </button>
              ) : (
                <>
                  <button disabled
                    className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed mb-2"
                    title="Waiting for all members to mark Done">
                    Submit ({summary.doneCount}/{summary.total} complete)
                  </button>
                  <button onClick={() => setSubmitDialog('override')}
                    className="w-full px-3 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600">
                    Submit Anyway as Leader
                  </button>
                </>
              )}
            </div>
          )}
        </aside>
      </div>

      {submitDialog && (
        <GroupSubmitDialog
          summary={summary}
          isOverride={submitDialog === 'override'}
          busy={submitBusy}
          onClose={() => !submitBusy && setSubmitDialog(null)}
          onConfirm={handleSubmit}
        />
      )}

      {/* "Sarah is editing here" chips, portaled onto each section sheet */}
      {editor && !frozen && <SectionPresenceChips editor={editor} presence={presence} />}
    </div>
  );
}
