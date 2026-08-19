import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Film,
  Highlighter,
  PanelRightClose,
  PanelRightOpen,
  AlertTriangle,
  BarChart2,
  ChevronDown,
  Sparkles,
  Zap,
  TrendingUp,
  Edit3,
} from 'lucide-react';
import { api } from '../api';
import { AuthContext } from '../context/AuthContext';
import { useMinLoading } from '../hooks/useMinLoading';
import BrandMark from '../components/BrandMark';
import UserAvatar from '../components/UserAvatar';
import NotFound from './NotFound';
import { encodeId, decodeId } from '../utils/id';
import Playback from '../components/Playback';
import GroupFinalDoc from '../components/GroupFinalDoc';
import SubmissionRecord from '../components/SubmissionRecord';
import ProcessTimeline from '../components/ProcessTimeline';
import PasteAnalysis from '../components/PasteAnalysis';
import WritingPatternSummary from '../components/WritingPatternSummary';
import DocumentGrowthChart from '../components/DocumentGrowthChart';
import WritingRhythmChart from '../components/WritingRhythmChart';
import EditingActivity from '../components/EditingActivity';
import SourcesAndLinks from '../components/SourcesAndLinks';
import ContributionXray from '../components/ContributionXray';
import MemberWorkload from '../components/MemberWorkload';
import MemberActivityChart from '../components/MemberActivityChart';
import CopiedTextViewer from '../components/CopiedTextViewer';

