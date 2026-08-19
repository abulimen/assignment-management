import React, { useState, useEffect, useMemo, useContext } from 'react';
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
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../api';
import { AuthContext } from '../context/AuthContext';
import { useMinLoading } from '../hooks/useMinLoading';
import BrandMark from '../components/BrandMark';
import UserAvatar from '../components/UserAvatar';
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
  const [highlightPasted, setHighlightPasted] = useState(false);
  const [seekStepIndex, setSeekStepIndex] = useState(null);

  useEffect(() => {
    api.get(`submissions/${id}/playback`)
      .then((d) => {
        setData(d);
        if (d.sections) {
          setSections(d.sections);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

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

  // Total word count
  const wordCount = useMemo(() => {
    if (data?.content) {
      try {
        const parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
        const blocks = [];
        const walk = (node) => {
          if (!node) return;
          if (node.type === 'sectionTitle') return;
          if (typeof node.text === 'string') {
            blocks.push(node.text);
            return;
          }
          if (Array.isArray(node.content)) {
            for (const child of node.content) walk(child);
            if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'section' || node.type === 'blockquote' || node.type === 'listItem' || node.type === 'codeBlock') {
              blocks.push('\n');
            }
          }
        };
        walk(parsed);
        const fullText = blocks.join('').trim();
        if (fullText) return fullText.split(/\s+/).filter(Boolean).length;
      } catch {}
    }
    return data?.stats?.word_count || 0;
  }, [data?.content, data?.stats?.word_count]);

  if (showSkeleton) {
    return (
      <div role="status" aria-label="Loading review" className="h-screen w-screen flex flex-col bg-[#ECEAE5] overflow-hidden">
        <div className="h-14 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="skeleton h-5 w-32 sm:w-48 rounded" />
          <div className="skeleton h-8 w-40 sm:w-64 rounded-xl" />
          <div className="skeleton h-6 w-16 sm:w-24 rounded-full" />
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-[800px] h-[90%] bg-white shadow-xl rounded-sm p-6 sm:p-12 space-y-6">
              <div className="skeleton h-8 w-3/4 rounded" />
              <div className="space-y-3 pt-4">
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-5/6 rounded" />
                <div className="skeleton h-4 w-4/6 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#ECEAE5] p-6 text-center">
        <h2 className="text-xl font-bold text-[#1A1A1B]">Submission Not Found</h2>
        <p className="text-sm text-gray-600 mt-2 font-sans max-w-md">
          The requested submission could not be loaded or you do not have permission to view it.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0047FF] text-white font-semibold text-xs shadow-xs hover:bg-[#0038CC] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isGroup = !!(data.group_id || (Array.isArray(data.sections) && data.sections.length > 0));

  // Determine current active player mode (desktop vs mobile)
  const effectivePlaybackMode = canvasMode === 'playback' || mobileTab === 'replay';

  return (
    <div className="h-screen w-screen flex flex-col bg-[#ECEAE5] overflow-hidden select-none">
      
      {/* ============================================================ */}
      {/* 1. TOP APP BAR (Native App Feel on Mobile, Clean on Desktop) */}
      {/* ============================================================ */}
      <header className="h-13 sm:h-14 bg-white border-b border-gray-200 px-3 sm:px-6 flex items-center justify-between shrink-0 z-20 shadow-2xs">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            to={`/assignments/${data.assignment_id}`}
            className="p-1.5 rounded-lg text-gray-500 hover:text-[#1A1A1B] hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
            title="Back to Assignment"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="h-4 w-px bg-gray-200 hidden sm:block shrink-0" />
          <BrandMark variant="wordmark" className="h-4 hidden sm:block shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-bold text-[#1A1A1B] truncate max-w-[170px] sm:max-w-xs">
              {data.assignment_title || 'Submission Review'}
            </span>
            <span className="text-[10px] text-gray-500 font-mono truncate">
              {data.student_name || (isGroup ? 'Group' : 'Student')} · {wordCount} words
            </span>
          </div>
        </div>

        {/* Center: DESKTOP ONLY Mode Switcher */}
        <div className="hidden lg:flex items-center bg-[#F9F8F6] p-1 rounded-xl border border-gray-200 shadow-2xs">
          <button
            type="button"
            aria-label="Document View"
            onClick={() => {
              setCanvasMode('final');
              setSeekStepIndex(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              canvasMode === 'final'
                ? 'bg-white text-[#0047FF] shadow-xs font-bold'
                : 'text-gray-600 hover:text-[#1A1A1B]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Document</span>
          </button>

          <button
            type="button"
            aria-label="Process Record"
            onClick={() => {
              setCanvasMode('playback');
              setHighlightPasted(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              canvasMode === 'playback'
                ? 'bg-[#0047FF] text-white shadow-xs font-bold'
                : 'text-gray-600 hover:text-[#1A1A1B]'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Replay</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Highlight Toggle (Works on both mobile & desktop) */}
          {pastedStrings.length > 0 && (
            <button
              type="button"
              onClick={() => setHighlightPasted(!highlightPasted)}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                highlightPasted
                  ? 'bg-amber-50 text-amber-950 border-amber-300 ring-1 ring-amber-300/40'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
              title={highlightPasted ? 'Hide Pasted Highlights' : 'Highlight Pasted Text'}
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="hidden md:inline text-[11px]">
                {highlightPasted ? 'Highlights: ON' : 'Highlights: OFF'}
              </span>
            </button>
          )}

          {/* Desktop Sidebar Collapse Toggle */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`hidden lg:flex p-1.5 rounded-lg border transition-colors cursor-pointer ${
              sidebarOpen
                ? 'bg-[#0047FF]/5 text-[#0047FF] border-[#0047FF]/20'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
            title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            {sidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>

          {user && (
            <div className="pl-1 border-l border-gray-200 ml-0.5">
              <UserAvatar user={user} size={26} className="ring-1 ring-black/5" />
            </div>
          )}
        </div>
      </header>

      {/* Leader Override Alert Banner */}
      {data.override?.used && (
        <div className="bg-amber-50 border-b border-amber-300 px-3 sm:px-6 py-2 shadow-xs flex items-center justify-between gap-4 text-xs text-amber-900 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">
              <strong>Override:</strong> {data.override.by_name} (<em>"{data.override.reason}"</em>)
            </span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. MAIN WORKSPACE (Desktop: Side-by-Side, Mobile: Active Tab) */}
      {/* ============================================================ */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* CENTER MAIN CANVAS: Realistic Paper Document / Scrubber */}
        <main
          className={`flex-1 flex-col overflow-hidden relative bg-[#ECEAE5] ${
            mobileTab === 'analytics' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {isGroup ? (
            <GroupFinalDoc content={data.content} sections={sections} />
          ) : (
            <Playback
              key={`review-view-${id}-${effectivePlaybackMode ? 'replay' : 'final'}`}
              events={data.events}
              finalContent={data.content}
              initialMode={effectivePlaybackMode ? 'playback' : 'final'}
              externalHighlight={highlightPasted}
              seekStepIndex={seekStepIndex}
            />
          )}
        </main>

        {/* EVIDENCE SIDEBAR (Desktop Side Panel / Mobile Full-Screen Tab) */}
        <aside
          className={`${
            mobileTab === 'analytics'
              ? 'flex-1 w-full lg:flex-none lg:w-84 xl:w-96 flex'
              : sidebarOpen
              ? 'hidden lg:flex lg:w-84 xl:w-96'
              : 'hidden'
          } border-l border-gray-200 bg-[#F9F8F6] flex-col shrink-0 overflow-y-auto transition-all duration-200 z-10 p-3 sm:p-4 space-y-4`}
        >
          {/* Universal 4-Tab Evidence Navigation */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-gray-200 shadow-2xs text-xs font-mono shrink-0 overflow-x-auto">
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
                  setHighlightPasted(true);
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
            <div className="space-y-4">
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
        </aside>
      </div>

      {/* ============================================================ */}
      {/* 3. MOBILE BOTTOM NAVIGATION (Native App Navigation Bar)      */}
      {/* ============================================================ */}
      <nav className="lg:hidden h-14 bg-white border-t border-gray-200 px-4 flex items-center justify-around shrink-0 z-30 shadow-lg">
        <button
          type="button"
          onClick={() => {
            setMobileTab('doc');
            setCanvasMode('final');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors cursor-pointer ${
            mobileTab === 'doc'
              ? 'text-[#0047FF] font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="text-[10px] font-sans">Document</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileTab('replay');
            setCanvasMode('playback');
            setHighlightPasted(true);
          }}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors cursor-pointer ${
            mobileTab === 'replay'
              ? 'text-[#0047FF] font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Film className="w-4 h-4" />
          <span className="text-[10px] font-sans">Replay</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileTab('analytics');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors cursor-pointer ${
            mobileTab === 'analytics'
              ? 'text-[#0047FF] font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span className="text-[10px] font-sans">Analytics</span>
        </button>
      </nav>

    </div>
  );
}
