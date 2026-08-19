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
  HelpCircle,
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
  const [activeMobileTab, setActiveMobileTab] = useState('editor'); // 'editor' | 'outline' | 'status'
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
              setSavedMsg('Saved');
              setTimeout(() => setSavedMsg(''), 2000);
            })
            .catch(() => {});
        }
      } catch {}
    }, 4000);

    return () => clearTimeout(timer);
  }, [editor, submission, content]);

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
  }, [editor, content]);

  // Find active section based on editor cursor position
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
  }, [editor, content]);

  if (showSkeleton) {
    return <EditorSkeleton />;
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

  return (
    <div className="h-screen w-screen flex flex-col bg-[#ECEAE5] text-[#1A1A1B] overflow-hidden font-sans antialiased select-none">
      
      {/* ============================================================ */}
      {/* 1. TOP APP BAR (Standard 64px / h-16)                        */}
      {/* ============================================================ */}
      <header className="h-16 bg-white border-b border-gray-200 px-3 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        {/* Left: Back Arrow & Document Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            to={`/assignments/${id}`}
            className="p-2 rounded-xl text-gray-500 hover:text-[#1A1A1B] hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
            title="Return to Assignment Hub"
          >
            <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4" />
          </Link>
          <div className="h-5 w-px bg-gray-200 hidden sm:block shrink-0" />
          <BrandMark variant="wordmark" className="h-4.5 hidden sm:block shrink-0" />
          
          <div className="flex flex-col min-w-0 justify-center">
            <span className="text-xs sm:text-sm font-bold text-[#1A1A1B] truncate max-w-[160px] sm:max-w-xs md:max-w-md leading-tight">
              {assignment?.title || 'Assignment Workspace'}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-gray-500 font-mono truncate">
                {totalWords} words
              </span>
              <span className="text-gray-300">·</span>
              {isSubmitted ? (
                <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-1 shrink-0">
                  <Lock className="w-2.5 h-2.5" /> Sealed
                </span>
              ) : (
                <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50/70 px-1.5 py-0.2 rounded shrink-0">
                  {savedMsg ? 'Saved to cloud' : 'Autosaving'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {assignment?.description && (
            <button
              type="button"
              onClick={() => setShowPrompt(!showPrompt)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-gray-700 bg-[#F9F8F6] hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#0047FF]" />
              <span className="hidden md:inline">Guidelines</span>
            </button>
          )}

          {!isSubmitted ? (
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Turn In</span>
            </button>
          ) : (
            <Link
              to={`/review/${submission.id}`}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold text-[#0047FF] bg-[#0047FF]/10 hover:bg-[#0047FF]/20 rounded-xl transition-all cursor-pointer"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>View Record</span>
            </Link>
          )}

          {user && (
            <div className="hidden sm:block pl-1 border-l border-gray-200 ml-1">
              <UserAvatar user={user} size={28} className="ring-1 ring-black/5" />
            </div>
          )}
        </div>
      </header>

      {/* Guidelines Modal/Drawer */}
      {showPrompt && assignment?.description && (
        <div className="bg-white border-b border-gray-200 p-4 px-4 sm:px-6 shadow-md flex items-start justify-between gap-4 animate-in fade-in duration-150 shrink-0 z-20">
          <div className="space-y-1 min-w-0">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#0047FF]" />
              Assignment Guidelines & Instructions
            </h3>
            <div className="text-xs text-gray-600 font-sans leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
              {assignment.description}
            </div>
          </div>
          <button
            onClick={() => setShowPrompt(false)}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 text-xs font-mono shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

        {/* Center Pane: Word TipTap Editor */}
        <main
          className={`flex-1 flex-col overflow-hidden relative ${
            activeMobileTab === 'editor' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <Editor
            content={content}
            submissionId={submission.id}
            onReady={(ed) => setEditor(ed)}
            editable={!isSubmitted}
            onToggleFocus={() => setIsFocusMode(!isFocusMode)}
            isFocus={isFocusMode}
            onSave={handleSave}
            saving={saving}
          />
        </main>

        {/* Right Pane: Live Telemetry & Process Overview */}
        <aside
          className={`w-72 sm:w-80 border-l border-gray-200 p-4 bg-[#F9F8F6] flex-col justify-between shrink-0 overflow-y-auto ${
            activeMobileTab === 'status' ? 'flex w-full md:w-72 sm:w-80' : 'hidden lg:flex'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#0047FF]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-bold">
                  WORKSPACE INTEGRITY
                </span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Draft Status</span>
                <span className="text-xs font-mono font-bold text-gray-800 uppercase">
                  {isSubmitted ? 'Sealed' : 'In Progress'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Words Written</span>
                <span className="text-xs font-mono font-bold text-[#0047FF]">
                  {totalWords.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Pages</span>
                <span className="text-xs font-mono font-bold text-gray-800">
                  {sectionsList.length}
                </span>
              </div>
            </div>

            <div className="bg-blue-50/50 rounded-2xl border border-blue-200/60 p-4 space-y-1.5 text-xs text-blue-900 font-sans leading-relaxed">
              <div className="font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#0047FF]" />
                Connected Telemetry
              </div>
              <p className="text-[11px] text-blue-800/80">
                Keystrokes and drafts are automatically stamped and saved to your cloud record. No manual saving required.
              </p>
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
          onClick={() => setActiveMobileTab('status')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
            activeMobileTab === 'status'
              ? 'text-[#0047FF] font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[11px] font-sans">Status</span>
        </button>
      </nav>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-[#0047FF]/10 flex items-center justify-center text-[#0047FF]">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1A1A1B]">Submit Assignment</h3>
                <p className="text-xs text-gray-500 font-mono">
                  {totalWords} words across {sectionsList.length} pages
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 font-sans leading-relaxed">
              Submitting permanently seals your work and delivers it to your lecturer with proof-of-work analytics. Once sealed, no further edits can be made.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSubmit}
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