export default function Review() {
  const { id } = useParams();
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const [data, setData] = useState(null);
  const [sections, setSections] = useState(null);
  const [loading, setLoading] = useState(true);
  const showSkeleton = useMinLoading(loading, 280);

  // Desktop Canvas Mode: 'final' (completed document) | 'playback' (interactive step scrubber)
  const [canvasMode, setCanvasMode] = useState('final');
  // Mobile App Mode: 'doc' | 'replay' | 'analytics'
  const [mobileTab, setMobileTab] = useState('doc');
  // Evidence Sidebar Tab: 'overview' | 'pattern' | 'timeline' | 'sources'
  const [sidebarTab, setSidebarTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [highlightPasted, setHighlightPasted] = useState(false); // DEFAULT OFF
  const [seekStepIndex, setSeekStepIndex] = useState(null);

  // Floating indicator scroll dismiss state
  const sidebarRef = useRef(null);
  const [sidebarScrolledDown, setSidebarScrolledDown] = useState(false);

  const isValidEncodedId = useMemo(() => {
    if (!id) return false;
    const decoded = decodeId(id);
    if (!decoded) return false;
    return encodeId(decoded) === id;
  }, [id]);

  useEffect(() => {
    if (!isValidEncodedId) {
      setLoading(false);
      return;
    }
    api.get(`submissions/${id}/playback`)
      .then((d) => {
        setData(d);
        if (d.sections) {
          setSections(d.sections);
        }
      })
      .catch(() => {
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [id, isValidEncodedId]);

  // Handle sidebar scroll to dismiss or re-show floating amber indicator
  function handleSidebarScroll(e) {
    const top = e.target.scrollTop;
    if (top > 100) {
      if (!sidebarScrolledDown) setSidebarScrolledDown(true);
    } else {
      if (sidebarScrolledDown) setSidebarScrolledDown(false);
    }
  }

  // Extract external pasted strings
  const pastedStrings = useMemo(() => {
    if (!data?.events && !data?.pasted_texts) return [];
    const strings = [];
    if (Array.isArray(data?.events)) {
      for (const e of data.events) {
        if (e.type !== 'paste') continue;
        let d = e.data;
        if (typeof d === 'string') {
          try { d = JSON.parse(d); } catch { d = null; }
        }
        const text = d?.pasted_text || d?.text;
        if (text && typeof text === 'string' && text.length >= 15) {
          if (!strings.includes(text)) {
            strings.push(text);
          }
        }
      }
    }
    if (Array.isArray(data?.pasted_texts)) {
      for (const t of data.pasted_texts) {
        if (typeof t === 'string' && t.length >= 15 && !strings.includes(t)) {
          strings.push(t);
        }
      }
    }
    return strings;
  }, [data?.events, data?.pasted_texts]);

  // Compute final document word count
  const wordCount = useMemo(() => {
    if (!data?.content) return 0;
    try {
      const text = typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
      const clean = text.replace(/<[^>]*>/g, ' ').replace(/[{}":[\],]/g, ' ');
      const words = clean.trim().split(/\s+/).filter(Boolean);
      return words.length;
    } catch {
      return 0;
    }
  }, [data?.content]);

  // Check if there are notable concerns in lower widgets
  const patternConcerns = useMemo(() => {
    if (!data?.events || !data.events.length) return null;
    const timed = data.events.filter((e) => Number.isFinite(Number(e?.occurred_at)));
    
    // Group minute typing
    const minuteBuckets = new Map();
    let pastedChars = 0;
    let typedChars = 0;
    let deleteChars = 0;

    for (const ev of timed) {
      const timeSec = Number(ev.occurred_at);
      const minuteKey = Math.floor(timeSec / 60) * 60;
      if (!minuteBuckets.has(minuteKey)) {
        minuteBuckets.set(minuteKey, { typed: 0, times: [] });
      }
      if (ev.type === 'step' || ev.type === 'keystroke') {
        typedChars++;
        minuteBuckets.get(minuteKey).typed++;
        minuteBuckets.get(minuteKey).times.push(timeSec);
      } else if (ev.type === 'paste') {
        const text = ev.data?.pasted_text || ev.data?.text || '';
        pastedChars += (text.length || ev.data?.pasted_text_length || ev.data?.length || 0);
      } else if (ev.type === 'delete') {
        deleteChars += (Number(ev.data?.length) || 1);
      }
    }

    let maxWpm = 0;
    for (const [, b] of minuteBuckets.entries()) {
      if (b.typed === 0) continue;
      let activeSecs = 60;
      if (b.times.length >= 2) {
        activeSecs = Math.max(b.times[b.times.length - 1] - b.times[0], 10);
      }
      const wpm = Math.round((b.typed / 5) / (activeSecs / 60));
      if (wpm > maxWpm) maxWpm = wpm;
    }

    const totalChars = Math.max(typedChars + pastedChars, 1);
    const pasteRatio = pastedChars / totalChars;

    const reasons = [];
    if (maxWpm > 85) {
      reasons.push({
        title: `${maxWpm} WPM Velocity Spike`,
        desc: `High velocity burst of ${maxWpm} WPM in Writing Rhythm.`,
      });
    }
    if (pasteRatio > 0.40) {
      reasons.push({
        title: `${Math.round(pasteRatio * 100)}% External Pasted Input`,
        desc: 'Sudden vertical step detected in Document Growth curve.',
      });
    }
    if (deleteChars < 20 && typedChars > 250) {
      reasons.push({
        title: 'Minimal In-line Revisions',
        desc: 'Single-pass drafting recorded in Editing Activity.',
      });
    }

    if (!reasons.length) return null;

    return {
      title: `${reasons.length} Notable ${reasons.length === 1 ? 'Pattern' : 'Patterns'} Detected Below`,
      detail: reasons[0].desc,
      reasons,
    };
  }, [data?.events]);

  function scrollToCharts() {
    if (sidebarRef.current) {
      sidebarRef.current.scrollTo({ top: 360, behavior: 'smooth' });
    }
  }

  if (showSkeleton) {
    return (
      <div className="h-screen w-screen flex flex-col bg-[#ECEAE5] overflow-hidden">
        <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="skeleton w-8 h-8 rounded-lg" />
            <div className="skeleton h-5 w-48 rounded" />
          </div>
          <div className="skeleton h-8 w-32 rounded-lg" />
        </div>
        <div className="flex-1 flex p-6 gap-6">
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-8 space-y-4">
            <div className="skeleton h-7 w-1/3 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-5/6 rounded" />
          </div>
          <div className="w-96 bg-white rounded-2xl border border-gray-200 p-6 space-y-4 hidden lg:block">
            <div className="skeleton h-6 w-1/2 rounded" />
            <div className="skeleton h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!isValidEncodedId || !data) {
    return <NotFound />;
  }

  const isGroup = Boolean(data?.is_group || sections);
  const student = data.student || {};

  return (
    <div className="h-screen w-screen flex flex-col bg-[#ECEAE5] text-[#1A1A1B] overflow-hidden font-sans antialiased select-none">
      
      {/* ============================================================ */}
      {/* 1. TOP APP BAR (Standard 64px / h-16)                        */}
      {/* ============================================================ */}
      <header className="h-16 bg-white border-b border-gray-200 px-3 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        {/* Left: Brand + Back Button + Document Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            to="/dashboard"
            className="p-2 rounded-xl text-gray-500 hover:text-[#1A1A1B] hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4" />
          </Link>
          <div className="h-5 w-px bg-gray-200 hidden sm:block shrink-0" />
          <BrandMark variant="wordmark" className="h-4.5 hidden sm:block shrink-0" />

          <div className="flex flex-col min-w-0 justify-center">
            <span className="text-xs sm:text-sm font-bold text-[#1A1A1B] truncate max-w-[160px] sm:max-w-xs md:max-w-md leading-tight">
              {data.assignment_title || 'Submission Review'}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-gray-500 font-mono truncate">
                {wordCount} words
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                Sealed Record
              </span>
            </div>
          </div>
        </div>

        {/* Right: Mode Switcher & Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Highlight External Text Toggle (Desktop) */}
          {pastedStrings.length > 0 && canvasMode === 'final' && (
            <button
              type="button"
              onClick={() => setHighlightPasted(!highlightPasted)}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                highlightPasted
                  ? 'bg-amber-100/80 text-amber-950 border-amber-300 shadow-2xs font-bold'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              title="Highlight all text pasted from external sources"
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-700" />
              <span>{highlightPasted ? 'Highlights On' : 'Highlight Pastes'}</span>
            </button>
          )}

          {/* Canvas Mode Switcher: Document vs Replay (Desktop) */}
          <div className="hidden sm:flex items-center bg-gray-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              aria-label="Document view"
              onClick={() => {
                setCanvasMode('final');
                setHighlightPasted(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                canvasMode === 'final'
                  ? 'bg-white text-[#1A1A1B] shadow-xs font-bold'
                  : 'text-gray-600 hover:text-[#1A1A1B]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#0047FF]" />
              <span>Document</span>
            </button>
            <button
              type="button"
              aria-label="Process record"
              onClick={() => {
                setCanvasMode('playback');
                setHighlightPasted(true);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                canvasMode === 'playback'
                  ? 'bg-white text-[#1A1A1B] shadow-xs font-bold'
                  : 'text-gray-600 hover:text-[#1A1A1B]'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-[#0047FF]" />
              <span>Replay</span>
            </button>
          </div>

          {/* Toggle Sidebar Collapse (Desktop) */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:inline-flex p-2 rounded-xl text-gray-500 hover:text-[#1A1A1B] hover:bg-gray-100 transition-colors cursor-pointer"
            title={sidebarOpen ? 'Hide Evidence Sidebar' : 'Show Evidence Sidebar'}
          >
            {sidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>

          {user && (
            <div className="hidden sm:block pl-1 border-l border-gray-200 ml-1">
              <UserAvatar user={user} size={28} className="ring-1 ring-black/5" />
            </div>
          )}
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. MAIN SPLIT CANVAS & EVIDENCE WORKSPACE                    */}
      {/* ============================================================ */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Main Canvas Area */}
        <main
          className={`flex-1 overflow-hidden relative ${
            mobileTab === 'analytics' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {isGroup ? (
            <GroupFinalDoc
              assignmentId={data.assignment_id}
              groupId={data.group_id}
              title={data.assignment_title}
              highlightPasted={highlightPasted}
              pastedTexts={pastedStrings}
            />
          ) : (
            <Playback
              key={`${id}-${canvasMode}`}
              submissionId={id}
              initialData={data}
              events={data?.events}
              finalContent={data?.content}
              mode={canvasMode}
              highlightPasted={highlightPasted}
              seekStepIndex={seekStepIndex}
              onSeekHandled={() => setSeekStepIndex(null)}
            />
          )}
        </main>

        {/* Evidence & Analytics Sidebar */}
        <aside
          ref={sidebarRef}
          onScroll={handleSidebarScroll}
          className={`w-full lg:w-96 border-l border-gray-200 bg-[#F9F8F6] p-4 flex-col gap-4 shrink-0 overflow-y-auto relative ${
            sidebarOpen ? 'flex' : 'hidden'
          } ${mobileTab === 'analytics' ? 'flex w-full' : 'hidden lg:flex'}`}
        >
          {/* Sidebar Segmented Tabs */}
          <div className="flex items-center bg-white border border-gray-200 p-1 rounded-xl text-xs font-semibold shrink-0 shadow-2xs gap-0.5 sticky top-0 z-20">
            <button
              type="button"
              onClick={() => setSidebarTab('overview')}
              className={`flex-1 min-w-[70px] py-1.5 text-center rounded-lg font-bold transition-all cursor-pointer ${
                sidebarTab === 'overview'
                  ? 'bg-[#0047FF] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('pattern')}
              className={`flex-1 min-w-[70px] py-1.5 text-center rounded-lg font-bold transition-all cursor-pointer ${
                sidebarTab === 'pattern'
                  ? 'bg-[#0047FF] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Pattern
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('timeline')}
              className={`flex-1 min-w-[70px] py-1.5 text-center rounded-lg font-bold transition-all cursor-pointer ${
                sidebarTab === 'timeline'
                  ? 'bg-[#0047FF] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Timeline
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('sources')}
              className={`flex-1 min-w-[70px] py-1.5 text-center rounded-lg font-bold transition-all cursor-pointer ${
                sidebarTab === 'sources'
                  ? 'bg-[#0047FF] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Sources
            </button>
          </div>

          {/* TAB 1: OVERVIEW & SUBMISSION RECORD */}
          {sidebarTab === 'overview' && (
            <div className="space-y-4">
              <SubmissionRecord
                data={data}
                wordCount={wordCount}
                highlightPasted={highlightPasted}
                onToggleHighlights={() => setHighlightPasted(!highlightPasted)}
                onViewProcessRecord={() => {
                  setSidebarTab('timeline');
                  setCanvasMode('playback');
                  setMobileTab('replay');
                }}
                isGroup={isGroup}
              />

              {/* Group Member Contribution Overview (if group) */}
              {isGroup && sections && (
                <div className="space-y-4">
                  <ContributionXray sections={sections} />
                  {data.insights && <MemberWorkload insights={data.insights} members={sections} />}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WRITING PATTERN & VISUALS */}
          {sidebarTab === 'pattern' && (
            <div className="space-y-4 relative">
              <WritingPatternSummary events={data.events} />
              <DocumentGrowthChart events={data.events} finalWordCount={wordCount} />
              <WritingRhythmChart events={data.events} />
              <EditingActivity events={data.events} />
            </div>
          )}

          {/* TAB 3: NARRATIVE PROCESS TIMELINE */}
          {sidebarTab === 'timeline' && (
            <div className="space-y-4">
              <ProcessTimeline
                events={data.events}
                onSeekToEvent={(stepIdx) => {
                  setCanvasMode('playback');
                  setSeekStepIndex(stepIdx);
                  setMobileTab('replay');
                }}
              />
            </div>
          )}

          {/* TAB 4: TEXT SOURCES & LINKS */}
          {sidebarTab === 'sources' && (
            <div className="space-y-4">
              <SourcesAndLinks events={data.events} rawContent={data.content} />
              <PasteAnalysis events={data.events} />
            </div>
          )}

          {/* Group Activity Charts */}
          {isGroup && data.insights && sidebarTab !== 'overview' && (
            <div className="space-y-4 pt-2 border-t border-gray-200">
              <MemberActivityChart insights={data.insights} members={sections} />
              <CopiedTextViewer insights={data.insights} members={sections} />
            </div>
          )}

          {/* ============================================================ */}
          {/* FLOATING AMBER CONCERN INDICATOR (Dismisses upon scroll)     */}
          {/* ============================================================ */}
          {sidebarTab === 'pattern' && patternConcerns && !sidebarScrolledDown && (
            <div
              onClick={scrollToCharts}
              className="sticky bottom-2 z-30 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl shadow-xl border border-amber-300/40 p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:shadow-2xl transition-all duration-200 active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>{patternConcerns.title}</span>
                  </div>
                  <div className="text-[11px] text-amber-100 truncate mt-0.5">
                    {patternConcerns.detail}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-xl text-[11px] font-bold tracking-wide shrink-0 transition-colors">
                <span>Inspect</span>
                <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ============================================================ */}
      {/* 3. MOBILE BOTTOM NAVIGATION                                  */}
      {/* ============================================================ */}
      <nav className="lg:hidden h-16 bg-white border-t border-gray-200 px-4 flex items-center justify-around shrink-0 z-30 shadow-lg pb-safe">
        <button
          type="button"
          onClick={() => {
            setMobileTab('doc');
            setCanvasMode('final');
            setHighlightPasted(false);
          }}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
            mobileTab === 'doc' && canvasMode === 'final'
              ? 'text-[#0047FF] font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[11px] font-sans">Document</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileTab('replay');
            setCanvasMode('playback');
            setHighlightPasted(true);
          }}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
            mobileTab === 'replay' || canvasMode === 'playback'
              ? 'text-[#0047FF] font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Film className="w-5 h-5" />
          <span className="text-[11px] font-sans">Replay</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('analytics')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
            mobileTab === 'analytics'
              ? 'text-[#0047FF] font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <BarChart2 className="w-5 h-5" />
          <span className="text-[11px] font-sans">Analytics</span>
        </button>
      </nav>

    </div>
  );
}
