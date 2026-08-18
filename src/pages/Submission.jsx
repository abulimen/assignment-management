import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { api } from '../api';
import Editor from '../components/Editor';
import EditorSkeleton from '../components/EditorSkeleton';
import BrandMark from '../components/BrandMark';
import UserAvatar from '../components/UserAvatar';
import { useMinLoading } from '../hooks/useMinLoading';
import { wrapFlatContent, listSections } from '../utils/sectionDoc';
import { TextSelection } from '@tiptap/pm/state';
import {
  Save,
  Send,
  Lock,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  BookOpen,
  Plus,
  Layers,
  FileCheck,
  Activity,
  X,
  FileText,
} from 'lucide-react';

function normalizeForEditor(raw) {
  if (!raw) return JSON.stringify(wrapFlatContent(null));
  try {
    return JSON.stringify(wrapFlatContent(JSON.parse(raw)));
  } catch {
    return raw;
  }
}

export default function Submission() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submission, setSubmission] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const showSkeleton = useMinLoading(loading, 280);
  const [editor, setEditor] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [activeMobileView, setActiveMobileView] = useState('editor'); // 'editor' | 'outline' | 'status'
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (user?.role === 'lecturer' && id && !searchParams.get('sub')) {
      navigate(`/assignments/${id}`, { replace: true });
    }
  }, [user?.role, id, navigate, searchParams]);

  useEffect(() => {
    if (!id || user?.role === 'lecturer') return;
    const sectionSubId = searchParams.get('sub');
    if (sectionSubId) {
      api.get(`submissions/${sectionSubId}`).then((r) => {
        setSubmission(r.submission);
        setContent(normalizeForEditor(r.submission.content));
        return api.get(`assignments/${id}`);
      }).then((d) => {
        setAssignment(d.assignment);
      }).catch((err) => {
        toast.error(err.message || 'Failed to load submission');
      }).finally(() => setLoading(false));
      return;
    }

    api.get(`assignments/${id}`).then((d) => {
      setAssignment(d.assignment);
      const sub = d.assignment.submissions?.find((s) => s.student_id === user?.id || s.student_id === user?.sub) || d.assignment.submissions?.[0];
      if (sub) {
        return api.get(`submissions/${sub.id}`).then((r) => {
          setSubmission(r.submission);
          setContent(normalizeForEditor(r.submission.content));
        });
      } else {
        return api.post('submissions', { assignment_id: id }).then((r) => {
          setSubmission(r.submission);
          setContent(normalizeForEditor(r.submission?.content));
        });
      }
    }).catch((err) => {
      toast.error(err.message || 'Failed to load assignment workspace');
    }).finally(() => setLoading(false));
  }, [id, user?.id, user?.sub, user?.role, searchParams]);

  // Force tick on transactions for outline/word count
  useEffect(() => {
    if (!editor) return undefined;
    const bump = () => setTick((t) => t + 1);
    editor.on('transaction', bump);
    return () => {
      editor.off('transaction', bump);
    };
  }, [editor]);

  async function handleSave() {
    if (!submission) return;
    setSaving(true);
    setSavedMsg('');
    const latestContent = editor ? JSON.stringify(editor.getJSON()) : content;
    try {
      await api.put(`submissions/${submission.id}`, { content: latestContent });
      setSavedMsg('Saved');
      toast.success('Draft saved to cloud');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (err) {
      toast.error(err.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  }

  async function executeSubmit() {
    if (!submission) return;
    setSaving(true);
    const latestContent = editor ? JSON.stringify(editor.getJSON()) : content;
    try {
      await api.post(`submissions/${submission.id}/submit`, { content: latestContent });
      setShowSubmitModal(false);
      toast.success('Assignment submitted successfully!');
      navigate(`/assignments/${id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to submit assignment');
    } finally {
      setSaving(false);
    }
  }

  // Automatic debounced autosave for active drafts
  useEffect(() => {
    if (!submission || submission.status === 'submitted' || !editor) return;
    const timer = setTimeout(() => {
      try {
        const currentJson = JSON.stringify(editor.getJSON());
        if (currentJson && currentJson !== submission.content) {
          api.put(`submissions/${submission.id}`, { content: currentJson })
            .then(() => {
              setSavedMsg('Autosaved');
              setTimeout(() => setSavedMsg(''), 2000);
            })
            .catch(() => {});
        }
      } catch {}
    }, 4000);
    return () => clearTimeout(timer);
  }, [content, submission?.id, submission?.status, editor]);

  const sectionsList = useMemo(() => {
    if (!editor) return [];
    try {
      const list = listSections(editor.getJSON());
      const doc = editor.state.doc;
      return list.map((sec, idx) => {
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

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#ECEAE5] p-4">
        <div className="max-w-md w-full text-center bg-white rounded-2xl border border-gray-200 p-8 shadow-xl">
          <div className="skeleton h-8 w-1/3 rounded mx-auto mb-4" />
          <div className="skeleton h-4 w-2/3 rounded mx-auto mb-6" />
          <div className="skeleton h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#ECEAE5] p-4 text-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 shadow-xl space-y-4">
          <FileText className="w-10 h-10 text-gray-400 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900">Workspace Unavailable</h2>
          <p className="text-xs text-gray-500">
            Unable to load or initialize this assignment submission. You may not have access or this assignment has not started.
          </p>
          <Link
            to={id ? `/assignments/${id}` : '/dashboard'}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-lg shadow-xs transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Assignment</span>
          </Link>
        </div>
      </div>
    );
  }

  const isSubmitted = submission?.status === 'submitted';
  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ME';

  return (
    <div className="h-screen w-screen flex flex-col bg-[#ECEAE5] text-[#1A1A1B] overflow-hidden font-sans antialiased">
      
      {/* Full-Width Workspace Header */}
      <header className="h-14 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {/* Left: Brand + Back Button + Document Title */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link
            to={`/assignments/${id}`}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-[#0047FF] transition-colors pr-2 border-r border-gray-200 py-1"
            title="Return to Assignment Hub"
          >
            <BrandMark className="w-5 h-5 text-[#0047FF]" />
            <ArrowLeft className="w-3.5 h-3.5 ml-1" />
            <span className="hidden sm:inline">Hub</span>
          </Link>

          <UserAvatar
            user={user}
            size={28}
            className="ring-1 ring-black/5 shrink-0"
          />

          <div className="min-w-0 flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#1A1A1B] truncate max-w-[180px] sm:max-w-md">
              {assignment?.title || 'Individual Assignment'}
            </span>
            {isSubmitted ? (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                <Lock className="w-2.5 h-2.5" /> Sealed Snapshot
              </span>
            ) : (
              <span className="hidden md:inline-flex text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                {savedMsg ? 'Saved' : 'Autosaved'}
              </span>
            )}
          </div>
        </div>

        {/* Right: Prompt Drawer Toggle + Live Session Indicator + User Avatar */}
        <div className="flex items-center gap-3">
          {assignment?.description && (
            <button
              type="button"
              onClick={() => setShowPrompt(!showPrompt)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-[#F9F8F6] hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#0047FF]" />
              <span className="hidden sm:inline">Guidelines</span>
            </button>
          )}

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

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#0047FF]/5 px-2.5 py-1 rounded-md border border-[#0047FF]/15">
              <span className="w-2 h-2 rounded-full bg-[#0047FF] animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-[#0047FF] uppercase tracking-widest hidden sm:inline">
                Drafting Session Active
              </span>
            </div>
          </div>

          {user && (
            <UserAvatar
              user={user}
              size={28}
              className="ring-1 ring-black/5"
            />
          )}
        </div>
      </header>

      {/* Guidelines Modal/Drawer */}
      {showPrompt && assignment?.description && (
        <div className="bg-white border-b border-gray-200 p-4 px-6 shadow-xs flex items-start justify-between gap-4 animate-in fade-in duration-150 shrink-0 z-20">
          <div className="space-y-1 min-w-0">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#0047FF]" />
              Assignment Guidelines & Instructions
            </h3>
            <div className="text-xs text-gray-600 font-sans leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
              {assignment.description}
            </div>
          </div>
          <button
            onClick={() => setShowPrompt(false)}
            className="text-gray-400 hover:text-gray-600 text-xs font-mono shrink-0 cursor-pointer"
          >
            ✕ Close
          </button>
        </div>
      )}

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
                      {isSelected && (
                        <span className="bg-[#0047FF] text-white px-1.5 py-0.2 rounded text-[9px] font-mono font-bold tracking-wider shrink-0">
                          ACTIVE
                        </span>
                      )}
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

            {!isSubmitted && (
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

          {/* Multi-Page Notice */}
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

            <span className="font-mono text-[10px] text-gray-500">
              {totalWords} words total
            </span>
          </div>

          {/* Editor Canvas with Desk Surface */}
          <div className="flex-1 overflow-hidden bg-[#ECEAE5]">
            {!showSkeleton && submission ? (
              <Editor
                submissionId={submission.id}
                initialContent={normalizeForEditor(submission.content)}
                onContentChange={setContent}
                editable={!isSubmitted}
                onReady={setEditor}
                onToggleFocus={() => setIsFocusMode(!isFocusMode)}
                isFocus={isFocusMode}
              />
            ) : (
              <EditorSkeleton />
            )}
          </div>
        </main>

        {/* Right Pane: Telemetry & Submission */}
        <aside
          className={`w-64 sm:w-72 border-l border-gray-200 bg-[#F9F8F6] p-4 flex-col justify-between shrink-0 overflow-y-auto ${
            activeMobileView === 'status' ? 'flex w-full md:w-64 sm:md:w-72' : 'hidden lg:flex'
          }`}
        >
          <div className="space-y-5">
            {/* Telemetry Section */}
            <div>
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-3 font-bold">
                DOCUMENT TELEMETRY
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-500 font-sans">Word Count:</span>
                  <span className="font-mono font-bold text-[#1A1A1B]">{totalWords} words</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-500 font-sans">Total Pages:</span>
                  <span className="font-mono font-bold text-[#1A1A1B]">{sectionsList.length} pages</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-500 font-sans">Autosave:</span>
                  <span className="font-mono text-emerald-700 font-bold">Continuous</span>
                </div>
              </div>
            </div>

            {/* Record Status Section */}
            <div className="pt-3 border-t border-gray-200">
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-2.5 font-bold">
                RECORD STATUS
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500 font-sans">Snapshot:</span>
                  <span className="font-mono text-gray-800 font-semibold">
                    {isSubmitted ? 'Sealed & Locked' : 'Live Editing'}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-gray-500 font-sans">History:</span>
                  <span className="font-mono text-emerald-700 font-semibold">Preserved</span>
                </div>
              </div>
            </div>

            {/* Submission Actions */}
            {!isSubmitted && (
              <div className="pt-3 border-t border-gray-200 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block">
                  WORKSPACE ACTIONS
                </span>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-2 px-3 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Draft</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  disabled={saving}
                  className="w-full py-2.5 px-3 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-lg shadow-md shadow-blue-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Assignment</span>
                </button>
              </div>
            )}

            {isSubmitted && (
              <div className="pt-3 border-t border-gray-200 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Submission Sealed
                </div>
                <p className="text-[11px] text-emerald-800">
                  Your final document and writing history are permanently preserved.
                </p>
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

      {/* Two-Stage Sealing Confirmation Modal */}
      {showSubmitModal && (
        typeof document !== 'undefined' ? createPortal(
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0047FF]/10 text-[#0047FF] border border-[#0047FF]/20 flex items-center justify-center font-bold">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#1A1A1B]">Submit Final Assignment?</h3>
                    <p className="text-xs text-gray-500 font-sans">This action permanently seals your work record.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-[#F9F8F6] rounded-xl border border-gray-200 text-xs text-gray-600 space-y-2 leading-relaxed">
                <p className="font-bold text-[#1A1A1B] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0047FF]" />
                  What happens upon submission:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 pl-1 font-sans">
                  <li>Your final document snapshot is frozen and sealed on the server.</li>
                  <li>Your full development history, typing sessions, and revisions remain preserved with your submission.</li>
                  <li>Your lecturer receives instant access to evaluate your paper.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-[#1A1A1B] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Continue Editing
                </button>
                <button
                  type="button"
                  onClick={executeSubmit}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0047FF] text-white text-xs font-bold rounded-lg hover:bg-[#0038CC] shadow-md shadow-blue-200 disabled:opacity-50 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{saving ? 'Sealing...' : 'Confirm & Seal Submission'}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        ) : null
      )}
    </div>
  );
}