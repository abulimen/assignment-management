import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import Editor from '../components/Editor';
import EditorSkeleton from '../components/EditorSkeleton';
import GroupSubmitDialog from '../components/GroupSubmitDialog';
import SectionPresenceChips from '../components/SectionPresenceChips';
import BrandMark from '../components/BrandMark';
import UserAvatar from '../components/UserAvatar';
import { AuthorOverride } from '../extensions/AuthorOverride';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { useMinLoading } from '../hooks/useMinLoading';
import { useSectionPresence } from '../hooks/useSectionPresence';
import { api } from '../api';
import { collabUrl, authToken } from '../collabConfig';
import { buildAuthorColorMap, AUTHOR_PALETTE } from '../utils/authorship';
import { statusSummary, STATUS_LABEL } from '../utils/groupStatus';
import { listSections } from '../utils/sectionDoc';
import { TextSelection } from '@tiptap/pm/state';
import {
  ArrowLeft,
  WifiOff,
  Lock,
  Send,
  ShieldCheck,
  Users,
  Plus,
  Crown,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
} from 'lucide-react';

export default function GroupEditor() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [connStatus, setConnStatus] = useState('connecting');
  const [anchorId, setAnchorId] = useState(null);
  const [collab, setCollab] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [submitDialog, setSubmitDialog] = useState(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [editor, setEditor] = useState(null);
  const [activeMobileView, setActiveMobileView] = useState('editor'); // 'editor' | 'outline' | 'status'
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [, setTick] = useState(0);

  const isCollabReady = Boolean(collab && anchorId != null);
  const showSkeleton = useMinLoading(!isCollabReady, 280);

  // Who is editing which section right now (remote users only).
  const presence = useSectionPresence(collab?.provider, editor);

  // Group detail + status polling
  useEffect(() => {
    let stopped = false;
    const load = () =>
      api.get(`groups/${groupId}`)
        .then((d) => {
          if (!stopped) {
            setGroup(d.group);
            if (d.group?.assignment_id && !assignment) {
              api.get(`assignments/${d.group.assignment_id}`)
                .then((res) => setAssignment(res.assignment))
                .catch(() => {});
            }
          }
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [groupId, assignment]);

  // Force tick on editor transactions for outline/wordcounts
  useEffect(() => {
    if (!editor) return undefined;
    const bump = () => setTick((t) => t + 1);
    editor.on('transaction', bump);
    return () => {
      editor.off('transaction', bump);
    };
  }, [editor]);

  // Mark Done / Reopen
  async function handleStatusAction(action) {
    if (!group || statusBusy) return;
    setStatusBusy(true);
    try {
      const d = await api.post(`groups/${group.id}/${action}`, {});
      const byId = Object.fromEntries((d.members || []).map((m) => [String(m.student_id), m]));
      setGroup((g) =>
        g && {
          ...g,
          members: (g.members || []).map((m) => {
            const fresh = byId[String(m.student_id)];
            return fresh
              ? { ...m, status: fresh.status, done_at: fresh.done_at, last_activity_at: fresh.last_activity_at }
              : m;
          }),
        },
      );
      if (action === 'done') {
        toast.success('Marked your contribution as Done!');
      } else {
        toast.info('Reopened contribution for editing');
      }
    } catch (err) {
      toast.error(err.message || 'Could not update your status');
    } finally {
      setStatusBusy(false);
    }
  }

  // Leader submit
  async function handleSubmit(overrideReason) {
    if (!group || submitBusy) return;
    setSubmitBusy(true);
    try {
      await api.post(`groups/${group.id}/submit`, overrideReason ? { override_reason: overrideReason } : {});
      setSubmitDialog(null);
      const d = await api.get(`groups/${group.id}`);
      setGroup(d.group);
      toast.success('Group assignment submitted and sealed successfully!');
    } catch (err) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitBusy(false);
    }
  }

  // Yjs provider lifecycle
  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: collabUrl(),
      name: `group:${groupId}`,
      document: ydoc,
      token: authToken() || '',
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

  // Anchor submission for this member's behavioral events
  useEffect(() => {
    if (!group) return;
    let cancelled = false;
    api.get(`submissions?assignment_id=${group.assignment_id}`)
      .then((d) => {
        if (cancelled) return null;
        const mine = (d.submissions || [])[0];
        if (mine) {
          setAnchorId(mine.id);
          return null;
        }
        return api.post('submissions', { assignment_id: group.assignment_id }).then((r) => {
          if (!cancelled) setAnchorId(r.submission.id);
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [group && group.assignment_id]);

  // Extract parsed sections and page title snippets
  const sectionsList = useMemo(() => {
    if (!editor) return [];
    try {
      const list = listSections(editor.getJSON());
      const doc = editor.state.doc;
      return list.map((sec, idx) => {
        // Find text snippet from first real paragraph/heading in this section
        let snippet = '';
        try {
          doc.forEach((child) => {
            if (child.attrs.id === sec.id) {
              const text = (child.textBetween ? child.textBetween(0, child.content.size, ' ', ' ') : child.textContent).trim();
              if (text) snippet = text.slice(0, 32);
            }
          });
        } catch {}
        return {
          ...sec,
          pageLabel: `Page ${idx + 1}`,
          displayTitle: snippet || sec.title || `Page ${idx + 1}`,
        };
      });
    } catch {
      return [];
    }
  }, [editor, editor?.state?.doc]);

  const activeSectionIndex = useMemo(() => {
    if (!editor) return 0;
    const doc = editor.state.doc;
    const pos = editor.state.selection.$from.pos;
    let offset = 0;
    for (let i = 0; i < doc.childCount; i++) {
      offset += doc.child(i).nodeSize;
      if (pos < offset) return i;
    }
    return 0;
  }, [editor, editor?.state?.selection]);

  const activeSectionObj = sectionsList[activeSectionIndex] || sectionsList[0];

  const totalWords = useMemo(() => {
    if (!editor) return 0;
    const doc = editor.state.doc;
    const text = (doc.textBetween ? doc.textBetween(0, doc.content.size, '\n', '\n') : doc.textContent).trim();
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }, [editor, editor?.state?.doc]);

  function jumpToSection(sectionId) {
    if (!editor) return;
    const doc = editor.state.doc;
    let offset = 0;
    let found = -1;
    doc.forEach((child) => {
      if (found === -1) {
        if (child.attrs.id === sectionId) found = offset;
        offset += child.nodeSize;
      }
    });
    if (found === -1) return;
    const tr = editor.state.tr.setSelection(
      TextSelection.near(editor.state.doc.resolve(found + 2)),
    ).scrollIntoView();
    editor.view.dispatch(tr);
    editor.view.focus();
  }

  if (connStatus === 'rejected') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#ECEAE5] p-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl border border-gray-200 p-8 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#1A1A1B] mb-1">Cannot open the group workspace</h2>
          <p className="text-xs text-gray-500 mb-6 font-sans">
            You are not a registered member of this group, or your session has expired.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0047FF] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const frozen = !!group?.frozen_at;
  const isLeader = group ? parseInt(group.leader_id) === user?.id : false;
  const summary = statusSummary(group?.members);
  const colorMap = buildAuthorColorMap(group?.members || []);
  const myMember = group?.members?.find((m) => parseInt(m.student_id) === user?.id);
  const cursorUser = {
    name: myMember?.student_name || 'Me',
    color: AUTHOR_PALETTE[colorMap[user?.id] || 0].replace(/[\d.]+\)$/, '1)'),
  };

  const activeTypingUser = Object.values(presence).flat()[0];

  return (
    <div className="h-screen w-screen flex flex-col bg-[#ECEAE5] text-[#1A1A1B] overflow-hidden font-sans antialiased">
      
      {/* Full-Width Workspace Header */}
      <header className="h-14 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {/* Left: Brand + Back Button + Document Title + Avatar Stack */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link
            to={`/group/${group?.assignment_id || ''}`}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-[#0047FF] transition-colors pr-2 border-r border-gray-200 py-1"
            title="Return to Group Hub"
          >
            <BrandMark className="w-5 h-5 text-[#0047FF]" />
            <ArrowLeft className="w-3.5 h-3.5 ml-1" />
            <span className="hidden sm:inline">Hub</span>
          </Link>

          {/* Avatar Stack */}
          <div className="flex -space-x-1.5 overflow-hidden shrink-0">
            {(group?.members || []).map((m, idx) => {
              const authorColor = AUTHOR_PALETTE[colorMap[m.student_id] || idx % AUTHOR_PALETTE.length];
              const initials = m.student_name
                ? m.student_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                : 'ST';
              return (
                <div
                  key={m.student_id}
                  className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-xs shrink-0"
                  style={{ backgroundColor: authorColor.replace(/[\d.]+\)$/, '1)') }}
                  title={`${m.student_name} (${STATUS_LABEL[m.status] || 'Not Started'})`}
                >
                  {initials}
                </div>
              );
            })}
          </div>

          {/* Title & Autosave Pill */}
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#1A1A1B] truncate max-w-[180px] sm:max-w-md">
              {assignment?.title || group?.name || 'Group Assignment'}
            </span>
            {frozen ? (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                <Lock className="w-2.5 h-2.5" /> Sealed Snapshot
              </span>
            ) : (
              <span className="hidden md:inline-flex text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                Autosaved
              </span>
            )}
          </div>
        </div>

        {/* Right: Mobile View Tabs + Live Drafting Indicator + User Avatar */}
        <div className="flex items-center gap-3">
          {/* Mobile View Switcher */}
          <div className="flex md:hidden items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveMobileView('editor')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeMobileView === 'editor' ? 'bg-white shadow-xs text-[#1A1A1B] font-bold' : 'text-gray-600'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setActiveMobileView('outline')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeMobileView === 'outline' ? 'bg-white shadow-xs text-[#1A1A1B] font-bold' : 'text-gray-600'
              }`}
            >
              Pages
            </button>
            <button
              onClick={() => setActiveMobileView('status')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeMobileView === 'status' ? 'bg-white shadow-xs text-[#1A1A1B] font-bold' : 'text-gray-600'
              }`}
            >
              Status
            </button>
          </div>

          {/* Sync Telemetry */}
          <div className="flex items-center gap-2">
            {connStatus === 'connected' ? (
              <div className="flex items-center gap-1.5 bg-[#0047FF]/5 px-2.5 py-1 rounded-md border border-[#0047FF]/15">
                <span className="w-2 h-2 rounded-full bg-[#0047FF] animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-[#0047FF] uppercase tracking-widest hidden sm:inline">
                  Drafting Session Active
                </span>
              </div>
            ) : (
              <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {connStatus}
              </span>
            )}
          </div>

          {/* User Identicon Avatar */}
          {user && (
            <UserAvatar
              user={user}
              size={28}
              className="ring-1 ring-black/5"
            />
          )}
        </div>
      </header>

      {/* Full-Height 3-Pane Body */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Pane: Document Outline / Pages */}
        <aside
          className={`w-64 sm:w-72 border-r border-gray-200 p-4 bg-[#F9F8F6] flex-col justify-between shrink-0 overflow-y-auto ${
            activeMobileView === 'outline' ? 'flex w-full md:w-64 sm:md:w-72' : 'hidden md:flex'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-bold">
                DOCUMENT PAGES ({sectionsList.length})
              </span>
              <span className="text-[10px] font-mono text-gray-500 font-semibold">{totalWords} words</span>
            </div>

            <div className="space-y-2">
              {sectionsList.map((sec, idx) => {
                const isSelected = activeSectionIndex === idx;
                const users = presence[sec.id] || [];
                return (
                  <button
                    key={sec.id}
                    onClick={() => jumpToSection(sec.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1 shadow-xs ${
                      isSelected
                        ? 'bg-[#0047FF]/5 border-[#0047FF]/40 ring-1 ring-[#0047FF]/20'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-mono text-xs font-bold truncate ${
                          isSelected ? 'text-[#0047FF]' : 'text-gray-700'
                        }`}
                      >
                        {String(idx + 1).padStart(2, '0')}. {sec.pageLabel}
                      </span>
                      {isSelected ? (
                        <span className="bg-[#0047FF] text-white px-1.5 py-0.2 rounded text-[9px] font-mono font-bold tracking-wider shrink-0">
                          ACTIVE
                        </span>
                      ) : users.length > 0 ? (
                        <span className="flex -space-x-1 shrink-0">
                          {users.map((u, j) => (
                            <span
                              key={j}
                              className="w-2.5 h-2.5 rounded-full ring-1 ring-white inline-block"
                              style={{ backgroundColor: u.color }}
                            />
                          ))}
                        </span>
                      ) : null}
                    </div>

                    {sec.displayTitle !== sec.pageLabel && (
                      <div className="text-[11px] text-gray-500 truncate font-sans">
                        {sec.displayTitle}
                      </div>
                    )}

                    {users.length > 0 && (
                      <div className="text-[10px] font-mono text-[#0047FF] truncate">
                        {users.map((u) => u.name).join(', ')} typing
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {!frozen && (
              <button
                type="button"
                onClick={() => editor?.chain().focus('end').addSectionAfter().run()}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-mono font-bold text-[#0047FF] bg-white hover:bg-[#0047FF]/5 border border-dashed border-[#0047FF]/30 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Page</span>
              </button>
            )}
          </div>

          {/* Self-Organized Sections Notice */}
          <div className="mt-4 p-3.5 bg-white border border-gray-200 rounded-xl text-[11px] text-gray-500 shadow-xs space-y-1">
            <div className="font-bold text-[#1A1A1B] font-sans flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#0047FF]" />
              Multi-Page Workspace
            </div>
            <div className="leading-relaxed font-sans">
              Each page is a dedicated workspace sheet. Drag page handles to reorder.
            </div>
          </div>
        </aside>

        {/* Center Pane: Realistic Document Editor */}
        <main
          className={`flex-1 flex flex-col bg-white overflow-hidden ${
            activeMobileView === 'editor' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {/* Active Page Kicker */}
          <div className="px-6 py-2 bg-white border-b border-gray-200 flex items-center justify-between text-xs shrink-0 z-10">
            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500 font-bold truncate">
              {`PAGE ${String(activeSectionIndex + 1).padStart(2, '0')} OF ${String(sectionsList.length || 1).padStart(2, '0')}`}
            </span>

            {activeTypingUser ? (
              <span className="font-mono text-[10px] text-[#0047FF] bg-[#0047FF]/5 px-2.5 py-0.5 rounded-full border border-[#0047FF]/15 font-bold flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0047FF] animate-pulse" />
                {activeTypingUser.name} typing
              </span>
            ) : (
              <span className="font-mono text-[10px] text-gray-500">
                {totalWords} words total
              </span>
            )}
          </div>

          {/* Editor Canvas */}
          <div className="flex-1 overflow-hidden bg-[#ECEAE5]">
            {!showSkeleton && isCollabReady ? (
              <Editor
                submissionId={anchorId}
                editable={!frozen}
                collab={{ ydoc: collab.ydoc, provider: collab.provider, user: cursorUser }}
                extraExtensions={[AuthorOverride.configure({ authorId: user?.id })]}
                onReady={setEditor}
                onToggleFocus={() => setIsFocusMode(!isFocusMode)}
                isFocus={isFocusMode}
              />
            ) : (
              <EditorSkeleton />
            )}
          </div>
        </main>

        {/* Right Pane: Telemetry, Contribution & Record Status */}
        <aside
          className={`w-64 sm:w-72 border-l border-gray-200 bg-[#F9F8F6] p-4 flex-col justify-between shrink-0 overflow-y-auto ${
            activeMobileView === 'status' ? 'flex w-full md:w-64 sm:md:w-72' : 'hidden lg:flex'
          }`}
        >
          <div className="space-y-5">
            {/* Contribution Section */}
            <div>
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-3 font-bold">
                CONTRIBUTION
              </h4>
              <div className="space-y-2.5">
                {(group?.members || []).map((m, idx) => {
                  const authorColor = AUTHOR_PALETTE[colorMap[m.student_id] || idx % AUTHOR_PALETTE.length];
                  return (
                    <div key={m.student_id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#1A1A1B] font-semibold truncate max-w-[130px] flex items-center gap-1">
                          {m.student_name}
                          {m.is_leader == 1 && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                        </span>
                        <span className="font-mono text-gray-500 text-[11px] font-bold">
                          {m.status === 'done' ? '100% Done' : STATUS_LABEL[m.status] || 'Active'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: m.status === 'done' ? '100%' : '50%',
                            backgroundColor: authorColor.replace(/[\d.]+\)$/, '1)'),
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Record Status Section */}
            <div className="pt-3 border-t border-gray-200">
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-2.5 font-bold">
                RECORD STATUS
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500 font-sans">Autosave:</span>
                  <span className="font-mono text-emerald-700 font-bold">Continuous</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500 font-sans">Team Ready:</span>
                  <span className="font-mono text-[#0047FF] font-bold">
                    {summary.doneCount}/{summary.total} Done
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500 font-sans">Submission:</span>
                  <span className="font-mono text-gray-800 font-semibold">
                    {frozen ? 'Sealed' : summary.allDone ? 'Ready to seal' : 'In progress'}
                  </span>
                </div>
              </div>
            </div>

            {/* Member Action: Mark Done / Reopen */}
            {!frozen && myMember && (
              <div className="pt-3 border-t border-gray-200 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block">
                  YOUR WORK STATUS
                </span>
                {myMember.status === 'done' ? (
                  <button
                    onClick={() => handleStatusAction('reopen')}
                    disabled={statusBusy}
                    className="w-full py-2 px-3 text-xs font-mono font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Reopen My Work
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusAction('done')}
                    disabled={statusBusy}
                    className="w-full py-2.5 px-3 text-xs font-mono font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark My Section Done</span>
                  </button>
                )}
              </div>
            )}

            {/* Leader Submission Gate */}
            {isLeader && !frozen && (
              <div className="pt-3 border-t border-gray-200 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block">
                  LEADER SUBMISSION
                </span>
                {summary.allDone ? (
                  <button
                    onClick={() => setSubmitDialog('normal')}
                    className="w-full py-2.5 px-3 text-xs font-bold bg-[#0047FF] hover:bg-[#0038CC] text-white rounded-lg shadow-md shadow-blue-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Group Work</span>
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <button
                      disabled
                      className="w-full py-2 px-3 text-xs font-semibold bg-gray-100 text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed"
                    >
                      Submit ({summary.doneCount}/{summary.total} Done)
                    </button>
                    <button
                      onClick={() => setSubmitDialog('override')}
                      className="w-full py-2 px-3 text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                    >
                      Submit Anyway as Leader
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Proof of Work Stamp */}
          <div className="mt-auto pt-3 border-t border-gray-200 text-center">
            <span className="text-[10px] font-mono text-gray-400 leading-tight block">
              Preserved automatically as students write.
            </span>
          </div>
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

      {editor && !frozen && <SectionPresenceChips editor={editor} presence={presence} />}
    </div>
  );
}
