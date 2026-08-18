import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Lock,
  FileText,
  Film,
  Highlighter,
  PanelRightClose,
  PanelRightOpen,
  AlertTriangle,
  Layers,
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
import ContributionXray from '../components/ContributionXray';
import MemberWorkload from '../components/MemberWorkload';
import MemberActivityChart from '../components/MemberActivityChart';
import CopiedTextViewer from '../components/CopiedTextViewer';
import { annotatePasted, stripPastedMarks } from '../utils/pasted';
import { wrapFlatContent } from '../utils/sectionDoc';

export default function Review() {
  const { id } = useParams();
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const [data, setData] = useState(null);
  const [sections, setSections] = useState(null);
  const [loading, setLoading] = useState(true);
  const showSkeleton = useMinLoading(loading, 280);

  // Layout & View State
  const [activeMode, setActiveMode] = useState('document'); // 'document' | 'replay'
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [highlightPasted, setHighlightPasted] = useState(false); // DEFAULT OFF (Level 0 clean document)
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

  // Extract external pasted strings for document annotation on demand
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

  // Total word count (derived from doc content to match student view exactly)
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
        <div className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
          <div className="skeleton h-5 w-48 rounded" />
          <div className="skeleton h-8 w-64 rounded-xl" />
          <div className="skeleton h-6 w-24 rounded-full" />
        </div>
        <div className="flex-1 flex overflow-hidden p-6 gap-6 justify-center">
          <div className="flex-1 max-w-4xl bg-white rounded-2xl border border-gray-200 p-8 shadow-xs">
            <div className="skeleton h-full w-full rounded-xl" />
          </div>
          <div className="w-88 bg-white rounded-2xl border border-gray-200 p-5 space-y-4 hidden lg:block">
            <div className="skeleton h-6 w-3/4 rounded" />
            <div className="skeleton h-24 w-full rounded-xl" />
            <div className="skeleton h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#ECEAE5] p-4 text-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 shadow-xl space-y-4">
          <FileText className="w-10 h-10 text-gray-400 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900">Submission Record Not Found</h2>
          <p className="text-xs text-gray-500">
            The requested assignment submission could not be loaded or you do not have permission to view it.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-lg shadow-xs transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const isGroup = !!sections;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#ECEAE5] text-[#1A1A1B] overflow-hidden font-sans antialiased">
      
      {/* Top Workspace Bar */}
      <header className="h-14 bg-white border-b border-gray-200 px-3 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {/* Left: Brand + Back Button + Title */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-[#0047FF] transition-colors pr-2 border-r border-gray-200 py-1 shrink-0"
            title="Return to Dashboard"
          >
            <BrandMark className="w-5 h-5 text-[#0047FF]" />
            <ArrowLeft className="w-3.5 h-3.5 ml-1" />
            <span className="hidden md:inline">Dashboard</span>
          </Link>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-bold text-[#1A1A1B] truncate max-w-[160px] sm:max-w-xs md:max-w-sm">
              Submission Review
            </span>
            <span className="hidden sm:inline-flex text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 items-center gap-1 shrink-0">
              <Lock className="w-2.5 h-2.5 text-emerald-600" /> Sealed
            </span>
          </div>
        </div>

        {/* Center: Mode Switcher (Document View vs Process Record) */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveMode('document')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
              activeMode === 'document'
                ? 'bg-white text-[#0047FF] shadow-xs'
                : 'text-gray-600 hover:text-[#1A1A1B]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Document View</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode('replay');
              setHighlightPasted(true); // When actively viewing replay, enable highlights
            }}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
              activeMode === 'replay'
                ? 'bg-white text-[#0047FF] shadow-xs'
                : 'text-gray-600 hover:text-[#1A1A1B]'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Process Record</span>
          </button>
        </div>

        {/* Right: On-Demand Highlights Toggle + Sidebar Visibility + Avatar */}
        <div className="flex items-center gap-2">
          {/* Highlights Toggle (Evidence on Demand) */}
          <button
            type="button"
            onClick={() => setHighlightPasted(!highlightPasted)}
            aria-pressed={highlightPasted}
            title="Toggle color highlights on paper"
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs ${
              highlightPasted
                ? 'bg-amber-50 text-amber-950 border-amber-300 ring-1 ring-amber-300/40'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Highlighter className={`w-3.5 h-3.5 ${highlightPasted ? 'text-amber-700' : 'text-gray-500'}`} />
            <span className="font-bold">
              {highlightPasted ? 'Highlights: ON' : 'Highlights: OFF'}
            </span>
          </button>

          {/* Sidebar Toggle Button */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              sidebarOpen
                ? 'bg-[#0047FF]/5 text-[#0047FF] border-[#0047FF]/20'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
            title={sidebarOpen ? 'Collapse Details Panel' : 'Expand Details Panel'}
          >
            {sidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>

          {user && (
            <div className="pl-1 border-l border-gray-200 ml-1">
              <UserAvatar user={user} size={28} className="ring-1 ring-black/5" />
            </div>
          )}
        </div>
      </header>

      {/* Leader Override Alert Banner (if applicable) */}
      {data.override?.used && (
        <div className="bg-amber-50 border-b border-amber-300 px-6 py-2.5 shadow-xs flex items-center justify-between gap-4 text-xs text-amber-900 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Submitted via leader override by {data.override.by_name}.</strong> Reason: <em>"{data.override.reason}"</em>
            </span>
          </div>
          <span className="font-mono text-[11px] text-amber-800 shrink-0">
            Non-done: {(data.override.non_done || []).map((n) => n.student_name).join(', ')}
          </span>
        </div>
      )}

      {/* Main Workspace: Centered Paper Document + Single Evidence Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* CENTER MAIN CANVAS: Realistic Paper Taking Full Available Space */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-[#ECEAE5]">
          {isGroup ? (
            <GroupFinalDoc content={data.content} sections={sections} />
          ) : (
            <Playback
              key={`review-view-${id}-${activeMode}`}
              events={data.events}
              finalContent={data.content}
              initialMode={activeMode === 'replay' ? 'playback' : 'final'}
              externalHighlight={highlightPasted}
              seekStepIndex={seekStepIndex}
            />
          )}
        </main>

        {/* RIGHT COLLAPSIBLE SIDEBAR: Submission Record (Doc View) / Process Timeline (Replay View) */}
        <aside
          className={`${
            sidebarOpen ? 'w-80 sm:w-92' : 'w-0 hidden'
          } border-l border-gray-200 bg-[#F9F8F6] flex flex-col shrink-0 overflow-y-auto transition-all duration-200 z-10 p-4 space-y-4`}
        >
          {activeMode === 'document' ? (
            <>
              {/* Level 1: Factual Submission Record */}
              <SubmissionRecord
                data={data}
                wordCount={wordCount}
                highlightPasted={highlightPasted}
                onToggleHighlights={() => setHighlightPasted(!highlightPasted)}
                onViewProcessRecord={() => {
                  setActiveMode('replay');
                  setHighlightPasted(true);
                }}
                isGroup={isGroup}
              />

              {/* Group Member Contribution Overview (if group assignment) */}
              {isGroup && sections && (
                <div className="space-y-4">
                  <ContributionXray sections={sections} />
                  {data.insights && <MemberWorkload insights={data.insights} members={sections} />}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Level 2: Chronological Process Timeline */}
              <ProcessTimeline
                events={data.events}
                onSeekToEvent={(stepIdx) => {
                  setSeekStepIndex(stepIdx);
                }}
              />

              {/* Factual Pasted Snippets Viewer */}
              <PasteAnalysis events={data.events} />

              {/* Group Activity Charts if group submission */}
              {isGroup && data.insights && (
                <>
                  <MemberActivityChart insights={data.insights} members={sections} />
                  <CopiedTextViewer insights={data.insights} members={sections} />
                </>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
