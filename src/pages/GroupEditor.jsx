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
import { buildAuthorColorMap, solidAuthorColor } from '../utils/authorship';
import { statusSummary, STATUS_LABEL } from '../utils/groupStatus';
import { listSections } from '../utils/sectionDoc';
import { decodeId } from '../utils/id';
import { reviewLink } from '../utils/links';
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
  Activity,
} from 'lucide-react';

export default function GroupEditor() {
  const { groupId } = useParams();
  // URLs carry obfuscated ids; the collab server keys documents numerically
  // ("group:<id>", see collab/src/server.js parseDocName).
  const numericGroupId = decodeId(groupId);
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
  const [activeMobileTab, setActiveMobileTab] = useState('editor'); // 'editor' | 'outline' | 'team'
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [, setTick] = useState(0);

  const isLecturerView = user?.role === 'lecturer';
  // Lecturers never write, so they have no anchor submission — readiness only
  // requires the collab session for them.
  const isCollabReady = Boolean(collab && (isLecturerView || anchorId != null));
  const showSkeleton = useMinLoading(!isCollabReady, 280);

  // Who is editing which section right now
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
      const d = await api.post(`groups/${group.id}/submit`, overrideReason ? { override_reason: overrideReason } : {});
      setSubmitDialog(null);
      toast.success('Group assignment submitted and sealed successfully!');
      // The seal returns the merged submission id — go straight to its review.
      navigate(reviewLink(d.submission_id));
    } catch (err) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitBusy(false);
    }
  }

  // Yjs provider connection lifecycle
  useEffect(() => {
    let unmounted = false;
    let provider = null;
    let ydoc = null;

    async function initCollab() {
      try {
        const d = await api.get(`groups/${groupId}`);
        if (unmounted) return;
        setGroup(d.group);

        // Anchor submission: the per-member draft row that realtime event
        // tracking attaches to (POST /api/submissions is find-or-create, and
        // playback joins member events via these rows). Lecturers don't
        // write, so they get none.
        if (user?.role === 'student') {
          const s = await api.post('submissions', { assignment_id: d.group.assignment_id });
          if (!unmounted) setAnchorId(s.submission.id);
        }

        ydoc = new Y.Doc();
        const token = authToken();
        let authFailed = false;
        provider = new HocuspocusProvider({
          url: collabUrl(),
          name: `group:${numericGroupId}`,
          document: ydoc,
          token,
          onStatus: ({ status }) => {
            // 'connected' only means the websocket opened — auth may still
            // fail. Only onSynced proves the document session is live.
            if (!unmounted && status !== 'connected') setConnStatus(status);
          },
          onSynced: () => {
            if (!unmounted) setConnStatus('connected');
          },
          onClose: ({ event }) => {
            // 4401/4403 = the server rejected the token/document (the provider
            // retries silently forever — surface it once instead).
            if (unmounted || authFailed) return;
            if (event?.code === 4403 || event?.code === 4401) {
              authFailed = true;
              setConnStatus('auth-failed');
              toast.error('Realtime collaboration failed to authenticate — reload the page (log in again if it persists).');
            }
          },
        });

        if (user) {
          const color = solidAuthorColor(user.id || 0);
          provider.setAwarenessField('user', {
            id: user.id,
            name: user.name,
            role: user.role,
            color,
          });
        }

        if (!unmounted) {
          setCollab({ ydoc, provider });
        }
      } catch (err) {
        if (!unmounted) {
          setConnStatus('error');
          toast.error(err.message || 'Failed to initialize collaborative document');
        }
      }
    }

    initCollab();

    return () => {
      unmounted = true;
      if (provider) provider.destroy();
      if (ydoc) ydoc.destroy();
    };
  }, [groupId, user?.id]);

  const authorColors = useMemo(() => {
    return buildAuthorColorMap(group?.members || []);
  }, [group?.members]);

  const currentMember = (group?.members || []).find((m) => m.student_id === user?.id);
  const isLeader = group && user && group.leader_id === user.id;
  // Sealed = groups.frozen_at (set by the two-phase submit). There is no
  // groups.status column — keying off `status` kept the Submit button visible
  // forever after a successful submission.
  const frozen = !!group?.frozen_at;
  const summary = statusSummary(group?.members || []);

  const extraExtensions = useMemo(() => {
    if (!user) return [];
    return [
      AuthorOverride.configure({
        currentUserId: user.id,
        currentUserName: user.name,
        isGroup: true,
      }),
    ];
  }, [user?.id, user?.name]);

  // Derive outline sections
  const sectionsList = useMemo(() => {
    if (!editor) return [];
    try {
      return listSections(editor.state.doc).map((sec, idx) => ({
        id: sec.id,
        pos: sec.pos,
        title: sec.title || '',
        pageLabel: `Page ${idx + 1}`,
        displayTitle: sec.title ? `${sec.title}` : `Page ${idx + 1}`,
      }));
    } catch {
      return [];
    }
  }, [editor, group?.status]);

  const activeSectionIndex = useMemo(() => {
    if (!editor || !sectionsList.length) return 0;
    try {
      const { from } = editor.state.selection;
      let activeIdx = 0;
      for (let i = 0; i < sectionsList.length; i++) {
        if (sectionsList[i].pos <= from) {
          activeIdx = i;
        } else {
          break;
        }
      }
      return activeIdx;
    } catch {
      return 0;
    }
  }, [editor, sectionsList]);

  function jumpToSection(sectionId) {
    if (!editor) return;
    try {
      const sec = sectionsList.find((s) => s.id === sectionId);
      if (!sec) return;
      const targetPos = Math.min(sec.pos + 1, editor.state.doc.content.size);
      const tr = editor.state.tr.setSelection(TextSelection.create(editor.state.doc, targetPos));
      editor.view.dispatch(tr);
      editor.view.focus();
      setActiveMobileTab('editor');

      setTimeout(() => {
        const el = document.querySelector(`[data-section-id="${sectionId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    } catch {}
  }

  const totalWords = useMemo(() => {
    if (!editor) return 0;
    try {
      const text = editor.getText();
      return text.trim() ? text.trim().split(/\s+/).length : 0;
    } catch {
      return 0;
    }
  }, [editor, group?.status]);

  if (showSkeleton) {
    return <EditorSkeleton />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#ECEAE5] text-[#1A1A1B] overflow-hidden font-sans antialiased select-none">
      
      {/* ============================================================ */}
      {/* 1. TOP APP BAR (Standard 64px / h-16)                        */}
      {/* ============================================================ */}
      <header className="h-16 bg-white border-b border-gray-200 px-3 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        {/* Left: Back Arrow + Group Details */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            to={`/group/${groupId}`}
            className="p-2 rounded-xl text-gray-500 hover:text-[#1A1A1B] hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
            title="Return to Group Hub"
          >
            <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4" />
          </Link>
          <div className="h-5 w-px bg-gray-200 hidden sm:block shrink-0" />
          <BrandMark variant="wordmark" className="h-4.5 hidden sm:block shrink-0" />
          
          <div className="flex flex-col min-w-0 justify-center">
            <div className="flex items-center gap-1.5 min-w-0">
              <Users className="w-3.5 h-3.5 text-[#0047FF] shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-[#1A1A1B] truncate max-w-[150px] sm:max-w-xs leading-tight">
                {group?.name || 'Group Document'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-gray-500 font-mono truncate">
                {totalWords} words
              </span>
              <span className="text-gray-300">·</span>
              {frozen ? (
                <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-1 shrink-0">
                  <Lock className="w-2.5 h-2.5" /> Sealed
                </span>
              ) : connStatus === 'connected' ? (
                <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50/80 px-1.5 py-0.2 rounded flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Realtime
                </span>
              ) : (
                <span className="text-[9px] font-mono text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded shrink-0">
                  {connStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!frozen && (
            <>
              {currentMember && (
                <button
                  type="button"
                  disabled={statusBusy}
                  onClick={() => handleStatusAction(currentMember.status === 'done' ? 'reopen' : 'done')}
                  className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    currentMember.status === 'done'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{currentMember.status === 'done' ? 'You: Done' : 'Mark Done'}</span>
                </button>
              )}

              {isLeader && (
                <button
                  type="button"
                  onClick={() => setSubmitDialog({ override: !summary.allDone })}
                  className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Group</span>
                </button>
              )}
            </>
          )}

          {user && (
            <div className="hidden sm:block pl-1 border-l border-gray-200 ml-1">
              <UserAvatar user={user} size={28} className="ring-1 ring-black/5" />
            </div>
          )}
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. MAIN 3-PANE / MOBILE ACTIVE TAB WORKSPACE                */}
      {/* ============================================================ */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Pane: Document Outline / Pages */}
        <aside
          className={`w-64 sm:w-72 border-r border-gray-200 p-4 bg-[#F9F8F6] flex-col justify-between shrink-0 overflow-y-auto ${
            activeMobileTab === 'outline' ? 'flex w-full md:w-64 sm:w-72' : 'hidden md:flex'
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
                  </button>
                );
              })}
            </div>

            {!frozen && (
              <button
                type="button"
                onClick={() => {
                  editor?.chain().focus('end').addSectionAfter().run();
                  setActiveMobileTab('editor');
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-mono font-bold text-[#0047FF] bg-white hover:bg-[#0047FF]/5 border border-dashed border-[#0047FF]/30 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Page</span>
              </button>
            )}
          </div>
        </aside>

        {/* Center Pane: Word Collaborative TipTap Editor */}
        <main
          className={`flex-1 flex-col overflow-hidden relative ${
            activeMobileTab === 'editor' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {collab && (isLecturerView || anchorId) && (
            <Editor
              collab={{
                ydoc: collab.ydoc,
                provider: collab.provider,
                user: {
                  id: user?.id,
                  name: user?.name,
                  role: user?.role,
                  color: solidAuthorColor(user?.id || 0),
                },
              }}
              submissionId={anchorId}
              onReady={(ed) => setEditor(ed)}
              editable={!frozen}
              onToggleFocus={() => setIsFocusMode(!isFocusMode)}
              isFocus={isFocusMode}
              extraExtensions={extraExtensions}
              authorColors={authorColors}
              isGroup={true}
            />
          )}
        </main>

        {/* Right Pane: Team Contribution Roster */}
        <aside
          className={`w-72 sm:w-80 border-l border-gray-200 p-4 bg-[#F9F8F6] flex-col justify-between shrink-0 overflow-y-auto ${
            activeMobileTab === 'team' ? 'flex w-full md:w-72 sm:w-80' : 'hidden lg:flex'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#0047FF]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-bold">
                  TEAM ROSTER ({group?.members?.length || 0})
                </span>
              </div>
              <span className="text-[10px] font-mono text-gray-500 font-bold">
                {summary.doneCount}/{summary.total} Done
              </span>
            </div>

            {/* Member Cards */}
            <div className="space-y-2">
              {(group?.members || []).map((m) => {
                const color = authorColors[m.student_id] || '#6B7280';
                const isMe = m.student_id === user?.id;
                const isLeaderMember = m.student_id === group.leader_id;

                return (
                  <div
                    key={m.student_id}
                    className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 ring-1 ring-white"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs font-bold text-gray-800 truncate">
                          {m.student_name} {isMe ? '(You)' : ''}
                        </span>
                        {isLeaderMember && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase ${
                        m.status === 'done'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {STATUS_LABEL[m.status] || 'Active'}
                      </span>
                    </div>

                    {isMe && !frozen && (
                      <button
                        type="button"
                        onClick={() => handleStatusAction(m.status === 'done' ? 'reopen' : 'done')}
                        className={`w-full py-1.5 text-center text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                          m.status === 'done'
                            ? 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 font-bold'
                        }`}
                      >
                        {m.status === 'done' ? 'Reopen for editing' : 'Mark as Done'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* ============================================================ */}
      {/* 3. MOBILE BOTTOM NAVIGATION BAR                              */}
      {/* ============================================================ */}
      <nav className="md:hidden h-16 bg-white border-t border-gray-200 px-4 flex items-center justify-around shrink-0 z-30 shadow-lg pb-safe">
        <button
          type="button"
          onClick={() => setActiveMobileTab('editor')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
            activeMobileTab === 'editor'
              ? 'text-[#0047FF] font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[11px] font-sans">Editor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMobileTab('outline')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
            activeMobileTab === 'outline'
              ? 'text-[#0047FF] font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[11px] font-sans">Pages ({sectionsList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMobileTab('team')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
            activeMobileTab === 'team'
              ? 'text-[#0047FF] font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[11px] font-sans">Team ({summary.doneCount}/{summary.total})</span>
        </button>
      </nav>

      {/* Submit Confirmation Dialog */}
      {submitDialog && (
        <GroupSubmitDialog
          summary={summary}
          group={group}
          isOverride={submitDialog.override}
          busy={submitBusy}
          onClose={() => setSubmitDialog(null)}
          onConfirm={handleSubmit}
        />
      )}

    </div>
  );
}
